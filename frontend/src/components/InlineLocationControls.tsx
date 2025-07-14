import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { useRadius } from '../contexts/RadiusContext';
import { MapPin, Navigation, Settings, ChevronDown } from 'lucide-react';
import LocationSkeleton from './LocationSkeleton';
import { GEOCODING_CONFIG, isMapBoxConfigured } from '../config/geocoding';

interface InlineLocationControlsProps {
  // Remove radius and onRadiusChange props since we'll use context
}

function useCity(lat: number, lng: number) {
  const [cityLabel, setCityLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<boolean>(false);
  
  useEffect(() => {
    let ignore = false;
    let timeoutId: NodeJS.Timeout;
    
    async function fetchCity() {
      if (lat === 0 && lng === 0) return;
      
      setLoading(true);
      setError(false);
      
      try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
        
        // Try multiple geocoding services with fallback
        let res;
        
        // First try MapBox (requires API key, but very reliable)
        if (isMapBoxConfigured()) {
          try {
            res = await fetch(GEOCODING_CONFIG.MAPBOX_REVERSE_URL(lat, lng, GEOCODING_CONFIG.MAPBOX_TOKEN), {
              signal: controller.signal,
              headers: {
                'Accept': 'application/json'
              }
            });
          
          if (res.ok) {
            const mapboxData = await res.json();
            if (mapboxData.features && mapboxData.features.length > 0) {
              const feature = mapboxData.features[0];
              const context = feature.context || [];
              
              // Extract city and county from MapBox response
              let city = null;
              let county = null;
              
              // MapBox context structure: [country, region, place]
              for (const item of context) {
                if (item.id.startsWith('place.')) {
                  city = item.text;
                } else if (item.id.startsWith('region.')) {
                  county = item.text;
                }
              }
              
              // If no city in context, use the main feature text
              if (!city && feature.place_type.includes('place')) {
                city = feature.text;
              }
              
              let label = null;
              if (city && county) {
                label = `${city} (${county})`;
              } else if (city) {
                label = city;
              } else if (county) {
                label = county;
              }
              
              if (!ignore && label) {
                setCityLabel(label);
                setLoading(false);
                setError(false);
              }
              return;
            }
          }
        } catch (e) {
          // Continue to fallback
        }
        }
        
        // Use MapBox for reverse geocoding
        if (!isMapBoxConfigured()) {
          console.log('MapBox not configured, skipping city lookup');
          if (!ignore) {
            setCityLabel(null);
            setLoading(false);
            setError(false);
          }
          return;
        }
        
        try {
          res = await fetch(GEOCODING_CONFIG.MAPBOX_REVERSE_URL(lat, lng, GEOCODING_CONFIG.MAPBOX_TOKEN), {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json'
            }
          });
        } catch (mapboxError) {
          console.log('MapBox reverse geocoding error:', mapboxError);
          if (!ignore) {
            setCityLabel(null);
            setLoading(false);
            setError(true);
          }
          return;
        }
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          if (res.status === 429) {
            throw new Error('Rate limited');
          } else if (res.status >= 500) {
            throw new Error('Service unavailable');
          } else {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
        }
        
        const data = await res.json();
        const address = data.address || {};
        const city = address.city || address.town || address.village || null;
        const county = address.county || null;
        const state = address.state || null;
        const country = address.country || null;
        let label = null;
        if (city && county) {
          label = `${city} (${county})`;
        } else if (city) {
          label = city;
        } else if (county) {
          label = county;
        } else if (state) {
          label = state;
        } else if (country) {
          label = country;
        }
        if (!ignore) {
          setCityLabel(label);
          setLoading(false);
          setError(false);
        }
      } catch (e) {
        clearTimeout(timeoutId);
        if (!ignore) {
          // Only log non-network errors to avoid console spam
          if (e instanceof Error && !e.message.includes('Failed to fetch')) {
            console.error('City lookup error:', e);
          }
          setCityLabel(null);
          setLoading(false);
          setError(true);
        }
      }
    }
    
    fetchCity();
    return () => { 
      ignore = true; 
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [lat, lng]);
  
  return { cityLabel, loading, error };
}

const InlineLocationControls: React.FC<InlineLocationControlsProps> = () => {
  const { location, setLocation, getCurrentLocation, loading, error } = useLocation();
  const { radius, setRadius, radiusOptions } = useRadius();
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRadiusDropdown, setShowRadiusDropdown] = useState(false);
  const radiusDropdownRef = useRef<HTMLDivElement>(null);
  const lat = location && typeof location.lat === 'number' ? location.lat : 0;
  const lng = location && typeof location.lng === 'number' ? location.lng : 0;
  const { cityLabel, loading: cityLoading, error: cityError } = useCity(lat, lng);
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
      setShowAdvanced(false);
    }
  };

  const handleZipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setZipError(null);
    setZipLoading(true);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      // Try multiple geocoding services with fallback
      let res;
      let data;
      
      // First try MapBox (requires API key, but very reliable)
      if (isMapBoxConfigured()) {
        try {
          console.log('Trying MapBox with token:', GEOCODING_CONFIG.MAPBOX_TOKEN.substring(0, 10) + '...');
          res = await fetch(GEOCODING_CONFIG.MAPBOX_FORWARD_URL(zip, GEOCODING_CONFIG.MAPBOX_TOKEN), {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json'
            }
          });
        
        if (res.ok) {
          data = await res.json();
          if (data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].center;
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lng);
            
            // Validate coordinates
            if (isNaN(latitude) || isNaN(longitude) || 
                latitude < -90 || latitude > 90 || 
                longitude < -180 || longitude > 180) {
              setZipError('Invalid coordinates returned for this zip code.');
              return;
            }
            
            setLocation({ lat: latitude, lng: longitude });
            setZip('');
            setShowAdvanced(false);
            return;
          }
        } else {
          console.log('MapBox response not ok:', res.status, res.statusText);
          if (res.status === 401) {
            console.log('MapBox token appears to be invalid or restricted');
          }
        }
      } catch (e) {
        console.log('MapBox error:', e);
        // Continue to fallback
      }
      }
      
      // Use MapBox for zip code lookup
      if (!isMapBoxConfigured()) {
        throw new Error('MapBox not configured. Please configure your MapBox token.');
      }
      
      console.log('Using MapBox for zip code lookup...');
      try {
        res = await fetch(GEOCODING_CONFIG.MAPBOX_FORWARD_URL(zip, GEOCODING_CONFIG.MAPBOX_TOKEN), {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json'
          }
        });
      } catch (mapboxError) {
        console.log('MapBox forward geocoding error:', mapboxError);
        throw new Error('MapBox service unavailable. Please use manual coordinates below.');
      }
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Rate limited. Please wait a moment and try again.');
        } else if (res.status >= 500) {
          throw new Error('Service temporarily unavailable. Please try again later.');
        } else {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
      }
      
      data = await res.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const { lat, lon } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        
        // Validate coordinates
        if (isNaN(latitude) || isNaN(longitude) || 
            latitude < -90 || latitude > 90 || 
            longitude < -180 || longitude > 180) {
          setZipError('Invalid coordinates returned for this zip code.');
          return;
        }
        
        setLocation({ lat: latitude, lng: longitude });
        setZip('');
        setShowAdvanced(false);
      } else {
        setZipError('Zip code not found. Please try another.');
      }
    } catch (err) {
      console.error('Zip code lookup error:', err);
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setZipError('Request timed out. Please try again.');
        } else if (err.message.includes('Failed to fetch')) {
          setZipError('Geocoding service unavailable. Please use manual coordinates below.');
        } else if (err.message.includes('Rate limited')) {
          setZipError('Too many requests. Please wait a moment and try again.');
        } else if (err.message.includes('Service temporarily unavailable')) {
          setZipError('Service temporarily unavailable. Please try again later.');
        } else {
          setZipError('Failed to look up zip code. Please try again.');
        }
      } else {
        setZipError('Failed to look up zip code. Please try again.');
      }
    } finally {
      setZipLoading(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (radiusDropdownRef.current && !radiusDropdownRef.current.contains(event.target as Node)) {
        setShowRadiusDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close advanced modal when clicking outside
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAdvanced(false);
      }
    };

    if (showAdvanced) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showAdvanced]);

  return (
    <div className="flex items-center space-x-4">
      {/* Current Location Button */}
      <button
        onClick={getCurrentLocation}
        disabled={loading}
        className="flex items-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
        title="Use current location"
      >
        <Navigation className="w-4 h-4" />
        <span className="hidden sm:inline">{loading ? 'Getting...' : 'Location'}</span>
      </button>

      {/* Location Display */}
      {location && (
        <div className="hidden md:flex items-center text-sm text-gray-600">
          <MapPin className="w-4 h-4 mr-1" />
          <div className="flex flex-col leading-tight">
            {cityLoading ? (
              <LocationSkeleton compact={true} />
            ) : cityError ? (
              <span className="text-xs text-gray-400">
                {location.lat.toFixed(3)}, {location.lng.toFixed(3)}
              </span>
            ) : (
              <>
                <span className="font-medium text-gray-800">
                  {cityLabel}
                </span>
                <span className="text-xs text-gray-400">
                  {location.lat.toFixed(3)}, {location.lng.toFixed(3)}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Radius Dropdown */}
      <div className="relative" ref={radiusDropdownRef}>
        <button
          onClick={() => setShowRadiusDropdown(!showRadiusDropdown)}
          className="flex items-center space-x-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
        >
          <span>{radius} mi</span>
          <ChevronDown className="w-4 h-4" />
        </button>
        
        {showRadiusDropdown && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
            {radiusOptions.map((option) => (
              <button
                key={option}
                onClick={() => {
                  setRadius(option);
                  setShowRadiusDropdown(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                  radius === option ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                }`}
              >
                {option} miles
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Advanced Settings Button */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
        title="Advanced settings"
      >
        <Settings className="w-4 h-4" />
      </button>

      {/* Advanced Panel (Overlay) */}
      {showAdvanced && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAdvanced(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Advanced Settings</h3>
              <button
                onClick={() => setShowAdvanced(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            {/* Zip Code Input */}
            <form onSubmit={handleZipSubmit} className="mb-4">
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
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[60px]"
                  aria-label="Set location by zip code"
                >
                  {zipLoading ? (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Go'
                  )}
                </button>
              </div>
              {zipError && <div className="text-red-600 text-sm mt-1">{zipError}</div>}
            </form>
            
            {/* Manual Location Input */}
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Enter coordinates manually:
                  {zipError && zipError.includes('Geocoding service unavailable') && (
                    <span className="block text-blue-600 mt-1">
                      💡 Tip: You can find coordinates by searching your location on Google Maps and right-clicking on the map.
                    </span>
                  )}
                </p>
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

              {/* Error Display and Retry */}
              {error && (
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-center space-x-4 mt-2">
                  <span className="text-red-600 text-sm flex-1">{error}</span>
                  <button
                    onClick={getCurrentLocation}
                    className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors text-sm"
                    disabled={loading}
                    aria-label="Retry getting location"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => setShowAdvanced(true)}
                    className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                    aria-label="Enter location manually"
                  >
                    Enter Manually
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InlineLocationControls; 