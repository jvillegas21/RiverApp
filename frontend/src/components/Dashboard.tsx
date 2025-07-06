import React, { useState, useEffect } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { useWeather } from '../contexts/WeatherContext';
import { useRiver } from '../contexts/RiverContext';
import LocationRadiusSelector from './LocationRadiusSelector';
import WeatherCard from './WeatherCard';
import RiverList from './RiverList';
import FloodAlert from './FloodAlert';
import { RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { location, getCurrentLocation } = useLocation();
  const { weather, fetchWeather } = useWeather();
  const { rivers, floodPredictions, loading, loadingProgress, fetchFloodPrediction } = useRiver();
  const [radius, setRadius] = useState(10); // miles
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshData = async () => {
    if (!location) return;
    
    await Promise.all([
      fetchWeather(location.lat, location.lng),
      fetchFloodPrediction(location.lat, location.lng, radius)
    ]);
    
    setLastUpdated(new Date());
  };

  useEffect(() => {
    if (location) {
      refreshData();
    }
  }, [location, radius]);

  const overallRisk = floodPredictions.length > 0 ? 
    floodPredictions.some(p => p.riskLevel === 'High') ? 'High' :
    floodPredictions.some(p => p.riskLevel === 'Medium') ? 'Medium' : 'Low' : 'Unknown';

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Flood Detection Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor river conditions and flood risks in your area</p>
        </div>
        
        <button
          onClick={refreshData}
          disabled={loading}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Location and Radius Selection */}
      <div className="grid grid-cols-1 gap-6">
        <LocationRadiusSelector radius={radius} onRadiusChange={setRadius} />
      </div>

      {/* Overall Risk Alert */}
      {overallRisk !== 'Unknown' && (
        <FloodAlert risk={overallRisk} />
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weather Section */}
        <div className="lg:col-span-1">
          <WeatherCard weather={weather} loading={loading} />
        </div>

        {/* Rivers Section */}
        <div className="lg:col-span-2">
          <RiverList 
            rivers={rivers} 
            floodPredictions={floodPredictions}
            loading={loading}
            loadingProgress={loadingProgress}
          />
        </div>
      </div>

      {/* Last Updated */}
      {lastUpdated && (
        <div className="text-center text-gray-500 text-sm">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default Dashboard; 