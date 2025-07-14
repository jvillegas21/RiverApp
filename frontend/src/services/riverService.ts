import apiClient from '../utils/api';
import { 
  River,
  FlowTimeSeries,
  FloodStatus,
  RiversResponse, 
  FlowDataResponse, 
  FloodStageResponse,
  FloodPredictionResponse,
  FloodPredictionRequest,
  FloodPredictionResult,
  RequestConfig 
} from '../types/api';

/**
 * River data service with standardized responses and error handling
 */
export class RiverService {
  /**
   * Get rivers within radius of location
   */
  static async getNearbyRivers(
    lat: number, 
    lng: number, 
    radius: number, 
    config: RequestConfig = {}
  ): Promise<RiversResponse> {
    const requestKey = `rivers-${lat}-${lng}-${radius}`;
    return apiClient.get<River[]>(
      `/rivers/nearby/${lat}/${lng}/${radius}`,
      config,
      requestKey
    );
  }

  /**
   * Get detailed flow data for a specific river
   */
  static async getFlowData(
    siteId: string, 
    config: RequestConfig = {}
  ): Promise<FlowDataResponse> {
    const requestKey = `flow-${siteId}`;
    return apiClient.get<FlowTimeSeries[]>(
      `/rivers/flow/${siteId}`,
      config,
      requestKey
    );
  }

  /**
   * Get flood stage information for a specific river
   */
  static async getFloodStage(
    siteId: string, 
    config: RequestConfig = {}
  ): Promise<FloodStageResponse> {
    const requestKey = `flood-stage-${siteId}`;
    return apiClient.get<FloodStatus>(
      `/rivers/flood-stage/${siteId}`,
      config,
      requestKey
    );
  }

  /**
   * Get flood predictions for multiple rivers
   */
  static async getFloodPredictions(
    request: FloodPredictionRequest,
    config: RequestConfig = {}
  ): Promise<FloodPredictionResponse> {
    const requestKey = `flood-prediction-${request.lat}-${request.lng}-${request.radius}`;
    return apiClient.post<FloodPredictionResult>(
      '/flood/predict',
      request,
      config,
      requestKey
    );
  }

  /**
   * Cancel active river requests
   */
  static cancelRiverRequests(lat?: number, lng?: number, radius?: number): void {
    if (lat !== undefined && lng !== undefined && radius !== undefined) {
      // Cancel specific location requests
      apiClient.cancelRequest(`rivers-${lat}-${lng}-${radius}`);
      apiClient.cancelRequest(`flood-prediction-${lat}-${lng}-${radius}`);
    } else {
      // Cancel all river-related requests
      const riverRequestPattern = /^(rivers|flow|flood)/;
      // Note: This is a simplified approach. In a real implementation,
      // you might want to track request keys more systematically
    }
  }

  /**
   * Cancel specific river data request
   */
  static cancelFlowData(siteId: string): void {
    apiClient.cancelRequest(`flow-${siteId}`);
  }

  /**
   * Cancel specific flood stage request
   */
  static cancelFloodStage(siteId: string): void {
    apiClient.cancelRequest(`flood-stage-${siteId}`);
  }
}

export default RiverService;