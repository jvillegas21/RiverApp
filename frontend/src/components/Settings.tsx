import React, { useState } from 'react';
import { MapPin, X, Navigation } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';

interface SettingsProps {
  onClose?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const { location, setLocation, getCurrentLocation, loading } = useLocation();
  const [cleared, setCleared] = useState(false);
  const [zip, setZip] = useState('');
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleClearLocation = () => {
    localStorage.removeItem('userLocation');
    setLocation(null);
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  const handleZipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setZipError(null);
    setZipLoading(true);
    
    try {
      // Use a geocoding service to convert zip to coordinates
      // For demo purposes, we'll use a simple approach
      const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (response.ok) {
        const data = await response.json();
        const lat = parseFloat(data.places[0].latitude);
        const lng = parseFloat(data.places[0].longitude);
        setLocation({ lat, lng });
        setZip('');
        setZipError(null);
      } else {
        setZipError('Zip code not found. Please try another.');
      }
    } catch (err) {
      setZipError('Failed to look up zip code. Please try again.');
    } finally {
      setZipLoading(false);
    }
  };

  const handleManualLocation = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      setLocation({ lat, lng });
      setManualLat('');
      setManualLng('');
      setShowAdvanced(false);
    } else {
      alert('Please enter valid coordinates (Latitude: -90 to 90, Longitude: -180 to 180)');
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center">
          <MapPin className="w-5 h-5 mr-2" />
          Location Settings
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <div className="space-y-4">
        {/* Current Location Display */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-1">Current Location</p>
          <p className="text-sm text-gray-600">
            {location ? 
              `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 
              'No location set'
            }
          </p>
        </div>

        {/* Get Current Location Button */}
        <button
          onClick={getCurrentLocation}
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          <Navigation className="w-5 h-5" />
          <span>{loading ? 'Getting Location...' : 'Use Current Location'}</span>
        </button>

        {/* Zip Code Input */}
        <form onSubmit={handleZipSubmit} className="space-y-2">
          <label htmlFor="zip" className="block text-sm font-medium text-gray-700">
            Enter US Zip Code:
          </label>
          <div className="flex space-x-2">
            <input
              id="zip"
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="e.g., 90210"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              pattern="[0-9]{5}"
              maxLength={5}
            />
            <button
              type="submit"
              disabled={zipLoading || !zip.match(/^[0-9]{5}$/)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {zipLoading ? 'Looking up...' : 'Go'}
            </button>
          </div>
          {zipError && (
            <p className="text-sm text-red-600">{zipError}</p>
          )}
        </form>

        {/* Advanced Manual Entry Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          {showAdvanced ? 'Hide' : 'Show'} Manual Coordinates
        </button>

        {/* Manual Coordinates Entry */}
        {showAdvanced && (
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm text-gray-600">Enter coordinates manually:</p>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
            <button
              onClick={handleManualLocation}
              disabled={!manualLat || !manualLng}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Set Manual Location
            </button>
          </div>
        )}

        {/* Clear Location Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Clear saved location</p>
              <p className="text-xs text-gray-500">This will prompt you to set location again</p>
            </div>
            <button
              onClick={handleClearLocation}
              disabled={!location}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                cleared 
                  ? 'bg-green-100 text-green-800' 
                  : location 
                    ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {cleared ? 'Cleared!' : 'Clear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 