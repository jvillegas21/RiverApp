import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import MapView from './components/MapView';
import Settings from './components/Settings';
import { LocationProvider } from './contexts/LocationContext';
import { WeatherProvider } from './contexts/WeatherContext';
import { RiverProvider } from './contexts/RiverContext';
import './App.css';

function App() {
  return (
    <LocationProvider>
      <WeatherProvider>
        <RiverProvider>
          <Router>
            <div className="App">
              <Header />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/map" element={<MapView />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </main>
            </div>
          </Router>
        </RiverProvider>
      </WeatherProvider>
    </LocationProvider>
  );
}

export default App; 