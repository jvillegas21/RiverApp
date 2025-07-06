import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import toast from 'react-hot-toast';
import { MapPin, Activity, AlertTriangle, Layers, Crosshair } from 'lucide-react';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons
const createCustomIcon = (color, size = 25) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: ${size * 0.4}px;
          height: ${size * 0.4}px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const userLocationIcon = createCustomIcon('#667eea', 30);
const monitoringSiteIcon = createCustomIcon('#22c55e', 20);
const selectedSiteIcon = createCustomIcon('#ef4444', 25);

// Component to fit map bounds to show all markers
const FitBounds = ({ bounds }) => {
  const map = useMap();
  
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [map, bounds]);
  
  return null;
};

const MapView = ({ location }) => {
  const [nearbySites, setNearbySites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [mapLayer, setMapLayer] = useState('osm');
  const [showFloodRisk, setShowFloodRisk] = useState(true);
  const [floodRiskData, setFloodRiskData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch nearby monitoring sites
  const fetchNearbySites = async () => {
    if (!location) return;
    
    try {
      setLoading(true);
      const response = await axios.get('/api/nearby-sites', {
        params: {
          lat: location.latitude,
          lon: location.longitude,
          radius: 50
        }
      });
      setNearbySites(response.data.sites || []);
    } catch (error) {
      console.error('Error fetching nearby sites:', error);
      toast.error('Failed to fetch monitoring sites');
    } finally {
      setLoading(false);
    }
  };

  // Fetch flood risk data
  const fetchFloodRisk = async () => {
    if (!location) return;
    
    try {
      const response = await axios.get('/api/flood-risk', {
        params: {
          lat: location.latitude,
          lon: location.longitude
        }
      });
      setFloodRiskData(response.data);
    } catch (error) {
      console.error('Error fetching flood risk:', error);
    }
  };

  useEffect(() => {
    if (location) {
      fetchNearbySites();
      fetchFloodRisk();
    }
  }, [location]);

  // Calculate bounds to include user location and all monitoring sites
  const mapBounds = useMemo(() => {
    if (!location) return null;
    
    const bounds = [[location.latitude, location.longitude]];
    
    nearbySites.forEach(site => {
      bounds.push([site.latitude, site.longitude]);
    });
    
    return bounds;
  }, [location, nearbySites]);

  // Get flood risk circle properties
  const getFloodRiskCircle = () => {
    if (!floodRiskData || !location) return null;
    
    let radius = 1000; // Default 1km
    let color = '#22c55e'; // Green for low risk
    
    switch (floodRiskData.riskLevel) {
      case 'MODERATE':
        radius = 2000;
        color = '#f59e0b';
        break;
      case 'HIGH':
        radius = 3000;
        color = '#ef4444';
        break;
      default:
        radius = 1000;
        color = '#22c55e';
    }
    
    return {
      center: [location.latitude, location.longitude],
      radius,
      color,
      fillOpacity: 0.1,
      weight: 2
    };
  };

  const mapLayers = {
    osm: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a>'
    },
    terrain: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors'
    }
  };

  if (!location) {
    return (
      <div className="map-loading">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Waiting for location access...</p>
        </div>
      </div>
    );
  }

  const floodRiskCircle = getFloodRiskCircle();

  return (
    <div className="map-view">
      <div className="map-header">
        <h1>Interactive Flood Monitoring Map</h1>
        <div className="map-controls">
          <div className="layer-selector">
            <Layers size={18} />
            <select 
              value={mapLayer} 
              onChange={(e) => setMapLayer(e.target.value)}
              className="layer-select"
            >
              <option value="osm">Street Map</option>
              <option value="satellite">Satellite</option>
              <option value="terrain">Terrain</option>
            </select>
          </div>
          
          <button
            className={`toggle-button ${showFloodRisk ? 'active' : ''}`}
            onClick={() => setShowFloodRisk(!showFloodRisk)}
          >
            <AlertTriangle size={18} />
            Flood Risk Zones
          </button>
        </div>
      </div>

      <div className="map-container">
        <MapContainer
          center={[location.latitude, location.longitude]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url={mapLayers[mapLayer].url}
            attribution={mapLayers[mapLayer].attribution}
          />
          
          {mapBounds && <FitBounds bounds={mapBounds} />}
          
          {/* User location marker */}
          <Marker 
            position={[location.latitude, location.longitude]} 
            icon={userLocationIcon}
          >
            <Popup>
              <div className="popup-content">
                <h3>Your Location</h3>
                <p>Latitude: {location.latitude.toFixed(6)}</p>
                <p>Longitude: {location.longitude.toFixed(6)}</p>
                <p>Accuracy: ±{location.accuracy?.toFixed(0)}m</p>
                {floodRiskData && (
                  <div className="flood-risk-info">
                    <p><strong>Flood Risk:</strong> {floodRiskData.riskLevel}</p>
                    <p><strong>Elevation:</strong> {floodRiskData.elevation?.toFixed(1)}m</p>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>

          {/* Flood risk visualization */}
          {showFloodRisk && floodRiskCircle && (
            <Circle
              center={floodRiskCircle.center}
              radius={floodRiskCircle.radius}
              pathOptions={{
                color: floodRiskCircle.color,
                fillColor: floodRiskCircle.color,
                fillOpacity: floodRiskCircle.fillOpacity,
                weight: floodRiskCircle.weight
              }}
            >
              <Popup>
                <div className="popup-content">
                  <h3>Flood Risk Zone</h3>
                  <p>Risk Level: <strong>{floodRiskData?.riskLevel}</strong></p>
                  <p>Zone Radius: {(floodRiskCircle.radius / 1000).toFixed(1)}km</p>
                </div>
              </Popup>
            </Circle>
          )}

          {/* Monitoring site markers */}
          {nearbySites.map((site) => (
            <Marker
              key={site.id}
              position={[site.latitude, site.longitude]}
              icon={selectedSite?.id === site.id ? selectedSiteIcon : monitoringSiteIcon}
              eventHandlers={{
                click: () => setSelectedSite(site)
              }}
            >
              <Popup>
                <div className="popup-content">
                  <h3>{site.name}</h3>
                  <p><strong>Site ID:</strong> {site.id}</p>
                  <p><strong>Distance:</strong> {site.distance.toFixed(1)}km</p>
                  <p><strong>Coordinates:</strong> {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}</p>
                  <button 
                    className="btn btn-primary popup-button"
                    onClick={() => setSelectedSite(site)}
                  >
                    View Water Levels
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Map legend */}
      <div className="map-legend">
        <h4>Legend</h4>
        <div className="legend-item">
          <div className="legend-marker user-location"></div>
          <span>Your Location</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker monitoring-site"></div>
          <span>Monitoring Site</span>
        </div>
        <div className="legend-item">
          <div className="legend-marker selected-site"></div>
          <span>Selected Site</span>
        </div>
        {showFloodRisk && (
          <div className="legend-item">
            <div className="legend-circle flood-risk"></div>
            <span>Flood Risk Zone</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .map-view {
          width: 100%;
          height: calc(100vh - 200px);
          position: relative;
        }
        
        .map-loading {
          height: 500px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .map-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        
        .map-header h1 {
          color: white;
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0;
        }
        
        .map-controls {
          display: flex;
          gap: 1rem;
          align-items: center;
        }
        
        .layer-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.9);
          padding: 0.5rem;
          border-radius: 10px;
          color: #333;
        }
        
        .layer-select {
          border: none;
          background: none;
          color: #333;
          font-weight: 600;
          cursor: pointer;
        }
        
        .toggle-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          padding: 0.5rem 1rem;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
        }
        
        .toggle-button:hover,
        .toggle-button.active {
          background: rgba(255, 255, 255, 0.9);
          color: #667eea;
          border-color: white;
        }
        
        .map-container {
          height: 500px;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          position: relative;
        }
        
        .popup-content {
          font-family: inherit;
        }
        
        .popup-content h3 {
          margin: 0 0 0.5rem 0;
          color: #333;
          font-size: 1.1rem;
        }
        
        .popup-content p {
          margin: 0.25rem 0;
          color: #666;
          font-size: 0.9rem;
        }
        
        .flood-risk-info {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid #eee;
        }
        
        .popup-button {
          margin-top: 0.5rem;
          padding: 0.25rem 0.75rem;
          font-size: 0.85rem;
        }
        
        .map-legend {
          position: absolute;
          top: 80px;
          right: 15px;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          padding: 1rem;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          min-width: 150px;
        }
        
        .map-legend h4 {
          margin: 0 0 0.75rem 0;
          color: #333;
          font-size: 1rem;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0.5rem 0;
          font-size: 0.85rem;
          color: #666;
        }
        
        .legend-marker {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        
        .legend-marker.user-location {
          background: #667eea;
        }
        
        .legend-marker.monitoring-site {
          background: #22c55e;
        }
        
        .legend-marker.selected-site {
          background: #ef4444;
        }
        
        .legend-circle {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid #f59e0b;
          background: rgba(245, 158, 11, 0.2);
        }
        
        @media (max-width: 768px) {
          .map-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
          
          .map-header h1 {
            font-size: 1.5rem;
          }
          
          .map-controls {
            flex-wrap: wrap;
            justify-content: center;
          }
          
          .map-container {
            height: 400px;
          }
          
          .map-legend {
            position: relative;
            top: auto;
            right: auto;
            margin-top: 1rem;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default MapView;