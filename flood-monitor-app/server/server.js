const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// USGS Water Services API base URL
const USGS_BASE_URL = 'https://waterservices.usgs.gov/nwis/iv/';

// Get water level data for nearby stations
app.get('/api/water-levels', async (req, res) => {
  try {
    const { lat, lon, radius = 50 } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Convert radius from miles to degrees (approximate)
    const radiusInDegrees = radius / 69;
    
    // Calculate bounding box
    const minLat = parseFloat(lat) - radiusInDegrees;
    const maxLat = parseFloat(lat) + radiusInDegrees;
    const minLon = parseFloat(lon) - radiusInDegrees;
    const maxLon = parseFloat(lon) + radiusInDegrees;

    // Fetch data from USGS
    const response = await axios.get(USGS_BASE_URL, {
      params: {
        format: 'json',
        bBox: `${minLon},${minLat},${maxLon},${maxLat}`,
        parameterCd: '00060,00065', // Discharge and Gage height
        siteType: 'ST', // Stream sites
        siteStatus: 'active'
      }
    });

    const sites = response.data.value.timeSeries || [];
    
    // Process and format the data
    const processedSites = processSiteData(sites);
    
    res.json({
      success: true,
      data: processedSites,
      location: { lat, lon },
      radius
    });

  } catch (error) {
    console.error('Error fetching water data:', error);
    res.status(500).json({ error: 'Failed to fetch water level data' });
  }
});

// Get historical data for trend analysis
app.get('/api/water-trends/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    const { days = 7 } = req.query;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const response = await axios.get(USGS_BASE_URL, {
      params: {
        format: 'json',
        sites: siteId,
        startDT: startDate.toISOString(),
        endDT: endDate.toISOString(),
        parameterCd: '00060,00065',
        siteStatus: 'active'
      }
    });

    const timeSeries = response.data.value.timeSeries || [];
    const trends = analyzeTrends(timeSeries);
    
    res.json({
      success: true,
      siteId,
      trends,
      rawData: timeSeries
    });

  } catch (error) {
    console.error('Error fetching trend data:', error);
    res.status(500).json({ error: 'Failed to fetch trend data' });
  }
});

// Get flood alerts based on water levels
app.get('/api/flood-alerts', async (req, res) => {
  try {
    const { lat, lon, radius = 50 } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // First get nearby water levels
    const waterLevelsResponse = await axios.get(`http://localhost:${PORT}/api/water-levels`, {
      params: { lat, lon, radius }
    });

    const sites = waterLevelsResponse.data.data;
    const alerts = [];

    // Analyze each site for potential flooding
    for (const site of sites) {
      const alert = analyzeFloodRisk(site);
      if (alert.risk !== 'low') {
        alerts.push({
          ...site,
          alert
        });
      }
    }

    res.json({
      success: true,
      alerts,
      totalSites: sites.length,
      alertCount: alerts.length
    });

  } catch (error) {
    console.error('Error generating flood alerts:', error);
    res.status(500).json({ error: 'Failed to generate flood alerts' });
  }
});

// Helper function to process site data
function processSiteData(timeSeries) {
  const siteMap = new Map();

  timeSeries.forEach(ts => {
    const siteCode = ts.sourceInfo.siteCode[0].value;
    const siteName = ts.sourceInfo.siteName;
    const location = ts.sourceInfo.geoLocation.geogLocation;
    
    if (!siteMap.has(siteCode)) {
      siteMap.set(siteCode, {
        siteId: siteCode,
        name: siteName,
        latitude: location.latitude,
        longitude: location.longitude,
        measurements: {}
      });
    }

    const site = siteMap.get(siteCode);
    const variable = ts.variable.variableDescription;
    const unit = ts.variable.unit.unitCode;
    const values = ts.values[0].value;
    
    if (values.length > 0) {
      const latestValue = values[values.length - 1];
      site.measurements[variable] = {
        value: parseFloat(latestValue.value),
        unit: unit,
        timestamp: latestValue.dateTime,
        trend: calculateTrend(values)
      };
    }
  });

  return Array.from(siteMap.values());
}

// Helper function to calculate trend
function calculateTrend(values) {
  if (values.length < 2) return 'stable';
  
  const recentValues = values.slice(-10); // Last 10 readings
  const firstValue = parseFloat(recentValues[0].value);
  const lastValue = parseFloat(recentValues[recentValues.length - 1].value);
  
  const percentChange = ((lastValue - firstValue) / firstValue) * 100;
  
  if (percentChange > 10) return 'rising';
  if (percentChange < -10) return 'falling';
  return 'stable';
}

// Helper function to analyze trends over time
function analyzeTrends(timeSeries) {
  const trends = {};
  
  timeSeries.forEach(ts => {
    const variable = ts.variable.variableDescription;
    const values = ts.values[0].value;
    
    if (values.length > 0) {
      const hourlyAvg = calculateHourlyAverages(values);
      const dailyAvg = calculateDailyAverages(values);
      
      trends[variable] = {
        current: parseFloat(values[values.length - 1].value),
        hourlyAverages: hourlyAvg,
        dailyAverages: dailyAvg,
        overallTrend: determineOverallTrend(dailyAvg)
      };
    }
  });
  
  return trends;
}

// Helper function to calculate hourly averages
function calculateHourlyAverages(values) {
  const hourlyData = {};
  
  values.forEach(v => {
    const date = new Date(v.dateTime);
    const hourKey = `${date.toISOString().split('T')[0]}_${date.getHours()}`;
    
    if (!hourlyData[hourKey]) {
      hourlyData[hourKey] = { sum: 0, count: 0 };
    }
    
    hourlyData[hourKey].sum += parseFloat(v.value);
    hourlyData[hourKey].count += 1;
  });
  
  return Object.entries(hourlyData).map(([key, data]) => ({
    hour: key,
    average: data.sum / data.count
  }));
}

// Helper function to calculate daily averages
function calculateDailyAverages(values) {
  const dailyData = {};
  
  values.forEach(v => {
    const date = new Date(v.dateTime).toISOString().split('T')[0];
    
    if (!dailyData[date]) {
      dailyData[date] = { sum: 0, count: 0, max: -Infinity, min: Infinity };
    }
    
    const value = parseFloat(v.value);
    dailyData[date].sum += value;
    dailyData[date].count += 1;
    dailyData[date].max = Math.max(dailyData[date].max, value);
    dailyData[date].min = Math.min(dailyData[date].min, value);
  });
  
  return Object.entries(dailyData).map(([date, data]) => ({
    date,
    average: data.sum / data.count,
    max: data.max,
    min: data.min
  }));
}

// Helper function to determine overall trend
function determineOverallTrend(dailyAverages) {
  if (dailyAverages.length < 2) return 'insufficient_data';
  
  const firstAvg = dailyAverages[0].average;
  const lastAvg = dailyAverages[dailyAverages.length - 1].average;
  const percentChange = ((lastAvg - firstAvg) / firstAvg) * 100;
  
  if (percentChange > 20) return 'significantly_rising';
  if (percentChange > 10) return 'rising';
  if (percentChange < -20) return 'significantly_falling';
  if (percentChange < -10) return 'falling';
  return 'stable';
}

// Helper function to analyze flood risk
function analyzeFloodRisk(site) {
  let risk = 'low';
  let reasons = [];
  
  // Check gage height if available
  if (site.measurements['Gage height, feet']) {
    const gageHeight = site.measurements['Gage height, feet'];
    if (gageHeight.trend === 'rising') {
      risk = 'medium';
      reasons.push('Water level is rising');
    }
    
    // These thresholds would need to be calibrated per location
    if (gageHeight.value > 10) {
      risk = 'high';
      reasons.push('Water level is above normal threshold');
    }
  }
  
  // Check discharge if available
  if (site.measurements['Discharge, cubic feet per second']) {
    const discharge = site.measurements['Discharge, cubic feet per second'];
    if (discharge.trend === 'rising' && discharge.value > 1000) {
      risk = risk === 'high' ? 'high' : 'medium';
      reasons.push('High water flow detected');
    }
  }
  
  return {
    risk,
    reasons,
    timestamp: new Date().toISOString()
  };
}

app.listen(PORT, () => {
  console.log(`Flood monitoring server running on port ${PORT}`);
});