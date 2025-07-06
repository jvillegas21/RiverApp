import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  AlertTriangle, 
  Shield, 
  MapPin, 
  TrendingUp, 
  Waves,
  Mountain,
  Clock,
  Activity,
  RefreshCw
} from 'lucide-react';

import WaterLevelChart from './WaterLevelChart';
import NearbyMonitoringSites from './NearbyMonitoringSites';

const Dashboard = ({ location }) => {
  const [floodRisk, setFloodRisk] = useState(null);
  const [nearbySites, setNearbySites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [waterLevelData, setWaterLevelData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch flood risk assessment
  const fetchFloodRisk = async () => {
    if (!location) return;
    
    try {
      setLoading(true);
      const response = await axios.get('/api/flood-risk', {
        params: {
          lat: location.latitude,
          lon: location.longitude
        }
      });
      setFloodRisk(response.data);
    } catch (error) {
      console.error('Error fetching flood risk:', error);
      toast.error('Failed to assess flood risk');
    } finally {
      setLoading(false);
    }
  };

  // Fetch nearby monitoring sites
  const fetchNearbySites = async () => {
    if (!location) return;
    
    try {
      const response = await axios.get('/api/nearby-sites', {
        params: {
          lat: location.latitude,
          lon: location.longitude,
          radius: 50
        }
      });
      setNearbySites(response.data.sites || []);
      
      // Auto-select the closest site
      if (response.data.sites && response.data.sites.length > 0) {
        setSelectedSite(response.data.sites[0]);
      }
    } catch (error) {
      console.error('Error fetching nearby sites:', error);
      toast.error('Failed to fetch nearby monitoring sites');
    }
  };

  // Fetch water level data for selected site
  const fetchWaterLevelData = async (siteId) => {
    if (!siteId) return;
    
    try {
      const response = await axios.get(`/api/water-levels/${siteId}`, {
        params: { days: 7 }
      });
      setWaterLevelData(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching water level data:', error);
      toast.error('Failed to fetch water level data');
    }
  };

  // Refresh all data
  const refreshData = async () => {
    setLoading(true);
    await Promise.all([
      fetchFloodRisk(),
      fetchNearbySites(),
      selectedSite ? fetchWaterLevelData(selectedSite.id) : Promise.resolve()
    ]);
    setLoading(false);
    toast.success('Data refreshed successfully');
  };

  useEffect(() => {
    if (location) {
      fetchFloodRisk();
      fetchNearbySites();
    }
  }, [location]);

  useEffect(() => {
    if (selectedSite) {
      fetchWaterLevelData(selectedSite.id);
    }
  }, [selectedSite]);

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'LOW': return 'risk-low';
      case 'MODERATE': return 'risk-moderate';
      case 'HIGH': return 'risk-high';
      default: return 'risk-low';
    }
  };

  const getRiskIcon = (riskLevel) => {
    switch (riskLevel) {
      case 'LOW': return <Shield size={20} />;
      case 'MODERATE': return <AlertTriangle size={20} />;
      case 'HIGH': return <AlertTriangle size={20} />;
      default: return <Shield size={20} />;
    }
  };

  if (!location) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Waiting for location access...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Flood Monitoring Dashboard</h1>
        <div className="dashboard-controls">
          <button 
            onClick={refreshData}
            className="btn btn-secondary"
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh Data
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Current Location Card */}
        <div className="card">
          <div className="card-header">
            <MapPin className="card-icon" />
            <h2 className="card-title">Current Location</h2>
          </div>
          <div className="location-info">
            <p><strong>Latitude:</strong> {location.latitude.toFixed(6)}</p>
            <p><strong>Longitude:</strong> {location.longitude.toFixed(6)}</p>
            <p><strong>Accuracy:</strong> ±{location.accuracy?.toFixed(0)}m</p>
            {floodRisk && (
              <div className="mt-2">
                <p><strong>Elevation:</strong> {floodRisk.elevation?.toFixed(1)}m above sea level</p>
              </div>
            )}
          </div>
        </div>

        {/* Flood Risk Assessment */}
        <div className="card">
          <div className="card-header">
            <AlertTriangle className="card-icon" />
            <h2 className="card-title">Flood Risk Assessment</h2>
          </div>
          {loading && !floodRisk ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>Assessing flood risk...</p>
            </div>
          ) : floodRisk ? (
            <div className="risk-assessment">
              <div className={`risk-indicator ${getRiskColor(floodRisk.riskLevel)}`}>
                {getRiskIcon(floodRisk.riskLevel)}
                <span>{floodRisk.riskLevel} RISK</span>
              </div>
              
              <div className="risk-details mt-3">
                <div className="risk-metric">
                  <Mountain size={16} />
                  <span>Elevation: {floodRisk.elevation?.toFixed(1)}m</span>
                </div>
                <div className="risk-metric">
                  <Waves size={16} />
                  <span>Nearby water sources: {floodRisk.nearbyWaterBodies}</span>
                </div>
                
                {floodRisk.riskFactors && floodRisk.riskFactors.length > 0 && (
                  <div className="risk-factors mt-2">
                    <h4>Risk Factors:</h4>
                    <ul>
                      {floodRisk.riskFactors.map((factor, index) => (
                        <li key={index}>{factor}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted">Unable to assess flood risk at this time.</p>
          )}
        </div>

        {/* Water Level Monitoring */}
        <div className="card water-level-card">
          <div className="card-header">
            <TrendingUp className="card-icon" />
            <h2 className="card-title">Water Level Monitoring</h2>
            {lastUpdated && (
              <div className="last-updated">
                <Clock size={16} />
                <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
          
          {selectedSite && (
            <div className="selected-site">
              <h3>{selectedSite.name}</h3>
              <p className="site-distance">
                {selectedSite.distance.toFixed(1)} km away
              </p>
            </div>
          )}
          
          {waterLevelData && (
            <div className="chart-container">
              <WaterLevelChart data={waterLevelData} />
            </div>
          )}
          
          {!selectedSite && (
            <p className="text-muted">No monitoring sites found nearby.</p>
          )}
        </div>

        {/* Nearby Monitoring Sites */}
        <div className="card">
          <div className="card-header">
            <Activity className="card-icon" />
            <h2 className="card-title">Nearby Monitoring Sites</h2>
          </div>
          
          <NearbyMonitoringSites
            sites={nearbySites}
            selectedSite={selectedSite}
            onSiteSelect={setSelectedSite}
          />
        </div>
      </div>

      <style jsx>{`
        .dashboard {
          width: 100%;
        }
        
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        
        .dashboard-header h1 {
          color: white;
          font-size: 2rem;
          font-weight: 700;
        }
        
        .dashboard-controls {
          display: flex;
          gap: 1rem;
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        .location-info p {
          margin: 0.5rem 0;
          color: #666;
        }
        
        .location-info strong {
          color: #333;
        }
        
        .risk-assessment {
          text-align: center;
        }
        
        .risk-details {
          text-align: left;
        }
        
        .risk-metric {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0.5rem 0;
          color: #666;
        }
        
        .risk-factors ul {
          margin: 0.5rem 0;
          padding-left: 1.5rem;
        }
        
        .risk-factors li {
          margin: 0.25rem 0;
          color: #666;
        }
        
        .water-level-card {
          grid-column: span 2;
        }
        
        .selected-site {
          margin-bottom: 1rem;
        }
        
        .selected-site h3 {
          margin: 0;
          color: #333;
          font-size: 1.1rem;
        }
        
        .site-distance {
          color: #666;
          font-size: 0.9rem;
          margin: 0.25rem 0;
        }
        
        .last-updated {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #666;
          font-size: 0.85rem;
        }
        
        @media (max-width: 768px) {
          .dashboard-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
          
          .dashboard-header h1 {
            font-size: 1.5rem;
          }
          
          .water-level-card {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;