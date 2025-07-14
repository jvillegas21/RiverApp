import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface RadiusContextType {
  radius: number;
  setRadius: (radius: number) => void;
  radiusOptions: number[];
}

const RadiusContext = createContext<RadiusContextType | undefined>(undefined);

export const useRadius = () => {
  const context = useContext(RadiusContext);
  if (!context) {
    throw new Error('useRadius must be used within a RadiusProvider');
  }
  return context;
};

interface RadiusProviderProps {
  children: ReactNode;
}

export const RadiusProvider: React.FC<RadiusProviderProps> = ({ children }) => {
  const [radius, setRadiusState] = useState(10);
  const defaultRadiusOptions = [1, 5, 10, 15, 20, 25]; // Remove 50

  // Load radius from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('searchRadius');
    if (saved) {
      try {
        const parsed = parseInt(saved);
        if (!isNaN(parsed) && defaultRadiusOptions.includes(parsed)) {
          setRadiusState(parsed);
        }
      } catch {}
    }
  }, []);

  // Save radius to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('searchRadius', radius.toString());
  }, [radius]);

  const setRadius = (newRadius: number) => {
    if (defaultRadiusOptions.includes(newRadius)) {
      setRadiusState(newRadius);
    }
  };

  return (
    <RadiusContext.Provider value={{
      radius,
      setRadius,
      radiusOptions: defaultRadiusOptions
    }}>
      {children}
    </RadiusContext.Provider>
  );
}; 