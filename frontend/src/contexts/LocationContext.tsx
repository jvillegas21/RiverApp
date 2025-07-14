import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface LocationContextType {
  location: Location | null;
  setLocation: (location: Location | null) => void;
  getCurrentLocation: () => Promise<void>;
  loading: boolean;
  error: string | null;
  locationRequired: boolean;
  setLocationRequired: (required: boolean) => void;
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
  const [location, setLocationState] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationRequired, setLocationRequiredState] = useState(false);

  // Load location from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('userLocation');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
          setLocationState(parsed);
        } else {
          setLocationRequired(true);
        }
      } catch {
        setLocationRequired(true);
      }
    } else {
      setLocationRequired(true);
    }
  }, []);

  // Save location to localStorage whenever it changes
  useEffect(() => {
    if (location) {
      localStorage.setItem('userLocation', JSON.stringify(location));
    }
  }, [location]);

  const setLocation = (loc: Location | null) => {
    setLocationState(loc);
    if (loc) {
      localStorage.setItem('userLocation', JSON.stringify(loc));
    } else {
      localStorage.removeItem('userLocation');
    }
  };

  const getCurrentLocation = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!navigator.geolocation) {
        setLocationRequired(true);
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
      setLocationRequired(false); // Clear the requirement when location is obtained
    } catch (err) {
      setLocationRequired(true); // Set requirement when geolocation fails
      setError(err instanceof Error ? err.message : 'Failed to get location');
    } finally {
      setLoading(false);
    }
  };

  const setLocationRequired = (required: boolean) => {
    setLocationRequiredState(required);
  };

  return (
    <LocationContext.Provider value={{
      location,
      setLocation,
      getCurrentLocation,
      loading,
      error,
      locationRequired,
      setLocationRequired
    }}>
      {children}
    </LocationContext.Provider>
  );
}; 