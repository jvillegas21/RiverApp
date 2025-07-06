const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
const cron = require('node-cron');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ port: 8080 });

// Store active monitoring locations
const activeMonitoringLocations = new Map();

// Utility function to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// API Routes

// Get nearby USGS monitoring sites
app.get('/api/nearby-sites', async (req, res) => {
  try {
    const { lat, lon, radius = 50 } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Calculate bounding box for the area
    const latDelta = radius / 111; // Approximate km per degree
    const lonDelta = radius / (111 * Math.cos(lat * Math.PI / 180));
    
    const bbox = {
      north: parseFloat(lat) + latDelta,
      south: parseFloat(lat) - latDelta,
      east: parseFloat(lon) + lonDelta,
      west: parseFloat(lon) - lonDelta
    };

    // Query USGS sites within bounding box
    const usgsUrl = `https://waterservices.usgs.gov/nwis/site/`;
    const response = await axios.get(usgsUrl, {
      params: {
        format: 'json',
        bBox: `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`,
        siteType: 'ST',
        hasDataTypeCd: '00065,00060', // Gage height and discharge
        siteStatus: 'active'
      }
    });

    const sites = response.data.value.timeSeries || [];
    const nearbySites = sites
      .filter(site => {
        const siteInfo = site.sourceInfo;
        const distance = calculateDistance(
          lat, lon, 
          siteInfo.geoLocation.geogLocation.latitude,
          siteInfo.geoLocation.geogLocation.longitude
        );
        return distance <= radius;
      })
      .map(site => ({
        id: site.sourceInfo.siteCode[0].value,
        name: site.sourceInfo.siteName,
        latitude: site.sourceInfo.geoLocation.geogLocation.latitude,
        longitude: site.sourceInfo.geoLocation.geogLocation.longitude,
        distance: calculateDistance(
          lat, lon,
          site.sourceInfo.geoLocation.geogLocation.latitude,
          site.sourceInfo.geoLocation.geogLocation.longitude
        )
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10); // Limit to 10 closest sites

    res.json({ sites: nearbySites });
  } catch (error) {
    console.error('Error fetching nearby sites:', error);
    res.status(500).json({ error: 'Failed to fetch nearby monitoring sites' });
  }
});

// Get current water levels for a site
app.get('/api/water-levels/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const { days = 7 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const usgsUrl = `https://waterservices.usgs.gov/nwis/iv/`;
    const response = await axios.get(usgsUrl, {
      params: {
        format: 'json',
        sites: siteId,
        startDT: startDate.toISOString().split('T')[0],
        endDT: endDate.toISOString().split('T')[0],
        parameterCd: '00065,00060', // Gage height and discharge
        siteStatus: 'active'
      }
    });

    const timeSeries = response.data.value.timeSeries || [];
    const waterLevels = timeSeries.map(series => ({
      parameter: series.variable.variableDescription,
      unit: series.variable.unit.unitCode,
      values: series.values[0].value.map(v => ({
        dateTime: v.dateTime,
        value: parseFloat(v.value),
        qualifiers: v.qualifiers
      }))
    }));

    res.json({ waterLevels, siteId });
  } catch (error) {
    console.error('Error fetching water levels:', error);
    res.status(500).json({ error: 'Failed to fetch water level data' });
  }
});

// Get flood risk assessment
app.get('/api/flood-risk', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Get elevation data
    const elevationResponse = await axios.get(
      `https://api.opentopodata.org/v1/ned10m?locations=${lat},${lon}`
    );
    
    const elevation = elevationResponse.data.results[0].elevation;
    
    // Get nearby water bodies and calculate risk
    const nearbyResponse = await axios.get(`http://localhost:${PORT}/api/nearby-sites`, {
      params: { lat, lon, radius: 25 }
    });
    
    const sites = nearbyResponse.data.sites || [];
    let riskLevel = 'LOW';
    let riskFactors = [];
    
    if (elevation < 50) {
      riskLevel = 'MODERATE';
      riskFactors.push('Low elevation area');
    }
    
    if (sites.length > 3) {
      riskLevel = 'HIGH';
      riskFactors.push('Multiple water bodies nearby');
    }
    
    if (sites.some(site => site.distance < 5)) {
      riskLevel = 'HIGH';
      riskFactors.push('Very close to water source');
    }

    res.json({
      riskLevel,
      riskFactors,
      elevation,
      nearbyWaterBodies: sites.length,
      closestWaterBody: sites[0] || null
    });
  } catch (error) {
    console.error('Error assessing flood risk:', error);
    res.status(500).json({ error: 'Failed to assess flood risk' });
  }
});

// Get NOAA flood forecasts
app.get('/api/flood-forecast', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Note: This is a simplified implementation
    // In production, you would integrate with NOAA's National Water Prediction Service API
    res.json({
      forecast: {
        riskLevel: 'LOW',
        confidence: 0.85,
        timeframe: '7-day',
        precipitationForecast: 'Light to moderate rainfall expected',
        recommendation: 'Monitor conditions, no immediate action required'
      }
    });
  } catch (error) {
    console.error('Error fetching flood forecast:', error);
    res.status(500).json({ error: 'Failed to fetch flood forecast' });
  }
});

// WebSocket handling for real-time updates
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'monitor' && data.location) {
        activeMonitoringLocations.set(ws, data.location);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    activeMonitoringLocations.delete(ws);
    console.log('WebSocket connection closed');
  });
});

// Broadcast water level updates to connected clients
function broadcastWaterLevelUpdate(siteId, data) {
  const message = JSON.stringify({
    type: 'water-level-update',
    siteId,
    data
  });
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Periodic monitoring task (runs every 15 minutes)
cron.schedule('*/15 * * * *', async () => {
  console.log('Running periodic water level monitoring...');
  
  // Get all unique monitoring locations
  const locations = Array.from(activeMonitoringLocations.values());
  
  for (const location of locations) {
    try {
      const response = await axios.get(`http://localhost:${PORT}/api/nearby-sites`, {
        params: { lat: location.lat, lon: location.lon, radius: 25 }
      });
      
      const sites = response.data.sites || [];
      
      for (const site of sites.slice(0, 3)) { // Monitor top 3 closest sites
        const waterLevelResponse = await axios.get(
          `http://localhost:${PORT}/api/water-levels/${site.id}`,
          { params: { days: 1 } }
        );
        
        broadcastWaterLevelUpdate(site.id, waterLevelResponse.data);
      }
    } catch (error) {
      console.error(`Error monitoring location ${location.lat}, ${location.lon}:`, error);
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket server is running on port 8080`);
});