import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import axios from 'axios';
import { buildApiUrl } from '../config/api';
import { useLocation } from './LocationContext';
import { useRadius } from './RadiusContext';

interface HistoricalDataPoint {
  timestamp: string;
  level: number;
  flow: number;
}

interface FloodStages {
  action: number;
  minor: number;
  moderate: number;
  major: number;
}

interface River {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  flow: string;
  stage: string;
  unit: string;
  lastUpdated: string;
  historicalData?: HistoricalDataPoint[];
  floodStages?: FloodStages;
}

interface FloodPrediction {
  riverId: string;
  riverName: string;
  currentFlow: number;
  currentStage: number;
  flowTrend: string;
  floodStage: string;
  precipitationRisk: string;
  floodProbability: number;
  riskLevel: string;
  timeToFlood: string;
  recommendations: string[];
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
      const response = await axios.get(buildApiUrl(`/rivers/nearby/${lat}/${lng}/${radiusValue}`));
      
      // Handle new response format
      if (response.data.rivers) {
        setRivers(response.data.rivers);
        setMessage(response.data.message || null);
        setTotalFound(response.data.totalFound || null);
      } else {
        // Handle old format for backward compatibility
        setRivers(response.data);
        setMessage(null);
        setTotalFound(null);
      }
      
      setLastFetched(Date.now());
    } catch (err: any) {
      // Handle different error scenarios
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.error === 'USGS_API_TIMEOUT') {
        setError(`Unable to fetch data for ${radiusValue} mile radius. Try a smaller radius (10-25 miles) for better results.`);
      } else if (err.response?.data?.error === 'NO_DATA') {
        setError('No river data available in this area. Try adjusting your location or radius.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch river data');
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
      const riversResponse = await axios.get(buildApiUrl(`/rivers/nearby/${lat}/${lng}/${radiusValue}`));
      
      // Handle new response format
      let riversData;
      if (riversResponse.data.rivers) {
        riversData = riversResponse.data.rivers;
        setMessage(riversResponse.data.message || null);
        setTotalFound(riversResponse.data.totalFound || null);
      } else {
        // Handle old format for backward compatibility
        riversData = riversResponse.data;
        setMessage(null);
        setTotalFound(null);
      }
      
      setLoadingProgress(50);
      
      setLoadingProgress(75);
      // Then get flood predictions
      const predictionResponse = await axios.post(buildApiUrl('/flood/predict'), {
        lat,
        lng,
        radius: radiusValue,
        rivers: riversData
      });
      
      setRivers(riversData);
      setFloodPredictions(predictionResponse.data.rivers || []);
      setLoadingProgress(100);
      setLastFetched(Date.now());
    } catch (err: any) {
      // Handle different error scenarios
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.error === 'USGS_API_TIMEOUT') {
        setError(`Unable to fetch data for ${radiusValue} mile radius. Try a smaller radius (10-25 miles) for better results.`);
      } else if (err.response?.data?.error === 'NO_DATA') {
        setError('No river data available in this area. Try adjusting your location or radius.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch flood prediction');
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
    };
  }, []);

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