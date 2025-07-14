// Standardized API response utility functions

/**
 * Create a standardized success response
 * @param {*} data - The response data
 * @param {string} message - Optional success message
 * @param {Object} meta - Optional metadata (pagination, counts, etc.)
 * @returns {Object} Standardized response object
 */
const createSuccessResponse = (data, message = null, meta = null) => {
  const response = {
    success: true,
    data,
    message,
    error: null,
    timestamp: new Date().toISOString()
  };
  
  if (meta) {
    response.meta = meta;
  }
  
  return response;
};

/**
 * Create a standardized error response
 * @param {string} message - Error message
 * @param {string} code - Error code for client handling
 * @param {*} details - Optional error details
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Standardized error response object
 */
const createErrorResponse = (message, code = 'GENERAL_ERROR', details = null, statusCode = 500) => {
  return {
    success: false,
    data: null,
    message,
    error: {
      code,
      message,
      details,
      statusCode
    },
    timestamp: new Date().toISOString()
  };
};

/**
 * Send standardized success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Optional success message
 * @param {Object} meta - Optional metadata
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const sendSuccess = (res, data, message = null, meta = null, statusCode = 200) => {
  res.status(statusCode).json(createSuccessResponse(data, message, meta));
};

/**
 * Send standardized error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {string} code - Error code
 * @param {*} details - Optional error details
 * @param {number} statusCode - HTTP status code (default: 500)
 */
const sendError = (res, message, code = 'GENERAL_ERROR', details = null, statusCode = 500) => {
  res.status(statusCode).json(createErrorResponse(message, code, details, statusCode));
};

/**
 * Common error codes for consistent client-side handling
 */
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  EXTERNAL_API_TIMEOUT: 'EXTERNAL_API_TIMEOUT',
  DATABASE_ERROR: 'DATABASE_ERROR',
  GENERAL_ERROR: 'GENERAL_ERROR',
  NO_DATA_AVAILABLE: 'NO_DATA_AVAILABLE'
};

module.exports = {
  createSuccessResponse,
  createErrorResponse,
  sendSuccess,
  sendError,
  ERROR_CODES
};