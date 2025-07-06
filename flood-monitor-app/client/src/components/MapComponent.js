import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Component to recenter map when location changes
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lon], 11);
    }
  }, [center, map]);
  return null;
}

const MapComponent = ({ userLocation, waterSites, alerts, onSiteSelect }) => {
  const mapRef = useRef();

  const getMarkerColor = (site) => {
    const alert = alerts.find(a => a.siteId === site.siteId);
    if (alert) {
      switch (alert.alert.risk) {
        case 'high': return '#d32f2f';
        case 'medium': return '#f57c00';
        default: return '#388e3c';
      }
    }
    return '#1976d2';
  };

  const createCustomIcon = (color) => {
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="
        background-color: ${color};
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  const getSiteStatus = (site) => {
    const alert = alerts.find(a => a.siteId === site.siteId);
    if (alert) {
      return {
        status: alert.alert.risk,
        reasons: alert.alert.reasons
      };
    }
    return { status: 'normal', reasons: [] };
  };

  const formatMeasurement = (measurement) => {
    if (!measurement) return 'No data';
    return `${measurement.value.toFixed(2)} ${measurement.unit}`;
  };

  if (!userLocation) {
    return <div style={{ padding: 20, textAlign: 'center' }}>Loading map...</div>;
  }

  return (
    <MapContainer
      center={[userLocation.lat, userLocation.lon]}
      zoom={11}
      style={{ height: '100%', width: '100%' }}
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <RecenterMap center={userLocation} />
      
      {/* User location marker */}
      <Marker position={[userLocation.lat, userLocation.lon]}>
        <Popup>
          <div>
            <strong>Your Location</strong>
          </div>
        </Popup>
      </Marker>
      
      {/* Water monitoring sites */}
      {waterSites.map((site) => {
        const status = getSiteStatus(site);
        const color = getMarkerColor(site);
        
        return (
          <CircleMarker
            key={site.siteId}
            center={[site.latitude, site.longitude]}
            radius={status.status === 'high' ? 15 : status.status === 'medium' ? 12 : 8}
            fillColor={color}
            color="#fff"
            weight={2}
            opacity={1}
            fillOpacity={0.8}
            eventHandlers={{
              click: () => onSiteSelect(site),
            }}
          >
            <Popup>
              <div style={{ minWidth: 200 }}>
                <h4 style={{ margin: '0 0 10px 0' }}>{site.name}</h4>
                <p style={{ margin: '5px 0' }}>
                  <strong>Status:</strong> 
                  <span style={{ 
                    marginLeft: 5, 
                    color: color,
                    fontWeight: 'bold',
                    textTransform: 'capitalize'
                  }}>
                    {status.status}
                  </span>
                </p>
                
                {site.measurements['Gage height, feet'] && (
                  <p style={{ margin: '5px 0' }}>
                    <strong>Water Level:</strong> {formatMeasurement(site.measurements['Gage height, feet'])}
                    {site.measurements['Gage height, feet'].trend && (
                      <span style={{ marginLeft: 5, fontSize: '0.9em', color: '#666' }}>
                        ({site.measurements['Gage height, feet'].trend})
                      </span>
                    )}
                  </p>
                )}
                
                {site.measurements['Discharge, cubic feet per second'] && (
                  <p style={{ margin: '5px 0' }}>
                    <strong>Flow Rate:</strong> {formatMeasurement(site.measurements['Discharge, cubic feet per second'])}
                  </p>
                )}
                
                {status.reasons.length > 0 && (
                  <div style={{ marginTop: 10, padding: 10, backgroundColor: '#f5f5f5', borderRadius: 5 }}>
                    <strong>Alert Reasons:</strong>
                    <ul style={{ margin: '5px 0 0 20px', padding: 0 }}>
                      {status.reasons.map((reason, idx) => (
                        <li key={idx} style={{ fontSize: '0.9em' }}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <button 
                  onClick={() => onSiteSelect(site)}
                  style={{
                    marginTop: 10,
                    padding: '5px 15px',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  View Details
                </button>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
};

export default MapComponent;