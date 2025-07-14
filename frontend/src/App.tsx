import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import MapView from './components/MapView';
import Settings from './components/Settings';
import { LocationProvider } from './contexts/LocationContext';
import { WeatherProvider } from './contexts/WeatherContext';
import { RiverProvider } from './contexts/RiverContext';
import { ReportProvider } from './contexts/ReportContext';
import { RadiusProvider } from './contexts/RadiusContext';
import LocationRequirementModal from './components/LocationRequirementModal';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="App">
      <Router>
        <LocationProvider>
          <RadiusProvider>
            <WeatherProvider>
              <RiverProvider>
                <ReportProvider>
                  <div className="min-h-screen bg-gray-100">
                    <Header />
                    <main className="main-content">
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/map" element={<MapView />} />
                        <Route path="/settings" element={<Settings />} />
                      </Routes>
                    </main>
                    <LocationRequirementModal />
                  </div>
                </ReportProvider>
              </RiverProvider>
            </WeatherProvider>
          </RadiusProvider>
        </LocationProvider>
      </Router>
    </div>
  );
};

export default App; 