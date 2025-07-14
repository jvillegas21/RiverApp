import apiClient from '../utils/api';
import { 
  WeatherData,
  PrecipitationForecast,
  WeatherResponse, 
  PrecipitationResponse,
  RequestConfig 
} from '../types/api';

/**
 * Weather data service with standardized responses and error handling
 */
export class WeatherService {
  /**
   * Get current weather for location
   */
  static async getCurrentWeather(
    lat: number, 
    lng: number, 
    config: RequestConfig = {}
  ): Promise<WeatherResponse> {
    const requestKey = `weather-${lat}-${lng}`;
    return apiClient.get<WeatherData>(
      `/weather/current/${lat}/${lng}`,
      config,
      requestKey
    );
  }

  /**
   * Get precipitation forecast for location
   */
  static async getPrecipitationForecast(
    lat: number, 
    lng: number, 
    config: RequestConfig = {}
  ): Promise<PrecipitationResponse> {
    const requestKey = `precipitation-${lat}-${lng}`;
    return apiClient.get<PrecipitationForecast[]>(
      `/weather/precipitation/${lat}/${lng}`,
      config,
      requestKey
    );
  }

  /**
   * Cancel active weather requests for location
   */
  static cancelWeatherRequests(lat?: number, lng?: number): void {
    if (lat !== undefined && lng !== undefined) {
      apiClient.cancelRequest(`weather-${lat}-${lng}`);
      apiClient.cancelRequest(`precipitation-${lat}-${lng}`);
    }
  }
}

export default WeatherService;