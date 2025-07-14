import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import axios from 'axios';
import { buildApiUrl } from '../config/api';
import { useLocation } from './LocationContext';
import { useRadius } from './RadiusContext';

interface WeatherData {
  current: any;
  forecast: any;
  location: {
    lat: number;
    lng: number;
  };
}

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
      const response = await axios.get(buildApiUrl(`/weather/current/${lat}/${lng}`));
      setWeather(response.data);
      setLastFetched(Date.now());
    } catch (err) {
      if (err instanceof Error && err.message.includes('429')) {
        setError('Too many requests. Please wait a moment before trying again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
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
    };
  }, []);

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