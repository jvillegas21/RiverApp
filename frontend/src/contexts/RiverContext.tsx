import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useLocation } from './LocationContext';
import { useRadius } from './RadiusContext';
import RiverService from '../services/riverService';
import { River, FloodPrediction, ApiError, ApiErrorCode } from '../types/api';

// Legacy interfaces for backward compatibility
interface HistoricalDataPoint {
  timestamp: string;
  level: number;
  flow: number;
}

interface RiverContextType {
  rivers: River[];
  floodPredictions: FloodPrediction[];
  loading: boolean;
  error: string | null;
  message: string | null; // Add message field for user-friendly notifications
  loadingProgress: number;
  fetchRivers: (lat: number, lng: number, radius: number) => Promise<void>;
  fetchFloodPrediction: (lat: number, lng: number, radius: number) => Promise<void>;
  lastFetched: number | null;
  totalFound: number | null; // Add total found count
}

const RiverContext = createContext<RiverContextType | undefined>(undefined);

export const useRiver = () => {
  const context = useContext(RiverContext);
  if (!context) {
    throw new Error('useRiver must be used within a RiverProvider');
  }
  return context;
};

interface RiverProviderProps {
  children: ReactNode;
}

export const RiverProvider: React.FC<RiverProviderProps> = ({ children }) => {
  const [rivers, setRivers] = useState<River[]>([]);
  const [floodPredictions, setFloodPredictions] = useState<FloodPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null); // Add message state
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [totalFound, setTotalFound] = useState<number | null>(null); // Add total found state
  const lastRequestRef = useRef<{ lat: number; lng: number; radius: number; timestamp: number } | null>(null);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
  const { location } = useLocation();
  const { radius } = useRadius();

  const fetchRivers = async (lat: number, lng: number, radiusValue: number) => {
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      const response = await RiverService.getNearbyRivers(lat, lng, radiusValue, {
        timeout: 15000 // 15 second timeout for river data
      });
      
      if (response.success && response.data) {
        setRivers(response.data);
        setMessage(response.message);
        setTotalFound(response.meta?.totalFound || response.data.length);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch river data');
      }
      
      setLastFetched(Date.now());
    } catch (err: any) {
      const apiError = err as ApiError;
      
      // Handle specific error codes
      switch (apiError.code) {
        case ApiErrorCode.EXTERNAL_API_TIMEOUT:
          setError(`Unable to fetch data for ${radiusValue} mile radius. Try a smaller radius (10-25 miles) for better results.`);
          break;
        case ApiErrorCode.NO_DATA_AVAILABLE:
          setError('No river data available in this area. Try adjusting your location or radius.');
          break;
        case ApiErrorCode.RATE_LIMIT_EXCEEDED:
          setError('Too many requests. Please wait a moment before trying again.');
          break;
        case ApiErrorCode.VALIDATION_ERROR:
          setError('Invalid location or radius values.');
          break;
        default:
          setError(apiError.message || 'Failed to fetch river data');
      }
      
      setRivers([]);
      setMessage(null);
      setTotalFound(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchFloodPrediction = async (lat: number, lng: number, radiusValue: number, forceRefresh = false) => {
    // Throttle requests - only allow one request every 2 seconds
    const now = Date.now();
    const lastRequest = lastRequestRef.current;
    
    if (!forceRefresh && lastRequest && 
        lastRequest.lat === lat && 
        lastRequest.lng === lng && 
        lastRequest.radius === radiusValue &&
        now - lastRequest.timestamp < 2000) {
      return; // Skip this request if it's too soon
    }

    // Cancel any existing requests for this location
    RiverService.cancelRiverRequests(lat, lng, radiusValue);

    // Clear any existing timeout
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }

    // Set a timeout to prevent rapid successive calls
    throttleTimeoutRef.current = setTimeout(() => {
      throttleTimeoutRef.current = null;
    }, 2000);

    setLoading(true);
    setError(null);
    setMessage(null);
    setLoadingProgress(0);
    
    // Update last request
    lastRequestRef.current = { lat, lng, radius: radiusValue, timestamp: now };
    
    try {
      setLoadingProgress(25);
      
      // First get rivers
      const riversResponse = await RiverService.getNearbyRivers(lat, lng, radiusValue, {
        timeout: 15000
      });
      
      if (!riversResponse.success || !riversResponse.data) {
        throw new Error(riversResponse.error?.message || 'Failed to fetch river data');
      }

      const riversData = riversResponse.data;
      setMessage(riversResponse.message);
      setTotalFound(riversResponse.meta?.totalFound || riversData.length);
      
      setLoadingProgress(50);
      
      // Then get flood predictions if we have rivers
      if (riversData.length > 0) {
        setLoadingProgress(75);
        
        const predictionResponse = await RiverService.getFloodPredictions({
          lat,
          lng,
          radius: radiusValue,
          rivers: riversData
        }, {
          timeout: 20000 // Longer timeout for prediction calculations
        });
        
        if (predictionResponse.success && predictionResponse.data) {
          setFloodPredictions(predictionResponse.data.rivers || []);
        } else {
          console.warn('Flood prediction failed:', predictionResponse.error);
          setFloodPredictions([]); // Still show rivers even if predictions fail
        }
      } else {
        setFloodPredictions([]);
      }
      
      setRivers(riversData);
      setLoadingProgress(100);
      setLastFetched(Date.now());
    } catch (err: any) {
      const apiError = err as ApiError;
      
      // Handle specific error codes
      switch (apiError.code) {
        case ApiErrorCode.EXTERNAL_API_TIMEOUT:
          setError(`Unable to fetch data for ${radiusValue} mile radius. Try a smaller radius (10-25 miles) for better results.`);
          break;
        case ApiErrorCode.NO_DATA_AVAILABLE:
          setError('No river data available in this area. Try adjusting your location or radius.');
          break;
        case ApiErrorCode.RATE_LIMIT_EXCEEDED:
          setError('Too many requests. Please wait a moment before trying again.');
          break;
        case ApiErrorCode.VALIDATION_ERROR:
          setError('Invalid location or radius values.');
          break;
        default:
          setError(apiError.message || 'Failed to fetch flood prediction');
      }
      
      setRivers([]);
      setFloodPredictions([]);
      setMessage(null);
      setTotalFound(null);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
    }
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (location && radius && lastFetched) {
      // Clear existing timer
      if (autoRefreshRef.current) {
        clearTimeout(autoRefreshRef.current);
      }
      
      // Set up auto-refresh
      autoRefreshRef.current = setTimeout(() => {
        fetchFloodPrediction(location.lat, location.lng, radius, true);
      }, 300000); // 5 minutes
    }
    
    return () => {
      if (autoRefreshRef.current) {
        clearTimeout(autoRefreshRef.current);
      }
    };
  }, [lastFetched, location, radius]);

  // Fetch data when location or radius changes
  useEffect(() => {
    if (location && radius) {
      fetchFloodPrediction(location.lat, location.lng, radius, true);
    }
  }, [location?.lat, location?.lng, radius]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshRef.current) {
        clearTimeout(autoRefreshRef.current);
      }
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
      // Cancel all active river requests on unmount
      if (location && radius) {
        RiverService.cancelRiverRequests(location.lat, location.lng, radius);
      }
    };
  }, [location, radius]);

  return (
    <RiverContext.Provider value={{
      rivers,
      floodPredictions,
      loading,
      error,
      message,
      loadingProgress,
      fetchRivers,
      fetchFloodPrediction,
      lastFetched,
      totalFound
    }}>
      {children}
    </RiverContext.Provider>
  );
}; 