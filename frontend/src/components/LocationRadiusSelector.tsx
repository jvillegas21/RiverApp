import React, { useState, useEffect } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { MapPin, Navigation, Settings } from 'lucide-react';
import LocationSkeleton from './LocationSkeleton';
import { GEOCODING_CONFIG, isMapBoxConfigured } from '../config/geocoding';

interface LocationRadiusSelectorProps {
  radius: number;
  onRadiusChange: (radius: number) => void;
}

function useCity(lat: number, lng: number) {
  const [city, setCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    let ignore = false;
    async function fetchCity() {
      if (lat === 0 && lng === 0) return;
      
      // Use MapBox for reverse geocoding
      if (!isMapBoxConfigured()) {
        console.log('MapBox not configured, skipping city lookup');
        if (!ignore) {
          setCity(null);
          setLoading(false);
        }
        return;
      }
      
      setLoading(true);
      try {
        const res = await fetch(GEOCODING_CONFIG.MAPBOX_REVERSE_URL(lat, lng, GEOCODING_CONFIG.MAPBOX_TOKEN));
        const data = await res.json();
        if (!ignore) {
          if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            const context = feature.context || [];
            
            // Extract city and county from MapBox response
            let cityName = null;
            let countyName = null;
            
            // MapBox context structure: [country, region, place]
            for (const item of context) {
              if (item.id.startsWith('place.')) {
                cityName = item.text;
              } else if (item.id.startsWith('region.')) {
                countyName = item.text;
              }
            }
            
            // If no city in context, use the main feature text
            if (!cityName && feature.place_type.includes('place')) {
              cityName = feature.text;
            }
            
            const label = cityName && countyName ? `${cityName} (${countyName})` : cityName || countyName;
            setCity(label);
          } else {
            setCity(null);
          }
          setLoading(false);
        }
      } catch (e) {
        console.log('MapBox reverse geocoding error:', e);
        if (!ignore) {
          setCity(null);
          setLoading(false);
        }
      }
    }
    fetchCity();
    return () => { ignore = true; };
  }, [lat, lng]);
  
  return { city, loading };
}

const LocationRadiusSelector: React.FC<LocationRadiusSelectorProps> = ({ radius, onRadiusChange }) => {
  const { location, setLocation, getCurrentLocation, loading, error } = useLocation();
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const radiusOptions = [5, 10, 25, 50];

  const handleManualLocation = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      setLocation({ lat, lng });
      // Clear the input fields after setting location
      setManualLat('');
      setManualLng('');
    }
  };

  const { city, loading: cityLoading } = location ? useCity(location.lat, location.lng) : { city: null, loading: false };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <MapPin className="w-5 h-5 mr-2" />
        Location & Search Radius
      </h2>
      
      <div className="space-y-4">
        {/* Current Location */}
        <div>
          <button
            onClick={getCurrentLocation}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Navigation className="w-5 h-5" />
            <span>{loading ? 'Getting Location...' : 'Use Current Location'}</span>
          </button>
        </div>

        {/* Current Location Display */}
        {location && (
          <div className="text-sm text-gray-600 mt-2 flex items-center space-x-2">
            <MapPin className="w-4 h-4" />
            <strong>Current Location:</strong> 
            {cityLoading ? (
              <LocationSkeleton compact={true} />
            ) : (
              <span>{city ? <span>{city}, </span> : null}<span className="text-xs text-gray-400">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span></span>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 p-3 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Radius Selection */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">Search Radius:</p>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
            >
              <Settings className="w-4 h-4" />
              <span>Advanced</span>
            </button>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            {radiusOptions.map((option) => (
              <button
                key={option}
                onClick={() => onRadiusChange(option)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  radius === option
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option} mi
              </button>
            ))}
          </div>
          
          <div className="mt-3 bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              Searching within <strong>{radius} miles</strong> of your location
            </p>
          </div>
        </div>

        {/* Advanced Manual Location Input */}
        {showAdvanced && (
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-3">Or enter coordinates manually:</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  placeholder="e.g., 40.7128"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  placeholder="e.g., -74.0060"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={handleManualLocation}
              className="mt-3 w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Set Manual Location
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationRadiusSelector; 