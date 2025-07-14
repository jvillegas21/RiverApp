import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { useLocation } from '../contexts/LocationContext';
import { useRiver } from '../contexts/RiverContext';
import { useWeather } from '../contexts/WeatherContext';
import { useReports } from '../contexts/ReportContext';
import { useRadius } from '../contexts/RadiusContext';
import { Droplets, AlertTriangle, MapPin } from 'lucide-react';
import LocationSkeleton from './LocationSkeleton';
import LocationRequirementModal from './LocationRequirementModal';
import RiverCard from './RiverCard';
import { GEOCODING_CONFIG, isMapBoxConfigured } from '../config/geocoding';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom marker icons for different risk levels
const createCustomIcon = (riskLevel: string) => {
  const colors: Record<string, string> = {
    High: '#ef4444', // red-500
    Medium: '#f59e0b', // yellow-500
    Low: '#10b981', // green-500
    Critical: '#dc2626', // red-700
    default: '#6b7280' // gray-500
  };
  const borders: Record<string, number> = {
    High: 3,
    Medium: 3,
    Low: 3,
    Critical: 4,
    default: 2
  };
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="12" fill="${colors[riskLevel] || colors.default}" stroke="white" stroke-width="${borders[riskLevel] || borders.default}"/>
        <circle cx="16" cy="16" r="6" fill="white"/>
      </svg>
    `)}`,
    iconSize: [32, 40],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

// Component to handle map updates when location changes
const MapUpdater: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, 10);
  }, [center, map]);
  
  return null;
};

// Custom hook for city name lookup
const useCity = (lat: number, lng: number) => {
  const [city, setCity] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getCityName = async () => {
      if (!lat || !lng || !isMapBoxConfigured()) return;
      
      setLoading(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place&access_token=${GEOCODING_CONFIG.MAPBOX_TOKEN}`
        );
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          setCity(data.features[0].place_name.split(',')[0]);
        }
      } catch (error) {
        console.error('Error fetching city name:', error);
      } finally {
        setLoading(false);
      }
    };

    getCityName();
  }, [lat, lng]);

  return { city, loading };
};

// Helper function to format estimated reopening dates
const formatEstimatedReopening = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return original string if parsing fails
    }
    return date.toLocaleString();
  } catch (error) {
    return dateString; // Return original string if any error occurs
  }
};

// River marker component
const RiverMarker: React.FC<{
  river: any;
  prediction?: any;
}> = ({ river, prediction }) => {
  // Use parsed location from USGS data instead of reverse geocoding
  const displayLocation = river.parsedLocation?.displayLocation || null;
  
  // Only render marker if location is valid
  if (!river.location || 
      typeof river.location !== 'object' ||
      !('lat' in river.location) || 
      !('lng' in river.location) ||
      typeof river.location.lat !== 'number' || 
      typeof river.location.lng !== 'number' ||
      isNaN(river.location.lat) || 
      isNaN(river.location.lng)) {
    return null;
  }
  
  // Create custom icon with water level label
  const createRiverIcon = (riskLevel: string, waterLevel: string) => {
    const color = riskLevel === 'High' ? '#ef4444' : riskLevel === 'Medium' ? '#f59e0b' : '#10b981';
    const levelText = waterLevel && waterLevel !== 'N/A' ? `${waterLevel}` : '';
    
    return new Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="12" fill="${color}" stroke="white" stroke-width="2"/>
          <circle cx="16" cy="16" r="6" fill="white"/>
          ${levelText ? `
          <rect x="0" y="28" width="32" height="12" fill="white" stroke="${color}" stroke-width="1" rx="2"/>
          <text x="16" y="36" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="${color}" font-weight="bold">${levelText}</text>
          ` : ''}
        </svg>
      `)}`,
      iconSize: [32, 40],
      iconAnchor: [16, 16]
    });
  };
  
  return (
    <Marker
      position={[river.location.lat, river.location.lng]}
      icon={createRiverIcon(prediction?.riskLevel || 'Low', river.stage)}
    >
      <Popup maxWidth={450} maxHeight={500}>
        <div className="max-h-[400px] overflow-y-auto">
          <RiverCard 
            river={river} 
            prediction={prediction} 
            index={0}
          />
        </div>
      </Popup>
    </Marker>
  );
};

// Component to render user report markers
// UserReportMarkers component removed - reports now use location strings instead of coordinates

// User Location Marker Component
const UserLocationMarker: React.FC<{ location: any }> = ({ location }) => {
  const { city, loading: cityLoading } = useCity(location?.lat || 0, location?.lng || 0);
  
  return (
    <Marker position={[location.lat, location.lng]} icon={new Icon({
      iconUrl: `data:image/svg+xml;base64,${btoa(`
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="#3b82f6" stroke="white" stroke-width="2"/>
          <circle cx="12" cy="12" r="4" fill="white"/>
        </svg>
      `)}`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    })}>
      <Popup>
        <div className="p-2">
          <h3 className="font-semibold">Your Location</h3>
          <p className="text-sm text-gray-600 m-0">
            {cityLoading ? (
              <LocationSkeleton compact={true} />
            ) : (
              <>
                {city ? <span>{city}, </span> : null}
                <span className="text-xs text-gray-400">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
              </>
            )}
          </p>
        </div>
      </Popup>
    </Marker>
  );
};

// Individual River Card Component for Map View
const MapRiverCard: React.FC<{ river: any, prediction: any, index: number, cardClassName?: string }> = ({ river, prediction, index, cardClassName }) => {
  const { city, loading: cityLoading } = useCity(river.location?.lat || 0, river.location?.lng || 0);
  
  return (
    <div key={`${river.id}-${index}`} className={cardClassName}>
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-sm">{river.name}</h4>
        {prediction && (
          <div className={`w-3 h-3 rounded-full border-2 ${
            prediction.riskLevel === 'High' ? 'bg-red-500 border-red-500' :
            prediction.riskLevel === 'Medium' ? 'bg-yellow-500 border-yellow-500' :
            prediction.riskLevel === 'Critical' ? 'bg-red-700 border-red-700' :
            'bg-green-500 border-green-500'
          }`}></div>
        )}
      </div>
      <p className="text-xs text-gray-600 mb-2">
        {cityLoading ? (
          <LocationSkeleton compact={true} />
        ) : (
          <>
            {city ? <span>{city}, </span> : null}
            {river.location && typeof river.location.lat === 'number' && typeof river.location.lng === 'number'
              ? `${river.location.lat.toFixed(4)}, ${river.location.lng.toFixed(4)}`
              : 'Location unavailable'
            }
          </>
        )}
      </p>
      <div className="text-xs text-gray-600">
        <p>Current Level: {river.stage || 'N/A'} ft</p>
        <p>Flow: {river.flow || 'N/A'} {river.unit}</p>
        {prediction && (
          <p className="mt-1 font-medium">
            Risk: {prediction.riskLevel} ({prediction.floodProbability}%)
          </p>
        )}
      </div>
    </div>
  );
};

const RiverMarkers: React.FC<{ rivers: any[], floodPredictions: any[] }> = ({ rivers, floodPredictions }) => {
  return (
    <>
      {rivers.map((river) => {
        const prediction = floodPredictions.find(p => p.riverId === river.id);
        return <RiverMarker key={river.id} river={river} prediction={prediction} />;
      })}
    </>
  );
};

// Skeleton loader for river card
const RiverCardSkeleton: React.FC = () => (
  <div className="bg-white border rounded-lg p-4 animate-pulse">
    <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-1/3 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
  </div>
);

const MapView: React.FC = () => {
  const { location, getCurrentLocation, loading, error, locationRequired, setLocationRequired } = useLocation();
  const { rivers, floodPredictions, loading: riversLoading, fetchFloodPrediction, lastFetched: riverLastFetched } = useRiver();
  const { weather } = useWeather();
  const { reports, fetchReports } = useReports();
  const { radius, setRadius, radiusOptions } = useRadius();

  // Trigger location request if no location is available
  useEffect(() => {
    if (!location && !loading && !locationRequired) {
      setLocationRequired(true);
    }
  }, [location, loading, locationRequired, setLocationRequired]);

  useEffect(() => {
    if (location) {
      const now = Date.now();
      const shouldFetchRivers = !rivers.length || !riverLastFetched || now - riverLastFetched > 180000;
      if (shouldFetchRivers) fetchFloodPrediction(location.lat, location.lng, radius);
      // Reports are always fetched (or you can add a similar staleness check if desired)
      fetchReports();
    }
  }, [location, radius, fetchFloodPrediction, fetchReports, rivers.length, riverLastFetched]);

  // Auto-refresh when data becomes stale (only if we have fresh data to start with)
  useEffect(() => {
    if (!location) return;
    
    // Only start auto-refresh if we have fresh data (less than 3 minutes old)
    const now = Date.now();
    const hasFreshRivers = rivers.length > 0 && riverLastFetched && now - riverLastFetched < 180000;
    
    // If we don't have fresh data, don't start auto-refresh (let the staleness check handle it)
    if (!hasFreshRivers) return;
    
    const interval = setInterval(() => {
      const currentTime = Date.now();
      const shouldFetchRivers = !rivers.length || !riverLastFetched || currentTime - riverLastFetched > 180000;
      
      if (shouldFetchRivers) {
        Promise.all([
          shouldFetchRivers ? fetchFloodPrediction(location.lat, location.lng, radius) : Promise.resolve()
        ]).catch(error => {
          console.error('Error in auto-refresh:', error);
        });
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [location, radius, rivers, riverLastFetched, fetchFloodPrediction]);

  const mapCenter: [number, number] = useMemo(() => {
    // Ensure location is valid and has numeric lat/lng
    if (location && 
        typeof location === 'object' && 
        'lat' in location && 
        'lng' in location &&
        typeof location.lat === 'number' && 
        typeof location.lng === 'number' &&
        !isNaN(location.lat) && 
        !isNaN(location.lng)) {
      return [location.lat, location.lng];
    }
    return [40.7128, -74.0060]; // Default to NYC
  }, [location]);

  // Show loading state while getting location
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Getting Your Location</h2>
          <p className="text-gray-600">Please allow location access to view the map.</p>
        </div>
      </div>
    );
  }

  // Show error state if location failed
  if (error && !location) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Location Access Required</h2>
          <p className="text-gray-600 mb-4">We couldn't access your location. Please enable location access or enter your location manually.</p>
          <button
            onClick={getCurrentLocation}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show location requirement modal if needed
  if (locationRequired) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Location Required for Map View</h2>
          <p className="text-gray-600 mb-4">Please set your location to view flood data and river conditions on the map.</p>
          <button
            onClick={() => setLocationRequired(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Set Location
          </button>
        </div>
        <LocationRequirementModal />
      </div>
    );
  }

  // Show the map when location is available
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Interactive Map</h1>
        <p className="text-gray-600">View flood risks and river conditions on an interactive map</p>
      </div>

      {/* Map Controls */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          {/* Controls Section */}
          <div className="flex-1">
            {/* Search Radius */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Search Radius:
              </label>
              <div className="flex flex-wrap gap-2">
                {radiusOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setRadius(option)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                      radius === option
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option} mi
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Weather Info */}
          {weather && (
            <div className="text-sm text-gray-600 mt-4 lg:mt-0 lg:ml-6">
              <span className="font-medium">Current Weather:</span> {weather.current?.weather?.[0]?.main || 'N/A'}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Map */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <MapContainer
          center={mapCenter}
          zoom={10}
          className="w-full h-[600px]"
          style={{ height: '600px' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* User location marker */}
          {location && typeof location.lat === 'number' && typeof location.lng === 'number' && (
            <UserLocationMarker location={location} />
          )}

          {/* Search radius circle */}
          <Circle
            center={mapCenter}
            radius={radius * 1609.34} // Convert miles to meters
            pathOptions={{
              color: '#3b82f6',
              fillColor: '#3b82f6',
              fillOpacity: 0.1,
              weight: 2
            }}
          />

          {/* River markers */}
          <RiverMarkers rivers={rivers} floodPredictions={floodPredictions} />
          
          {/* Map updater for location changes */}
          <MapUpdater center={mapCenter} />
        </MapContainer>
      </div>

      {/* Map Legend */}
      <div
        className="w-full bg-white rounded-lg shadow-md p-4 border border-gray-200 my-4"
        aria-label="Map Legend"
        role="region"
      >
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-6">
          <h4 className="text-sm font-semibold text-gray-900 whitespace-nowrap">Map Legend</h4>
          <div className="flex flex-col space-y-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2 sm:space-y-0 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm"></div>
              <span className="text-gray-700">Your Location</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-white shadow-sm flex items-center justify-center"></div>
              <span className="text-gray-700">River (Low Risk)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 rounded-full bg-yellow-500 border-2 border-white shadow-sm flex items-center justify-center"></div>
              <span className="text-gray-700">River (Medium Risk)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white shadow-sm flex items-center justify-center"></div>
              <span className="text-gray-700">River (High Risk)</span>
            </div>
          </div>
        </div>
      </div>

      {/* River List for Map View */}
      <div className="mt-6" style={{ height: 'max-content', maxHeight: '100vh', overflowY: 'auto' }}>
        <div className="flex items-center mb-3">
          <Droplets className="w-6 h-6 text-blue-600 mr-2" aria-hidden="true" />
          <h3 className="text-lg font-semibold">Rivers Near You ({rivers.length})</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {riversLoading
            ? Array.from({ length: 3 }).map((_, i) => <RiverCardSkeleton key={i} />)
            : rivers.map((river, index) => {
                const prediction = floodPredictions.find(p => p.riverId === river.id);
                return <MapRiverCard key={`${river.id}-${index}`} river={river} prediction={prediction} index={index} cardClassName="bg-white border rounded-lg p-4" />;
              })}
        </div>
      </div>

      {/* User Reports for Map View */}
      {reports.filter(r => r.status === 'active').length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">User-Submitted Reports Near You ({reports.filter(r => r.status === 'active').length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.filter(r => r.status === 'active').map((report) => (
              <div key={report.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-sm">{report.title}</h4>
                  <div className="text-xs text-gray-500">{new Date(report.created_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    report.category === 'flood' ? 'bg-blue-100 text-blue-800' :
                    report.category === 'hazard' ? 'bg-red-100 text-red-800' :
                    report.category === 'weather' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {report.category}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2">{report.location}</p>
                <div className="text-sm text-gray-800 mb-2">{report.description}</div>
                <div className="text-xs text-blue-600 mt-2">User-Submitted Report</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Local Emergency Management Section */}
      <div className="mt-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-2">Local Emergency Management</h2>
          <ul className="space-y-2">
            <li>
              <a href="tel:911" className="text-blue-700 hover:underline font-medium">Call 911 (Emergency)</a>
            </li>
            <li>
              <a href="https://www.ready.gov/floods" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">FEMA Flood Safety</a>
            </li>
            <li>
              <a href="https://twitter.com/FEMA" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">FEMA Twitter</a>
            </li>
            <li>
              <a href="https://www.weather.gov/safety/flood" target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">National Weather Service Flood Safety</a>
            </li>
          </ul>
        </div>
      </div>

      {/* Disclaimer and Official Guidance */}
      <div className="mt-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2 text-yellow-800">Disclaimer & Official Guidance</h2>
          <p className="text-sm text-yellow-900 mb-2">
            This app provides flood and hazard information for awareness only. Always follow official instructions from emergency management and local authorities. Do not rely solely on this app for evacuation or safety decisions.
          </p>
          <ul className="list-disc list-inside text-sm text-yellow-900">
            <li>Call 911 in an emergency.</li>
            <li>Monitor local news and official alerts.</li>
            <li>Have a personal emergency plan.</li>
            <li>Visit <a href="https://www.ready.gov/floods" className="underline text-blue-700" target="_blank" rel="noopener noreferrer">ready.gov/floods</a> for more information.</li>
          </ul>
        </div>
      </div>

      {/* Always show the location requirement modal if needed */}
      <LocationRequirementModal />
    </div>
  );
};

export default MapView; 