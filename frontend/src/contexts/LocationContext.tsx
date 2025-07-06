import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface LocationContextType {
  location: Location | null;
  setLocation: (location: Location) => void;
  getCurrentLocation: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentLocation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });

      const newLocation: Location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      setLocation(newLocation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get location');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Try to get location on app start
    getCurrentLocation();
  }, []);

  return (
    <LocationContext.Provider value={{
      location,
      setLocation,
      getCurrentLocation,
      loading,
      error
    }}>
      {children}
    </LocationContext.Provider>
  );
}; 