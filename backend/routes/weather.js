const express = require('express');
const router = express.Router();
const axios = require('axios');
const { sendSuccess, sendError, ERROR_CODES } = require('../utils/apiResponse');
const { validateCoordinates } = require('../utils/validation');

// NOAA/NWS API for all weather data
const NOAA_API_BASE = 'https://api.weather.gov';

// Simple cache to reduce API calls
const weatherCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting for NOAA API calls
const requestTimestamps = new Map();
const RATE_LIMIT_WINDOW = 1000; // 1 second between requests

// Get current weather for location using NOAA/NWS
router.get('/current/:lat/:lng', async (req, res) => {
  try {
    const { lat, lng } = req.params;
    
    // Validate coordinates
    const coordValidation = validateCoordinates(lat, lng);
    if (!coordValidation.isValid) {
      return sendError(res, 'Invalid coordinates', ERROR_CODES.VALIDATION_ERROR, coordValidation.errors, 400);
    }
    
    const latNum = coordValidation.lat;
    const lngNum = coordValidation.lng;
    
    // Check cache first
    const cacheKey = `weather_${latNum}_${lngNum}`;
    const cachedData = weatherCache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
      return sendSuccess(res, cachedData.data, 'Weather data (cached)', { 
        cached: true, 
        coordinates: { lat: latNum, lng: lngNum },
        dataSource: 'NOAA/NWS (cached)'
      });
    }
    
    // Rate limiting - ensure we don't make too many requests too quickly
    const now = Date.now();
    const lastRequest = requestTimestamps.get('weather');
    if (lastRequest && (now - lastRequest) < RATE_LIMIT_WINDOW) {
      return sendError(res, 'Too many requests. Please try again in a moment.', ERROR_CODES.RATE_LIMIT_EXCEEDED, null, 429);
    }
    requestTimestamps.set('weather', now);
    
    // Get points data to find nearest weather station
    const pointsResponse = await axios.get(
      `${NOAA_API_BASE}/points/${latNum},${lngNum}`,
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'RiverApp/1.0 (https://github.com/your-repo)'
        }
      }
    );
    
    // Get nearest observation station
    const stationsResponse = await axios.get(
      pointsResponse.data.properties.observationStations,
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'RiverApp/1.0 (https://github.com/your-repo)'
        }
      }
    );
    
    // Get latest observation from nearest station
    const nearestStation = stationsResponse.data.features[0];
    const observationResponse = await axios.get(
      `${NOAA_API_BASE}/stations/${nearestStation.properties.stationIdentifier}/observations/latest`,
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'RiverApp/1.0 (https://github.com/your-repo)'
        }
      }
    );
    
    // Get forecast data
    const forecastUrl = pointsResponse.data.properties.forecast;
    const forecastResponse = await axios.get(forecastUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'RiverApp/1.0 (https://github.com/your-repo)'
      }
    });
    
    // Transform NOAA data to match expected format
    const observation = observationResponse.data;
    const weatherData = {
      current: {
        main: {
          temp: observation.properties.temperature.value * 9/5 + 32, // Convert C to F
          humidity: observation.properties.relativeHumidity.value,
          pressure: observation.properties.barometricPressure?.value || 1013
        },
        weather: [{
          main: observation.properties.textDescription || 'Unknown',
          description: observation.properties.textDescription || 'Unknown',
          icon: getWeatherIcon(observation.properties.textDescription)
        }],
        wind: {
          speed: observation.properties.windSpeed?.value * 2.237 || 0, // Convert m/s to mph
          deg: observation.properties.windDirection?.value || 0
        },
        rain: {
          '1h': observation.properties.precipitationLastHour?.value || 0
        }
      },
      forecast: forecastResponse.data,
      location: { lat: latNum, lng: lngNum }
    };

    // Cache the result
    weatherCache.set(cacheKey, {
      data: weatherData,
      timestamp: Date.now()
    });

    const meta = {
      coordinates: { lat: latNum, lng: lngNum },
      dataSource: 'NOAA/NWS Real-time',
      cached: false,
      station: nearestStation?.properties?.stationIdentifier
    };

    return sendSuccess(res, weatherData, 'Current weather data', meta);
  } catch (error) {
    console.error('NOAA Weather API error:', error.message);
    
    // Handle specific error types
    if (error.response?.status === 429) {
      return sendError(res, 'Weather service is temporarily unavailable due to high demand. Please try again in a moment.', ERROR_CODES.RATE_LIMIT_EXCEEDED, null, 429);
    } else if (error.code === 'ECONNABORTED') {
      return sendError(res, 'Weather service request timed out. Please try again.', ERROR_CODES.EXTERNAL_API_TIMEOUT, null, 408);
    } else if (error.response?.status >= 500) {
      return sendError(res, 'Weather service is temporarily unavailable', ERROR_CODES.EXTERNAL_API_ERROR, error.response?.data, 502);
    } else {
      return sendError(res, 'Failed to fetch weather data', ERROR_CODES.EXTERNAL_API_ERROR, error.message, 500);
    }
  }
});

// Helper function to map NOAA weather descriptions to icon codes
function getWeatherIcon(description) {
  if (!description) return '01d';
  
  const desc = description.toLowerCase();
  if (desc.includes('clear')) return '01d';
  if (desc.includes('cloud')) return '03d';
  if (desc.includes('rain')) return '10d';
  if (desc.includes('snow')) return '13d';
  if (desc.includes('thunder')) return '11d';
  if (desc.includes('fog') || desc.includes('mist')) return '50d';
  return '01d';
}

// Get precipitation forecast
router.get('/precipitation/:lat/:lng', async (req, res) => {
  try {
    const { lat, lng } = req.params;
    
    // Validate coordinates
    const coordValidation = validateCoordinates(lat, lng);
    if (!coordValidation.isValid) {
      return sendError(res, 'Invalid coordinates', ERROR_CODES.VALIDATION_ERROR, coordValidation.errors, 400);
    }
    
    const latNum = coordValidation.lat;
    const lngNum = coordValidation.lng;
    
    // Rate limiting for precipitation requests
    const now = Date.now();
    const lastRequest = requestTimestamps.get('precipitation');
    if (lastRequest && (now - lastRequest) < RATE_LIMIT_WINDOW) {
      return sendError(res, 'Too many requests. Please try again in a moment.', ERROR_CODES.RATE_LIMIT_EXCEEDED, null, 429);
    }
    requestTimestamps.set('precipitation', now);
    
    // First get the forecast URL for the location
    const pointsResponse = await axios.get(
      `${NOAA_API_BASE}/points/${latNum},${lngNum}`,
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'RiverApp/1.0 (https://github.com/your-repo)'
        }
      }
    );

    const forecastUrl = pointsResponse.data.properties.forecast;
    const response = await axios.get(forecastUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'RiverApp/1.0 (https://github.com/your-repo)'
      }
    });

    const precipitationData = response.data.properties.periods
      .filter(period => period.shortForecast.toLowerCase().includes('rain') || 
                       period.shortForecast.toLowerCase().includes('storm'))
      .map(period => ({
        time: period.startTime,
        forecast: period.shortForecast,
        precipitation: period.probabilityOfPrecipitation?.value || 0
      }));

    const meta = {
      coordinates: { lat: latNum, lng: lngNum },
      dataSource: 'NOAA/NWS Forecast',
      periods: precipitationData.length
    };

    return sendSuccess(res, precipitationData, 'Precipitation forecast data', meta);
  } catch (error) {
    console.error('Precipitation API error:', error.message);
    
    // Handle specific error types
    if (error.response?.status === 429) {
      return sendError(res, 'Weather service is temporarily unavailable due to high demand. Please try again in a moment.', ERROR_CODES.RATE_LIMIT_EXCEEDED, null, 429);
    } else if (error.code === 'ECONNABORTED') {
      return sendError(res, 'Weather service request timed out. Please try again.', ERROR_CODES.EXTERNAL_API_TIMEOUT, null, 408);
    } else if (error.response?.status >= 500) {
      return sendError(res, 'Weather service is temporarily unavailable', ERROR_CODES.EXTERNAL_API_ERROR, error.response?.data, 502);
    } else {
      return sendError(res, 'Failed to fetch precipitation data', ERROR_CODES.EXTERNAL_API_ERROR, error.message, 500);
    }
  }
});

module.exports = router; 