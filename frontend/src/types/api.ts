// Standardized API response types

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  message: string | null;
  error: ApiError | null;
  timestamp: string;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

export interface ApiMeta {
  totalFound?: number;
  radius?: number;
  center?: {
    lat: number;
    lng: number;
  };
  dataSource?: string;
  siteId?: string;
  period?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Error codes enum
export enum ApiErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  EXTERNAL_API_TIMEOUT = 'EXTERNAL_API_TIMEOUT',
  DATABASE_ERROR = 'DATABASE_ERROR',
  GENERAL_ERROR = 'GENERAL_ERROR',
  NO_DATA_AVAILABLE = 'NO_DATA_AVAILABLE'
}

// Location and coordinate types
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Location extends Coordinates {
  address?: string;
}

// River data types
export interface RiverLocation {
  lat: number;
  lng: number;
}

export interface River {
  id: string;
  name: string;
  location: RiverLocation;
  flow: string;
  stage: string;
  unit: string;
  lastUpdated: string;
  dataSource?: string;
}

export interface FloodStages {
  action: number;
  minor: number;
  moderate: number;
  major: number;
  source: string;
}

export interface FloodStatus {
  currentStage: number;
  floodStages: FloodStages;
  status: 'Normal' | 'Action Stage' | 'Minor Flood' | 'Moderate Flood' | 'Major Flood';
  risk: 'Low' | 'Medium' | 'High';
}

export interface FlowDataPoint {
  time: string;
  value: string;
  qualifiers?: string[];
}

export interface FlowTimeSeries {
  siteId: string;
  siteName: string;
  parameter: string;
  unit: string;
  values: FlowDataPoint[];
}

export interface FloodPrediction {
  riverId: string;
  riverName: string;
  currentFlow: number;
  currentStage: number;
  flowTrend: 'Increasing' | 'Decreasing' | 'Stable';
  floodStage: string;
  precipitationRisk: 'Low' | 'Medium' | 'High';
  floodProbability: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  timeToFlood: string;
  recommendations: string[];
  riskFactors?: {
    stageFactor: number;
    trendFactor: number;
    precipitationFactor: number;
  };
}

// Weather data types
export interface WeatherMain {
  temp: number;
  feels_like?: number;
  humidity: number;
  pressure: number;
}

export interface WeatherCondition {
  main: string;
  description: string;
  icon: string;
}

export interface Wind {
  speed: number;
  deg: number;
}

export interface Rain {
  '1h': number;
}

export interface CurrentWeather {
  main: WeatherMain;
  weather: WeatherCondition[];
  wind: Wind;
  rain?: Rain;
}

export interface WeatherData {
  current: CurrentWeather;
  forecast?: any; // NOAA forecast structure
  location: Location;
}

export interface PrecipitationForecast {
  time: string;
  forecast: string;
  precipitation: number;
}

// Report types
export interface UserReport {
  id: string;
  title: string;
  description: string;
  category: 'flood' | 'hazard' | 'weather' | 'infrastructure';
  location: string; // Location as string, not coordinates
  status: 'active' | 'resolved' | 'investigating';
  created_at: string;
  updated_at?: string;
  user_id?: string;
  estimated_reopening?: string;
}

// API Response types for specific endpoints
export type RiversResponse = ApiResponse<River[]>;
export type FlowDataResponse = ApiResponse<FlowTimeSeries[]>;
export type FloodStageResponse = ApiResponse<FloodStatus>;
export type WeatherResponse = ApiResponse<WeatherData>;
export type PrecipitationResponse = ApiResponse<PrecipitationForecast[]>;
export type ReportsResponse = ApiResponse<UserReport[]>;

export interface FloodPredictionRequest {
  lat: number;
  lng: number;
  radius: number;
  rivers: River[];
}

export interface FloodPredictionResult {
  rivers: FloodPrediction[];
  overallRisk: 'Low' | 'Medium' | 'High';
  weather: CurrentWeather;
  recommendations: string[];
}

export type FloodPredictionResponse = ApiResponse<FloodPredictionResult>;

// Request types
export interface CreateReportRequest {
  title: string;
  description: string;
  category: UserReport['category'];
  location: string;
  estimated_reopening?: string;
}

// Utility types for error handling
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
}

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
}