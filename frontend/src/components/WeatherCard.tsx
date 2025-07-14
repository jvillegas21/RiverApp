import React from 'react';
import { Cloud, Thermometer, Wind, Droplets } from 'lucide-react';

interface WeatherCardProps {
  weather: any;
  loading: boolean;
  compact?: boolean;
}

const WeatherCard: React.FC<WeatherCardProps> = ({ weather, loading, compact }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Weather</h2>
        <p className="text-gray-500">No weather data available</p>
      </div>
    );
  }

  const current = weather.current;
  const forecast = weather.forecast?.properties?.periods?.[0];

  return (
    <div className={compact ? "bg-white rounded-lg shadow p-3 text-sm" : "bg-white rounded-lg shadow-md p-6"}>
      <h2 className={compact ? "text-lg font-semibold mb-2" : "text-xl font-semibold mb-4"}>Current Weather</h2>
      
      {/* Responsive weather values layout */}
      <div className={compact ? "space-y-2" : "grid grid-cols-2 gap-4 sm:flex sm:flex-row sm:space-x-6 sm:space-y-0 mb-4"}>
        {/* Temperature */}
        <div className="flex items-center space-x-3">
          <Thermometer className={compact ? "w-4 h-4 text-red-500" : "w-5 h-5 text-red-500"} />
          <div>
            <p className={compact ? "text-lg font-bold" : "text-2xl font-bold"}>{Math.round(current?.main?.temp || 0)}°F</p>
            <p className={compact ? "text-xs text-gray-600" : "text-sm text-gray-600"}>Feels like {Math.round(current?.main?.feels_like || 0)}°F</p>
          </div>
        </div>
        {/* Weather Description */}
        <div className="flex items-center space-x-3">
          <Cloud className={compact ? "w-4 h-4 text-gray-500" : "w-5 h-5 text-gray-500"} />
          <div>
            <p className={compact ? "font-medium text-sm" : "font-medium"}>{current?.weather?.[0]?.main || 'Unknown'}</p>
            <p className={compact ? "text-xs text-gray-600" : "text-sm text-gray-600"}>{current?.weather?.[0]?.description || ''}</p>
          </div>
        </div>
        {/* Wind */}
        <div className="flex items-center space-x-3">
          <Wind className={compact ? "w-4 h-4 text-blue-500" : "w-5 h-5 text-blue-500"} />
          <div>
            <p className={compact ? "font-medium text-sm" : "font-medium"}>{Math.round(current?.wind?.speed || 0)} mph</p>
            <p className={compact ? "text-xs text-gray-600" : "text-sm text-gray-600"}>Wind Speed</p>
          </div>
        </div>
        {/* Humidity */}
        <div className="flex items-center space-x-3">
          <Droplets className={compact ? "w-4 h-4 text-blue-400" : "w-5 h-5 text-blue-400"} />
          <div>
            <p className={compact ? "font-medium text-sm" : "font-medium"}>{Math.round(current?.main?.humidity || 0)}%</p>
            <p className={compact ? "text-xs text-gray-600" : "text-sm text-gray-600"}>Humidity</p>
          </div>
        </div>

        {/* Forecast */}
        {forecast && !compact && (
          <div className="border-t pt-4">
            <h3 className="font-medium mb-2">Today's Forecast</h3>
            <p className="text-sm text-gray-600">{forecast.shortForecast}</p>
            {forecast.probabilityOfPrecipitation?.value && (
              <p className="text-sm text-blue-600 mt-1">
                {forecast.probabilityOfPrecipitation.value}% chance of precipitation
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherCard; 