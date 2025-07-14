const express = require('express');
const router = express.Router();
const axios = require('axios');

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
    
    // Check cache first
    const cacheKey = `weather_${lat}_${lng}`;
    const cachedData = weatherCache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
      return res.json(cachedData.data);
    }
    
    // Rate limiting - ensure we don't make too many requests too quickly
    const now = Date.now();
    const lastRequest = requestTimestamps.get('weather');
    if (lastRequest && (now - lastRequest) < RATE_LIMIT_WINDOW) {
      return res.status(429).json({ error: 'Too many requests. Please try again in a moment.' });
    }
    requestTimestamps.set('weather', now);
    
    // Get points data to find nearest weather station
    const pointsResponse = await axios.get(
      `${NOAA_API_BASE}/points/${lat},${lng}`,
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
      location: { lat: parseFloat(lat), lng: parseFloat(lng) }
    };

    // Cache the result
    weatherCache.set(cacheKey, {
      data: weatherData,
      timestamp: Date.now()
    });

    res.json(weatherData);
  } catch (error) {
    console.error('NOAA Weather API error:', error.message);
    
    // Handle specific error types
    if (error.response?.status === 429) {
      res.status(429).json({ error: 'Weather service is temporarily unavailable due to high demand. Please try again in a moment.' });
    } else if (error.code === 'ECONNABORTED') {
      res.status(408).json({ error: 'Weather service request timed out. Please try again.' });
    } else {
      res.status(500).json({ error: 'Failed to fetch weather data: ' + error.message });
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
    
    // Rate limiting for precipitation requests
    const now = Date.now();
    const lastRequest = requestTimestamps.get('precipitation');
    if (lastRequest && (now - lastRequest) < RATE_LIMIT_WINDOW) {
      return res.status(429).json({ error: 'Too many requests. Please try again in a moment.' });
    }
    requestTimestamps.set('precipitation', now);
    
    // First get the forecast URL for the location
    const pointsResponse = await axios.get(
      `${NOAA_API_BASE}/points/${lat},${lng}`,
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

    res.json(precipitationData);
  } catch (error) {
    console.error('Precipitation API error:', error.message);
    
    // Handle specific error types
    if (error.response?.status === 429) {
      res.status(429).json({ error: 'Weather service is temporarily unavailable due to high demand. Please try again in a moment.' });
    } else if (error.code === 'ECONNABORTED') {
      res.status(408).json({ error: 'Weather service request timed out. Please try again.' });
    } else {
      res.status(500).json({ error: 'Failed to fetch precipitation data: ' + error.message });
    }
  }
});

module.exports = router; 