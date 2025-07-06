import React from 'react';
import { MapPin, Activity, ChevronRight } from 'lucide-react';

const NearbyMonitoringSites = ({ sites, selectedSite, onSiteSelect }) => {
  if (!sites || sites.length === 0) {
    return (
      <div className="no-sites">
        <MapPin size={24} className="text-muted" />
        <p>No monitoring sites found in your area</p>
        <p className="text-muted">Try expanding your search radius or check back later</p>
      </div>
    );
  }

  const formatDistance = (distance) => {
    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  const getDistanceColor = (distance) => {
    if (distance < 5) return '#22c55e'; // Green for close
    if (distance < 15) return '#f59e0b'; // Yellow for medium
    return '#ef4444'; // Red for far
  };

  return (
    <div className="nearby-sites">
      <div className="sites-list">
        {sites.map((site) => (
          <div
            key={site.id}
            className={`site-item ${selectedSite?.id === site.id ? 'selected' : ''}`}
            onClick={() => onSiteSelect(site)}
          >
            <div className="site-info">
              <div className="site-header">
                <h3 className="site-name">{site.name}</h3>
                <div 
                  className="distance-badge"
                  style={{ color: getDistanceColor(site.distance) }}
                >
                  {formatDistance(site.distance)}
                </div>
              </div>
              
              <div className="site-meta">
                <div className="site-id">
                  <Activity size={14} />
                  <span>ID: {site.id}</span>
                </div>
                
                <div className="site-coords">
                  <MapPin size={14} />
                  <span>
                    {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="site-actions">
              <ChevronRight size={16} />
            </div>
          </div>
        ))}
      </div>
      
      {sites.length > 0 && (
        <div className="sites-summary">
          <p className="text-muted">
            Found {sites.length} monitoring site{sites.length > 1 ? 's' : ''} within 50km
          </p>
        </div>
      )}

      <style jsx>{`
        .nearby-sites {
          width: 100%;
        }
        
        .no-sites {
          text-align: center;
          padding: 2rem;
          color: #666;
        }
        
        .no-sites p {
          margin: 0.5rem 0;
        }
        
        .sites-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .site-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 12px;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .site-item:hover {
          background: rgba(255, 255, 255, 0.7);
          border-color: rgba(102, 126, 234, 0.3);
          transform: translateY(-2px);
        }
        
        .site-item.selected {
          background: rgba(102, 126, 234, 0.1);
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }
        
        .site-info {
          flex: 1;
        }
        
        .site-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }
        
        .site-name {
          font-size: 1rem;
          font-weight: 600;
          color: #333;
          margin: 0;
          flex: 1;
          margin-right: 1rem;
        }
        
        .distance-badge {
          font-size: 0.85rem;
          font-weight: 700;
          padding: 0.25rem 0.75rem;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 20px;
          border: 1px solid currentColor;
        }
        
        .site-meta {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .site-id,
        .site-coords {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #666;
        }
        
        .site-actions {
          color: #667eea;
          display: flex;
          align-items: center;
          margin-left: 1rem;
        }
        
        .sites-summary {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.3);
          text-align: center;
        }
        
        .sites-summary p {
          margin: 0;
          font-size: 0.85rem;
        }
        
        @media (max-width: 768px) {
          .site-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
          
          .site-name {
            margin-right: 0;
          }
          
          .distance-badge {
            align-self: flex-start;
          }
          
          .site-meta {
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default NearbyMonitoringSites;