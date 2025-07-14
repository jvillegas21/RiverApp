import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import MapView from './components/MapView';
import Settings from './components/Settings';
import ErrorBoundary from './components/ErrorBoundary';
import { LocationProvider } from './contexts/LocationContext';
import { WeatherProvider } from './contexts/WeatherContext';
import { RiverProvider } from './contexts/RiverContext';
import { ReportProvider } from './contexts/ReportContext';
import { RadiusProvider } from './contexts/RadiusContext';
import LocationRequirementModal from './components/LocationRequirementModal';
import './App.css';

const App: React.FC = () => {
  const handleError = (error: Error, errorInfo: any) => {
    // Log to console in development
    console.error('Application Error:', error, errorInfo);
    
    // In production, you might want to send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: analytics.track('App Error', { error: error.message, stack: error.stack });
    }
  };

  return (
    <div className="App">
      <ErrorBoundary onError={handleError}>
        <Router>
          <ErrorBoundary onError={handleError}>
            <LocationProvider>
              <RadiusProvider>
                <ErrorBoundary onError={handleError}>
                  <WeatherProvider>
                    <RiverProvider>
                      <ReportProvider>
                        <div className="min-h-screen bg-gray-100">
                          <ErrorBoundary onError={handleError}>
                            <Header />
                          </ErrorBoundary>
                          <main className="main-content">
                            <ErrorBoundary onError={handleError}>
                              <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/map" element={<MapView />} />
                                <Route path="/settings" element={<Settings />} />
                              </Routes>
                            </ErrorBoundary>
                          </main>
                          <LocationRequirementModal />
                        </div>
                      </ReportProvider>
                    </RiverProvider>
                  </WeatherProvider>
                </ErrorBoundary>
              </RadiusProvider>
            </LocationProvider>
          </ErrorBoundary>
        </Router>
      </ErrorBoundary>
    </div>
  );
};

export default App; 