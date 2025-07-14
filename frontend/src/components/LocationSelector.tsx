import React, { useState, useEffect } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { MapPin, Navigation } from 'lucide-react';
import LocationSkeleton from './LocationSkeleton';
import { GEOCODING_CONFIG, isMapBoxConfigured } from '../config/geocoding';

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

interface LocationSelectorProps {
  compact?: boolean;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({ compact = false }) => {
  const { location, setLocation, getCurrentLocation, loading, error } = useLocation();
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const { city, loading: cityLoading } = useCity(location?.lat || 0, location?.lng || 0);
  const [zip, setZip] = useState('');
  const [zipLoading, setZipLoading] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);

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

  const handleZipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setZipError(null);
    setZipLoading(true);
    
    // Use MapBox for zip code lookup
    if (!isMapBoxConfigured()) {
      setZipError('Location services not available. Please enter coordinates manually.');
      setZipLoading(false);
      return;
    }
    
    try {
      const res = await fetch(GEOCODING_CONFIG.MAPBOX_FORWARD_URL(zip, GEOCODING_CONFIG.MAPBOX_TOKEN));
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setLocation({ lat, lng });
        setZip('');
      } else {
        setZipError('Zip code not found. Please try another.');
      }
    } catch (err) {
      console.log('MapBox zip code lookup error:', err);
      setZipError('Failed to look up zip code.');
    } finally {
      setZipLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${compact ? 'compact' : ''}`}>
      {!compact && (
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <MapPin className="w-5 h-5 mr-2" />
          Location
        </h2>
      )}
      
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

        {/* Zip Code Input (always visible, above manual entry) */}
        <form onSubmit={handleZipSubmit} className="pt-4">
          <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">Enter a US Zip Code:</label>
          <div className="flex space-x-2">
            <input
              id="zip"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{5}"
              maxLength={5}
              value={zip}
              onChange={e => setZip(e.target.value)}
              placeholder="e.g., 90210"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Zip code"
              required
            />
            <button
              type="submit"
              disabled={zipLoading || !/^\d{5}$/.test(zip)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              aria-label="Set location by zip code"
            >
              {zipLoading ? '...' : 'Go'}
            </button>
          </div>
          {zipError && <div className="text-red-600 text-sm mt-1">{zipError}</div>}
        </form>

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
          <div className="flex items-center space-x-2 text-sm text-gray-600 mt-2">
            <MapPin className="w-4 h-4" />
            {cityLoading ? (
              <LocationSkeleton compact={true} />
            ) : (
              <span>{city && location ? <span>{city}, </span> : null}<span className="text-xs text-gray-400">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span></span>
            )}
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