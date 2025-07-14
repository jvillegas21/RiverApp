import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useLocation } from './LocationContext';
import { useRadius } from './RadiusContext';
import WeatherService from '../services/weatherService';
import { WeatherData, ApiError, ApiErrorCode } from '../types/api';

// Using WeatherData from types/api.ts

interface WeatherContextType {
  weather: WeatherData | null;
  loading: boolean;
  error: string | null;
  fetchWeather: (lat: number, lng: number) => Promise<void>;
  lastFetched: number | null;
}

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

export const useWeather = () => {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeather must be used within a WeatherProvider');
  }
  return context;
};

interface WeatherProviderProps {
  children: ReactNode;
}

export const WeatherProvider: React.FC<WeatherProviderProps> = ({ children }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRequestRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const { location } = useLocation();
  const { radius } = useRadius();

  const fetchWeather = async (lat: number, lng: number, forceRefresh = false) => {
    // Throttle requests - only allow one request every 3 seconds for weather
    const now = Date.now();
    const lastRequest = lastRequestRef.current;
    
    if (!forceRefresh && lastRequest && 
        lastRequest.lat === lat && 
        lastRequest.lng === lng &&
        now - lastRequest.timestamp < 3000) {
      return; // Skip this request if it's too soon
    }

    // Cancel any existing weather requests for this location
    WeatherService.cancelWeatherRequests(lat, lng);

    // Clear any existing timeout
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }

    // Set a timeout to prevent rapid successive calls
    throttleTimeoutRef.current = setTimeout(() => {
      throttleTimeoutRef.current = null;
    }, 3000);

    setLoading(true);
    setError(null);
    
    // Update last request
    lastRequestRef.current = { lat, lng, timestamp: now };
    
    try {
      const response = await WeatherService.getCurrentWeather(lat, lng, {
        timeout: 10000 // 10 second timeout for weather
      });
      
      if (response.success && response.data) {
        setWeather(response.data);
        setLastFetched(Date.now());
      } else {
        throw new Error(response.error?.message || 'Failed to fetch weather data');
      }
    } catch (err: any) {
      const apiError = err as ApiError;
      
      // Handle specific error codes
      switch (apiError.code) {
        case ApiErrorCode.RATE_LIMIT_EXCEEDED:
          setError('Too many requests. Please wait a moment before trying again.');
          break;
        case ApiErrorCode.EXTERNAL_API_TIMEOUT:
          setError('Weather service request timed out. Please try again.');
          break;
        case ApiErrorCode.EXTERNAL_API_ERROR:
          setError('Weather service is temporarily unavailable.');
          break;
        case ApiErrorCode.VALIDATION_ERROR:
          setError('Invalid location coordinates.');
          break;
        default:
          setError(apiError.message || 'Failed to fetch weather data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (location && lastFetched) {
      // Clear existing timer
      if (autoRefreshRef.current) {
        clearTimeout(autoRefreshRef.current);
      }
      
      // Set up auto-refresh
      autoRefreshRef.current = setTimeout(() => {
        fetchWeather(location.lat, location.lng, true);
      }, 300000); // 5 minutes
    }
    
    return () => {
      if (autoRefreshRef.current) {
        clearTimeout(autoRefreshRef.current);
      }
    };
  }, [lastFetched, location]);

  // Fetch data when location changes
  useEffect(() => {
    if (location) {
      fetchWeather(location.lat, location.lng, true);
    }
  }, [location?.lat, location?.lng]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshRef.current) {
        clearTimeout(autoRefreshRef.current);
      }
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
      // Cancel all active weather requests on unmount
      if (location) {
        WeatherService.cancelWeatherRequests(location.lat, location.lng);
      }
    };
  }, [location]);

  return (
    <WeatherContext.Provider value={{
      weather,
      loading,
      error,
      fetchWeather,
      lastFetched
    }}>
      {children}
    </WeatherContext.Provider>
  );
}; 