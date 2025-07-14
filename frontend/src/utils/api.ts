import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { buildApiUrl } from '../config/api';
import { 
  ApiResponse, 
  ApiError, 
  ApiErrorCode, 
  RequestConfig, 
  RetryOptions 
} from '../types/api';

// Default retry configuration
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  exponentialBase: 2
};

// Active request tracking for cancellation
const activeRequests = new Map<string, AbortController>();

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate retry delay with exponential backoff and jitter
 */
const calculateRetryDelay = (
  attempt: number, 
  options: RetryOptions = DEFAULT_RETRY_OPTIONS
): number => {
  const exponentialDelay = options.baseDelay * Math.pow(options.exponentialBase, attempt - 1);
  const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
  return Math.min(exponentialDelay + jitter, options.maxDelay);
};

/**
 * Check if error is retryable
 */
const isRetryableError = (error: any): boolean => {
  if (!error.response) {
    // Network errors, timeouts, etc.
    return error.code !== 'ERR_CANCELED';
  }
  
  const status = error.response.status;
  // Retry on server errors and rate limiting
  return status >= 500 || status === 429;
};

/**
 * Enhanced API request with retry logic and cancellation
 */
class ApiClient {
  private baseURL: string;
  private defaultTimeout: number;

  constructor(baseURL: string = '', defaultTimeout: number = 10000) {
    this.baseURL = baseURL;
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Cancel active request by key
   */
  cancelRequest(requestKey: string): boolean {
    const controller = activeRequests.get(requestKey);
    if (controller) {
      controller.abort();
      activeRequests.delete(requestKey);
      return true;
    }
    return false;
  }

  /**
   * Cancel all active requests
   */
  cancelAllRequests(): void {
    activeRequests.forEach((controller, key) => {
      controller.abort();
    });
    activeRequests.clear();
  }

  /**
   * Make HTTP request with retry logic and cancellation support
   */
  private async makeRequest<T>(
    config: AxiosRequestConfig,
    requestConfig: RequestConfig = {},
    requestKey?: string
  ): Promise<ApiResponse<T>> {
    const {
      timeout = this.defaultTimeout,
      retries = DEFAULT_RETRY_OPTIONS.maxRetries,
      retryDelay = DEFAULT_RETRY_OPTIONS.baseDelay,
      signal
    } = requestConfig;

    // Create abort controller for this request
    const controller = new AbortController();
    
    // Use provided signal or create new one
    const requestSignal = signal || controller.signal;
    
    // Track active request
    if (requestKey) {
      // Cancel any existing request with the same key
      this.cancelRequest(requestKey);
      activeRequests.set(requestKey, controller);
    }

    const retryOptions: RetryOptions = {
      ...DEFAULT_RETRY_OPTIONS,
      maxRetries: retries,
      baseDelay: retryDelay
    };

    let lastError: any;

    for (let attempt = 1; attempt <= retryOptions.maxRetries + 1; attempt++) {
      try {
        const response: AxiosResponse<ApiResponse<T>> = await axios({
          ...config,
          timeout,
          signal: requestSignal,
          headers: {
            'Content-Type': 'application/json',
            ...config.headers
          }
        });

        // Clean up tracking
        if (requestKey) {
          activeRequests.delete(requestKey);
        }

        // Handle non-200 responses that didn't throw
        if (response.status >= 400) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Ensure response has the expected structure
        if (response.data && typeof response.data === 'object') {
          return response.data;
        } else {
          // If response doesn't match expected format, create a standardized response
          return {
            success: true,
            data: response.data,
            message: null,
            error: null,
            timestamp: new Date().toISOString()
          };
        }
      } catch (error: any) {
        lastError = error;

        // Don't retry if cancelled
        if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
          if (requestKey) {
            activeRequests.delete(requestKey);
          }
          throw this.createApiError(ApiErrorCode.GENERAL_ERROR, 'Request was cancelled', error);
        }

        // Don't retry on last attempt or non-retryable errors
        if (attempt > retryOptions.maxRetries || !isRetryableError(error)) {
          break;
        }

        // Wait before retry
        const delay = calculateRetryDelay(attempt, retryOptions);
        console.warn(`API request failed (attempt ${attempt}/${retryOptions.maxRetries + 1}), retrying in ${delay}ms:`, error.message);
        await sleep(delay);
      }
    }

    // Clean up tracking
    if (requestKey) {
      activeRequests.delete(requestKey);
    }

    // Transform error to standardized format and wrap in ApiResponse format
    const transformedError = this.transformError(lastError);
    return {
      success: false,
      data: null,
      message: transformedError.message,
      error: transformedError,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Transform axios error to standardized API error
   */
  private transformError(error: any): ApiError {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      // If server returns standardized error format, use it
      if (data && typeof data === 'object' && data.error) {
        return data.error;
      }

      // Map HTTP status to error codes
      let code: ApiErrorCode;
      switch (status) {
        case 400:
          code = ApiErrorCode.VALIDATION_ERROR;
          break;
        case 401:
          code = ApiErrorCode.UNAUTHORIZED;
          break;
        case 403:
          code = ApiErrorCode.FORBIDDEN;
          break;
        case 404:
          code = ApiErrorCode.NOT_FOUND;
          break;
        case 408:
          code = ApiErrorCode.EXTERNAL_API_TIMEOUT;
          break;
        case 429:
          code = ApiErrorCode.RATE_LIMIT_EXCEEDED;
          break;
        case 502:
        case 503:
        case 504:
          code = ApiErrorCode.EXTERNAL_API_ERROR;
          break;
        default:
          code = ApiErrorCode.GENERAL_ERROR;
      }

      return this.createApiError(code, data?.message || error.message, { status, data });
    } else if (error.code === 'ECONNABORTED') {
      return this.createApiError(ApiErrorCode.EXTERNAL_API_TIMEOUT, 'Request timed out', error);
    } else {
      return this.createApiError(ApiErrorCode.GENERAL_ERROR, error.message || 'Unknown error occurred', error);
    }
  }

  /**
   * Create standardized API error
   */
  private createApiError(code: ApiErrorCode, message: string, details?: any): ApiError {
    return {
      code,
      message,
      details,
      statusCode: 0 // Will be set by response status
    };
  }

  /**
   * GET request
   */
  async get<T>(
    endpoint: string, 
    config: RequestConfig = {}, 
    requestKey?: string
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      {
        method: 'GET',
        url: buildApiUrl(endpoint)
      },
      config,
      requestKey
    );
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string, 
    data?: any, 
    config: RequestConfig = {}, 
    requestKey?: string
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      {
        method: 'POST',
        url: buildApiUrl(endpoint),
        data
      },
      config,
      requestKey
    );
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string, 
    data?: any, 
    config: RequestConfig = {}, 
    requestKey?: string
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      {
        method: 'PUT',
        url: buildApiUrl(endpoint),
        data
      },
      config,
      requestKey
    );
  }

  /**
   * DELETE request
   */
  async delete<T>(
    endpoint: string, 
    config: RequestConfig = {}, 
    requestKey?: string
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      {
        method: 'DELETE',
        url: buildApiUrl(endpoint)
      },
      config,
      requestKey
    );
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export for use in contexts and components
export default apiClient;