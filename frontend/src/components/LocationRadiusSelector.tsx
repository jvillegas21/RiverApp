import React, { useState } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { MapPin, Navigation, Settings } from 'lucide-react';

interface LocationRadiusSelectorProps {
  radius: number;
  onRadiusChange: (radius: number) => void;
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
    }
  };

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
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-sm text-green-800">
              <strong>Current Location:</strong> {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </p>
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