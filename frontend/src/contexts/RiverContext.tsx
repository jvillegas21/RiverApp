import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import axios from 'axios';

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
  loadingProgress: number;
  fetchRivers: (lat: number, lng: number, radius: number) => Promise<void>;
  fetchFloodPrediction: (lat: number, lng: number, radius: number) => Promise<void>;
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
  const [loadingProgress, setLoadingProgress] = useState(0);
  const lastRequestRef = useRef<{ lat: number; lng: number; radius: number; timestamp: number } | null>(null);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRivers = async (lat: number, lng: number, radius: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`http://localhost:5001/api/rivers/nearby/${lat}/${lng}/${radius}`);
      setRivers(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch river data');
    } finally {
      setLoading(false);
    }
  };

  const fetchFloodPrediction = async (lat: number, lng: number, radius: number) => {
    // Throttle requests - only allow one request every 2 seconds
    const now = Date.now();
    const lastRequest = lastRequestRef.current;
    
    if (lastRequest && 
        lastRequest.lat === lat && 
        lastRequest.lng === lng && 
        lastRequest.radius === radius &&
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
    setLoadingProgress(0);
    
    // Update last request
    lastRequestRef.current = { lat, lng, radius, timestamp: now };
    
    try {
      setLoadingProgress(25);
      // First get rivers
      const riversResponse = await axios.get(`http://localhost:5001/api/rivers/nearby/${lat}/${lng}/${radius}`);
      const riversData = riversResponse.data;
      setLoadingProgress(50);
      
      setLoadingProgress(75);
      // Then get flood predictions
      const predictionResponse = await axios.post('http://localhost:5001/api/flood/predict', {
        lat,
        lng,
        radius,
        rivers: riversData
      });
      
      setRivers(riversData);
      setFloodPredictions(predictionResponse.data.rivers);
      setLoadingProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch flood prediction');
    } finally {
      setLoading(false);
      setLoadingProgress(0);
    }
  };

  return (
    <RiverContext.Provider value={{
      rivers,
      floodPredictions,
      loading,
      error,
      loadingProgress,
      fetchRivers,
      fetchFloodPrediction
    }}>
      {children}
    </RiverContext.Provider>
  );
}; 