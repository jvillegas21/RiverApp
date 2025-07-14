import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { useWeather } from '../contexts/WeatherContext';
import { useRiver } from '../contexts/RiverContext';
import { useRadius } from '../contexts/RadiusContext';
import InlineLocationControls from './InlineLocationControls';
import WeatherCard from './WeatherCard';
import RiverList from './RiverList';
import FloodAlert from './FloodAlert';
import Settings from './Settings';
import { RefreshCw, AlertTriangle, ChevronDown, ChevronUp, Cloud, Thermometer, Wind, Droplets, Settings as SettingsIcon, MapPin } from 'lucide-react';
import ReportForm from './ReportForm';
import ReportList from './ReportList';
import { useReports } from '../contexts/ReportContext';
import Modal from 'react-modal';
Modal.setAppElement('#root');

const Dashboard: React.FC = () => {
  const { location, getCurrentLocation } = useLocation();
  const { weather, fetchWeather, lastFetched: weatherLastFetched } = useWeather();
  const { rivers, floodPredictions, loading, loadingProgress, fetchFloodPrediction, lastFetched: riverLastFetched, error, message, totalFound } = useRiver();
  const { clearAllReports } = useReports();
  const { radius, setRadius, radiusOptions } = useRadius();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Accordion state for flood alert
  const [showFloodAlert, setShowFloodAlert] = useState(false);
  // Modal state for settings
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const refreshData = async () => {
    if (!location) return;
    
    await Promise.all([
      fetchWeather(location.lat, location.lng),
      fetchFloodPrediction(location.lat, location.lng, radius)
    ]);
    
    setLastUpdated(new Date());
  };

  // Fetch all data when location or radius changes (with debounce)
  useEffect(() => {
    if (!location) return;
    const now = Date.now();
    // Only fetch if missing or stale (older than 3 minutes)
    const shouldFetchWeather = !weather || !weatherLastFetched || now - weatherLastFetched > 180000;
    const shouldFetchRivers = !rivers.length || !riverLastFetched || now - riverLastFetched > 180000;
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      Promise.all([
        shouldFetchWeather ? fetchWeather(location.lat, location.lng) : Promise.resolve(),
        shouldFetchRivers ? fetchFloodPrediction(location.lat, location.lng, radius) : Promise.resolve()
      ]).catch(error => {
        console.error('Error fetching data:', error);
      });
    }, 1000);
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, radius]);

  // Auto-refresh when data becomes stale (only if we have fresh data to start with)
  useEffect(() => {
    if (!location) return;
    
    // Only start auto-refresh if we have fresh data (less than 3 minutes old)
    const now = Date.now();
    const hasFreshWeather = weather && weatherLastFetched && now - weatherLastFetched < 180000;
    const hasFreshRivers = rivers.length > 0 && riverLastFetched && now - riverLastFetched < 180000;
    
    // If we don't have fresh data, don't start auto-refresh (let the staleness check handle it)
    if (!hasFreshWeather && !hasFreshRivers) return;
    
    const interval = setInterval(() => {
      const currentTime = Date.now();
      const shouldFetchWeather = !weather || !weatherLastFetched || currentTime - weatherLastFetched > 180000;
      const shouldFetchRivers = !rivers.length || !riverLastFetched || currentTime - riverLastFetched > 180000;
      
      if (shouldFetchWeather || shouldFetchRivers) {
        Promise.all([
          shouldFetchWeather ? fetchWeather(location.lat, location.lng) : Promise.resolve(),
          shouldFetchRivers ? fetchFloodPrediction(location.lat, location.lng, radius) : Promise.resolve()
        ]).catch(error => {
          console.error('Error in auto-refresh:', error);
        });
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [location, radius, weather, weatherLastFetched, rivers, riverLastFetched, fetchWeather, fetchFloodPrediction]);

  const overallRisk = floodPredictions.length > 0 ? 
    floodPredictions.some(p => p.riskLevel === 'High') ? 'High' :
    floodPredictions.some(p => p.riskLevel === 'Medium') ? 'Medium' : 'Low' : 'Unknown';

  // Color for risk label
  const getRiskTextColor = (risk: string) => {
    switch (risk) {
      case 'High': return 'text-red-700';
      case 'Medium': return 'text-yellow-700';
      case 'Low': return 'text-green-700';
      default: return 'text-gray-700';
    }
  };

  // Flood Risk Alert Skeleton Loader
  const FloodRiskSkeleton: React.FC = () => (
    <div className="w-full flex items-center space-x-2">
      <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
    </div>
  );

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        {/* Header Section */}
        <div className="mb-4">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-2">Monitor river conditions and flood risks in your area</p>
            </div>
            
            {/* Actions - Inline for all viewports */}
            <div className="flex flex-wrap gap-3 items-center justify-center">
              {/* Location Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={getCurrentLocation}
                  className="bg-green-500 text-white rounded-lg p-3 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-green-400 min-w-[48px]"
                  aria-label="Get Current Location"
                  title="Get Current Location"
                  type="button"
                >
                  <MapPin className="w-5 h-5" />
                </button>
                
                {/* Radius Selector */}
                <div className="min-w-[120px]">
                  <select
                    value={radius}
                    onChange={(e) => setRadius(parseInt(e.target.value))}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white text-sm"
                    aria-label="Select search radius"
                  >
                    {radiusOptions.map((option) => (
                      <option key={option} value={option}>
                        {option} mile{option !== 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Settings and Refresh buttons */}
              <div className="flex items-center space-x-2">
                {/* Settings button */}
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="bg-gray-200 text-gray-700 rounded-lg p-3 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[48px]"
                  aria-label="Settings"
                  title="Settings"
                  type="button"
                >
                  <SettingsIcon className="w-5 h-5" />
                </button>
                
                {/* Refresh button */}
                <button
                  onClick={refreshData}
                  disabled={loading}
                  className="bg-blue-600 text-white rounded-lg p-3 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 min-w-[48px]"
                  aria-label="Refresh"
                  title="Refresh"
                  type="button"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error and Message Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Unable to fetch river data</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                {radius > 25 && (
                  <div className="mt-3">
                    <button
                      onClick={() => setRadius(25)}
                      className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-md hover:bg-red-200 transition-colors"
                    >
                      Try 25 mile radius instead
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        
        {/* Inline Weather Info */}
        <div className="mb-4">
          {/* Mobile: 2x2 Grid */}
          <div className="block sm:hidden">
            <div className="mobile-weather-grid grid grid-cols-2 gap-4" style={{display: 'grid', gridTemplateColumns: '1fr 1fr'}}>
              {/* Temperature */}
              <div className="mobile-weather-item flex items-center space-x-2 min-w-0 bg-gray-50 rounded-lg p-3 border">
                <Thermometer className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="font-bold text-lg text-gray-900">{Math.round(weather?.current?.main?.temp || 0)}°F</span>
              </div>
              {/* Weather Condition */}
              <div className="mobile-weather-item flex items-center space-x-2 min-w-0 bg-gray-50 rounded-lg p-3 border">
                <Cloud className="w-5 h-5 text-gray-600 flex-shrink-0" />
                <span className="font-medium text-gray-900 truncate">{weather?.current?.weather?.[0]?.main || 'Unknown'}</span>
              </div>
              {/* Wind */}
              <div className="mobile-weather-item flex items-center space-x-2 min-w-0 bg-gray-50 rounded-lg p-3 border">
                <Wind className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <span className="font-medium text-gray-900">{Math.round(weather?.current?.wind?.speed || 0)} mph</span>
              </div>
              {/* Humidity */}
              <div className="mobile-weather-item flex items-center space-x-2 min-w-0 bg-gray-50 rounded-lg p-3 border">
                <Droplets className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <span className="font-medium text-gray-900">{Math.round(weather?.current?.main?.humidity || 0)}%</span>
              </div>
            </div>
          </div>
          
          {/* Desktop: Inline */}
          <div className="hidden sm:flex sm:flex-row sm:gap-4 sm:items-start sm:justify-start sm:flex-wrap">
            <div className="flex items-center space-x-2 min-w-0">
              <Thermometer className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="font-bold text-lg">{Math.round(weather?.current?.main?.temp || 0)}°F</span>
              <span className="text-gray-500 text-sm">Feels like {Math.round(weather?.current?.main?.feels_like || 0)}°F</span>
            </div>
            <div className="flex items-center space-x-2 min-w-0">
              <Cloud className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <span className="font-medium truncate">{weather?.current?.weather?.[0]?.main || 'Unknown'}</span>
            </div>
            <div className="flex items-center space-x-2 min-w-0">
              <Wind className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <span className="font-medium">{Math.round(weather?.current?.wind?.speed || 0)} mph</span>
              <span className="text-gray-500 text-sm">Wind</span>
            </div>
            <div className="flex items-center space-x-2 min-w-0">
              <Droplets className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className="font-medium">{Math.round(weather?.current?.main?.humidity || 0)}%</span>
              <span className="text-gray-500 text-sm">Humidity</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full">
          {/* Flood Risk Alert Accordion */}
          <div className="bg-white rounded-lg shadow border mb-6">
            <button
              className="w-full flex items-center justify-between px-4 py-3 focus:outline-none"
              onClick={() => setShowFloodAlert(v => !v)}
              aria-expanded={showFloodAlert}
              aria-controls="flood-alert-accordion"
            >
              <span className="font-semibold text-lg text-gray-900 flex items-center">
                Flood Risk Alert
                {loading ? (
                  <span className="ml-2"><FloodRiskSkeleton /></span>
                ) : (
                  <span className={`ml-2 font-bold ${getRiskTextColor(overallRisk)}`}>- {overallRisk}</span>
                )}
              </span>
              {showFloodAlert ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            {showFloodAlert && (
              <div id="flood-alert-accordion" className="px-4 pb-4">
                {loading ? (
                  <div className="py-8 flex items-center justify-center">
                    <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
                  </div>
                ) : (
                  <FloodAlert risk={overallRisk} />
                )}
              </div>
            )}
          </div>
          
          {/* Two-Column Layout for Rivers and Reports */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Rivers Section - Left Column (3/5 width on desktop) */}
            <div className="lg:col-span-3 min-w-0 overflow-hidden">
              <RiverList 
                rivers={rivers} 
                floodPredictions={floodPredictions}
                loading={loading}
                loadingProgress={loadingProgress}
              />
            </div>

            {/* Reports Section - Right Column (2/5 width on desktop) */}
            <div className="lg:col-span-2 min-w-0">
              <ReportList />
            </div>
          </div>
        </div>

        {/* User Reports Section (Modal only) */}
        {/* Removed IssueReportModal import, state, and component */}
        {/* Reports are now integrated into the two-column layout above */}

        {/* Local Emergency Management Section */}
        <div className="mt-8">
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
        <div className="mt-8">
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

        {/* Last Updated */}
        {lastUpdated && (
          <div className="text-center text-gray-500 text-sm">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <Modal
        isOpen={isSettingsModalOpen}
        onRequestClose={() => setIsSettingsModalOpen(false)}
        contentLabel="Settings"
        className="modal-content"
        overlayClassName="modal-overlay"
      >
        <Settings onClose={() => setIsSettingsModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default Dashboard; 