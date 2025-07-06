import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
    setLoading(true);
    setError(null);
    
    try {
      // First get rivers, then get flood predictions
      const riversResponse = await axios.get(`http://localhost:5001/api/rivers/nearby/${lat}/${lng}/${radius}`);
      const riversData = riversResponse.data;
      
      const predictionResponse = await axios.post('http://localhost:5001/api/flood/predict', {
        lat,
        lng,
        radius,
        rivers: riversData
      });
      
      setRivers(riversData);
      setFloodPredictions(predictionResponse.data.rivers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch flood prediction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RiverContext.Provider value={{
      rivers,
      floodPredictions,
      loading,
      error,
      fetchRivers,
      fetchFloodPrediction
    }}>
      {children}
    </RiverContext.Provider>
  );
}; 