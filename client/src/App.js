import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { 
  Waves, 
  MapPin, 
  AlertTriangle, 
  TrendingUp, 
  Settings as SettingsIcon,
  Menu,
  X
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import MapView from './components/MapView';
import Settings from './components/Settings';
import { useGeolocation } from './hooks/useGeolocation';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const { location, error: locationError, requestLocation } = useGeolocation();
  const { connected, lastMessage } = useWebSocket(`ws://localhost:5000`);

  useEffect(() => {
    setIsConnected(connected);
  }, [connected]);

  useEffect(() => {
    // Request location on app start
    requestLocation();
  }, [requestLocation]);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'map', label: 'Map View', icon: MapPin },
    { id: 'settings', label: 'Settings', icon: SettingsIcon }
  ];

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard location={location} />;
      case 'map':
        return <MapView location={location} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard location={location} />;
    }
  };

  const handleNavigation = (viewId) => {
    setCurrentView(viewId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="App">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '15px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          },
        }}
      />
      
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <Waves className="card-icon" />
            <span>FloodWatch</span>
            {isConnected && (
              <div className="connection-status">
                <div className="status-indicator connected" title="Connected to real-time updates">
                  <div className="status-dot"></div>
                </div>
              </div>
            )}
          </div>
          
          {/* Mobile menu button */}
          <button 
            className="mobile-menu-button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
          
          {/* Navigation */}
          <nav className={`nav-buttons ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            {navigationItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`nav-button ${currentView === item.id ? 'active' : ''}`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="main-content">
        {locationError && (
          <div className="alert alert-warning">
            <AlertTriangle size={20} />
            <div>
              <strong>Location access needed:</strong> {locationError}
              <button 
                onClick={requestLocation}
                className="btn btn-secondary ml-2"
                style={{ marginLeft: '1rem', padding: '0.25rem 0.75rem' }}
              >
                Try Again
              </button>
            </div>
          </div>
        )}
        
        {renderCurrentView()}
      </main>

      <style jsx>{`
        .connection-status {
          margin-left: 0.5rem;
        }
        
        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: #666;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
          animation: pulse 2s infinite;
        }
        
        .connected .status-dot {
          background: #22c55e;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .mobile-menu-button {
          display: none;
          background: none;
          border: none;
          color: #667eea;
          cursor: pointer;
          padding: 0.5rem;
        }
        
        @media (max-width: 768px) {
          .mobile-menu-button {
            display: block;
          }
          
          .nav-buttons {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            flex-direction: column;
            padding: 1rem;
            gap: 0.5rem;
          }
          
          .nav-buttons.mobile-open {
            display: flex;
          }
          
          .nav-button {
            width: 100%;
            justify-content: center;
            padding: 0.75rem 1rem;
          }
        }
      `}</style>
    </div>
  );
}

export default App;