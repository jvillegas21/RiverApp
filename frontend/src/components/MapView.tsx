import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Icon, LatLng } from 'leaflet';
import { useLocation } from '../contexts/LocationContext';
import { useRiver } from '../contexts/RiverContext';
import { useWeather } from '../contexts/WeatherContext';
import { Droplets, AlertTriangle, CheckCircle, Clock, MapPin } from 'lucide-react';
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
  const colors = {
    High: '#dc2626',
    Medium: '#d97706', 
    Low: '#16a34a',
    default: '#6b7280'
  };
  
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" fill="${colors[riskLevel as keyof typeof colors] || colors.default}" stroke="white" stroke-width="2"/>
        <path d="M12 2L12 22M2 12L22 12" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `)}`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
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

// Component to render river markers
const RiverMarkers: React.FC<{ rivers: any[], floodPredictions: any[] }> = ({ rivers, floodPredictions }) => {
  return (
    <>
      {rivers.map((river, index) => {
        const prediction = floodPredictions.find(p => p.riverId === river.id);
        const riskLevel = prediction?.riskLevel || 'default';
        const icon = createCustomIcon(riskLevel);
        
        return (
          <Marker
            key={`${river.id}-${index}`}
            position={[river.location.lat, river.location.lng]}
            icon={icon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold text-lg">{river.name}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  {river.location.lat.toFixed(4)}, {river.location.lng.toFixed(4)}
                </p>
                <div className="space-y-1 text-sm">
                  <p><strong>Flow:</strong> {river.flow !== 'N/A' ? `${river.flow} ${river.unit}` : 'N/A'}</p>
                  <p><strong>Stage:</strong> {river.stage !== 'N/A' ? `${river.stage} ft` : 'N/A'}</p>
                  {prediction && (
                    <>
                      <p><strong>Risk Level:</strong> {prediction.riskLevel}</p>
                      <p><strong>Flood Probability:</strong> {prediction.floodProbability}%</p>
                      <p><strong>Time to Flood:</strong> {prediction.timeToFlood}</p>
                    </>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

const MapView: React.FC = () => {
  const { location } = useLocation();
  const { rivers, floodPredictions, loading, fetchFloodPrediction } = useRiver();
  const { weather } = useWeather();
  const [radius, setRadius] = useState(10);

  useEffect(() => {
    if (location) {
      fetchFloodPrediction(location.lat, location.lng, radius);
    }
  }, [location, radius]);

  const mapCenter: [number, number] = useMemo(() => {
    return location ? [location.lat, location.lng] : [40.7128, -74.0060]; // Default to NYC
  }, [location]);

  if (!location) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Map View</h2>
          <p className="text-gray-600">Please select a location to view the map.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Interactive Map</h1>
        <p className="text-gray-600">View flood risks and river conditions on an interactive map</p>
      </div>

      {/* Map Controls */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">
              Search Radius: {radius} miles
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-32"
              aria-label="Search radius in miles"
            />
          </div>
          
          {weather && (
            <div className="text-sm text-gray-600">
              Current Weather: {weather.current?.weather?.[0]?.main || 'N/A'}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Map */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <MapContainer
          center={mapCenter}
          zoom={10}
          className="w-full h-96"
          style={{ height: '400px' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* User location marker */}
          <Marker position={mapCenter} icon={new Icon({
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
                <p className="text-sm text-gray-600">
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>

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
      <div className="mt-6 bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-3">Map Legend</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <MapPin className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm">Your Location</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm">High Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
              <Clock className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm">Medium Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm">Low Risk</span>
          </div>
        </div>
      </div>

      {/* River List for Map View */}
      {rivers.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Rivers in Range ({rivers.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rivers.map((river, index) => {
              const prediction = floodPredictions.find(p => p.riverId === river.id);
              
              return (
                <div key={`${river.id}-${index}`} className="bg-white rounded-lg shadow-md p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm">{river.name}</h4>
                    {prediction && (
                      <div className={`w-3 h-3 rounded-full ${
                        prediction.riskLevel === 'High' ? 'bg-red-500' :
                        prediction.riskLevel === 'Medium' ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}></div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    {river.location.lat.toFixed(4)}, {river.location.lng.toFixed(4)}
                  </p>
                  <div className="text-xs text-gray-600">
                    <p>Flow: {river.flow !== 'N/A' ? `${river.flow} ${river.unit}` : 'N/A'}</p>
                    <p>Stage: {river.stage !== 'N/A' ? `${river.stage} ft` : 'N/A'}</p>
                    {prediction && (
                      <p className="mt-1 font-medium">
                        Risk: {prediction.riskLevel} ({prediction.floodProbability}%)
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView; 