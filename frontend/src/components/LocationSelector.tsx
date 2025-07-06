import React, { useState } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { MapPin, Navigation } from 'lucide-react';

const LocationSelector: React.FC = () => {
  const { location, setLocation, getCurrentLocation, loading, error } = useLocation();
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

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
        Location
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

        {/* Manual Location Input */}
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
            className="w-full mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Set Location
          </button>
        </div>

        {/* Current Location Display */}
        {location && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">Current Location:</p>
            <p className="font-mono text-sm">
              {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationSelector; 