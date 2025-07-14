const express = require('express');
const router = express.Router();
const axios = require('axios');

// USGS Water Services API
const USGS_BASE_URL = 'https://waterservices.usgs.gov/nwis';
// NWPS API for official flood stages
const NWPS_BASE_URL = 'https://api.water.noaa.gov/nwps/v1';

// Extract real historical data from USGS API response for a specific site
function extractHistoricalData(usgsResponse, parameterCode = '00065', siteId = null, days = 7) {
  try {
    if (!usgsResponse || !usgsResponse.value || !usgsResponse.value.timeSeries) {
      console.warn('[USGS] No timeSeries data in response');
      return [];
    }

    // Find the time series for the requested parameter AND specific site
    const timeSeries = usgsResponse.value.timeSeries.find(ts => {
      if (!ts || !ts.variable || !ts.variable.variableCode || !ts.variable.variableCode[0]) {
        return false;
      }
      
      const matchesParameter = ts.variable.variableCode[0].value === parameterCode;
      
      // If siteId is provided, also check that it matches
      if (siteId) {
        const matchesSite = ts.sourceInfo && ts.sourceInfo.siteCode && ts.sourceInfo.siteCode[0] && 
                           ts.sourceInfo.siteCode[0].value === siteId;
        return matchesParameter && matchesSite;
      }
      
      return matchesParameter;
    });

    if (!timeSeries || !timeSeries.values || !timeSeries.values[0] || !timeSeries.values[0].value) {
      console.warn(`[USGS] No data found for parameter ${parameterCode}${siteId ? ` at site ${siteId}` : ''}`);
      return [];
    }

    const values = timeSeries.values[0].value;
    const siteName = timeSeries.sourceInfo?.siteName || siteId || 'Unknown';
    console.log(`[USGS] Found ${values.length} historical data points for parameter ${parameterCode} at ${siteName}`);

    // Convert USGS data to our format and sort chronologically
    const allData = values.map(point => ({
      timestamp: point.dateTime,
      level: parseFloat(point.value) || 0,
      flow: 0 // We'll need to get flow data separately if needed
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    if (allData.length === 0) {
      console.warn(`[USGS] No valid data points found for ${siteName}`);
      return [];
    }

    // Sample data intelligently to show trends while keeping reasonable chart performance
    // For 7 days, we want roughly 50-100 points to show good trends without overwhelming the chart
    const targetPoints = Math.min(100, Math.max(20, allData.length));
    const sampleInterval = Math.max(1, Math.floor(allData.length / targetPoints));
    
    const sampledData = [];
    for (let i = 0; i < allData.length; i += sampleInterval) {
      sampledData.push(allData[i]);
    }
    
    // Always include the most recent data point
    if (sampledData[sampledData.length - 1].timestamp !== allData[allData.length - 1].timestamp) {
      sampledData.push(allData[allData.length - 1]);
    }

    console.log(`[USGS] Sampled ${sampledData.length} points from ${allData.length} total points for ${siteName}`);
    console.log(`[USGS] Data range for ${siteName}: ${Math.min(...allData.map(d => d.level)).toFixed(2)} - ${Math.max(...allData.map(d => d.level)).toFixed(2)} ft`);
    
    return sampledData;
  } catch (error) {
    console.error('[USGS] Error extracting historical data:', error);
    return [];
  }
}

// Legacy function - now just calls extractHistoricalData with empty response
// This is kept for backward compatibility but should be removed once all calls are updated
function generateHistoricalData(currentLevel, days = 7) {
  console.warn('[DEPRECATED] generateHistoricalData called - this should be replaced with real USGS data');
  return [];
}

// Get official NOAA flood stages from NWPS API
async function getOfficialFloodStages(usgsId) {
  try {
    const response = await axios.get(`${NWPS_BASE_URL}/gauges`, {
      params: {
        'site.usgs': usgsId
      },
      timeout: 8000,
      headers: {
        'User-Agent': 'RiverApp/1.0'
      }
    });

    if (response.data && response.data.features && response.data.features.length > 0) {
      const gauge = response.data.features[0];
      const properties = gauge.properties;
      
      if (properties.floodStages) {
        return {
          action: properties.floodStages.action || null,
          minor: properties.floodStages.minor || null,
          moderate: properties.floodStages.moderate || null,
          major: properties.floodStages.major || null,
          source: 'NOAA/NWS Official'
        };
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Calculate fallback flood stages if official ones aren't available
function calculateFallbackFloodStages(currentStage) {
  const baseStage = Math.max(currentStage, 1);
  return {
    action: Math.max(1, baseStage * 0.8),
    minor: Math.max(2, baseStage * 1.2),
    moderate: Math.max(3, baseStage * 1.5),
    major: Math.max(4, baseStage * 2.0),
    source: 'Calculated (Fallback)'
  };
}

// Get the best available flood stages (official preferred, fallback if needed)
async function getBestFloodStages(usgsId, currentStage) {
  const officialStages = await getOfficialFloodStages(usgsId);
  
  if (officialStages && officialStages.action && officialStages.minor && 
      officialStages.moderate && officialStages.major) {
    return officialStages;
  }
  
  return calculateFallbackFloodStages(currentStage);
}

// Get rivers within radius of location
router.get('/nearby/:lat/:lng/:radius', async (req, res) => {
  const { lat, lng, radius } = req.params;
  
  try {
    // Validate and constrain coordinates
    const latNum = Math.max(-90, Math.min(90, parseFloat(lat)));
    const lngNum = Math.max(-180, Math.min(180, parseFloat(lng)));
    const radiusNum = Math.max(0.1, Math.min(100, parseFloat(radius)));
    
    // Calculate bounding box with proper validation
    const latDelta = radiusNum / 69; // Approximate miles to degrees
    const lngDelta = radiusNum / (69 * Math.cos(latNum * Math.PI / 180));
    
    const minLat = Math.max(-90, latNum - latDelta);
    const maxLat = Math.min(90, latNum + latDelta);
    const minLng = Math.max(-180, lngNum - lngDelta);
    const maxLng = Math.min(180, lngNum + lngDelta);
    
    // Limit decimal places to 7 as required by USGS API
    const bBox = `${minLng.toFixed(7)},${minLat.toFixed(7)},${maxLng.toFixed(7)},${maxLat.toFixed(7)}`;
    console.log(`[USGS] Requesting: ${USGS_BASE_URL}/iv/?format=json&bBox=${bBox}&parameterCd=00060,00065&siteType=ST`);
    
    // Add retry logic for USGS API calls
    let response;
    let retries = 3;
    while (retries > 0) {
      try {
        response = await axios.get(
          `${USGS_BASE_URL}/iv/?format=json&bBox=${bBox}&parameterCd=00060,00065&siteType=ST&period=P7D`,
          {
            timeout: 10000, // 10 second timeout
            headers: {
              'User-Agent': 'RiverApp/1.0 (https://github.com/your-repo)'
            }
          }
        );
        break; // Success, exit retry loop
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw error; // Re-throw if all retries exhausted
        }
        console.log(`[USGS] Retry ${3 - retries}/3 due to: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }
    if (!response.data || !response.data.value || !Array.isArray(response.data.value.timeSeries)) {
      console.error('[USGS] Unexpected response structure:', response.data);
      return res.status(500).json({ error: 'USGS API returned unexpected structure', details: response.data });
    }
    // Process rivers with async flood stage lookup
    const riverPromises = response.data.value.timeSeries.map(async (station, idx) => {
      try {
        const currentStage = parseFloat(station.values[1]?.value[0]?.value || 0);
        const historicalData = extractHistoricalData(response.data, '00065', station.sourceInfo.siteCode[0].value, 7); // Use extractHistoricalData
        const floodStages = await getBestFloodStages(station.sourceInfo.siteCode[0].value, currentStage);
        
        return {
          id: station.sourceInfo.siteCode[0].value,
          name: station.sourceInfo.siteName,
          location: {
            lat: parseFloat(station.sourceInfo.geoLocation.geogLocation.latitude),
            lng: parseFloat(station.sourceInfo.geoLocation.geogLocation.longitude)
          },
          flow: station.values[0]?.value[0]?.value || 'N/A',
          stage: station.values[1]?.value[0]?.value || 'N/A',
          unit: station.variable.unit.unitCode,
          lastUpdated: station.values[0]?.value[0]?.dateTime || new Date().toISOString(),
          dataSource: 'USGS Real Data',
          historicalData: historicalData,
          floodStages: floodStages
        };
      } catch (parseError) {
        console.error(`[USGS] Error parsing station at index ${idx}:`, parseError, station);
        return null;
      }
    });
    
    const rivers = (await Promise.all(riverPromises)).filter(river => river !== null);
    
    // Remove duplicate rivers based on ID
    const uniqueRivers = rivers.filter((river, index, self) => 
      index === self.findIndex(r => r.id === river.id)
    );
    
    console.log(`[USGS] Found ${rivers.length} stations, ${uniqueRivers.length} unique rivers`);
    res.json(uniqueRivers);
  } catch (error) {
    if (error.response) {
      console.error('[USGS] API error:', error.response.status, error.response.data);
      res.status(500).json({ error: 'Failed to fetch USGS data', status: error.response.status, details: error.response.data });
    } else {
      console.error('[USGS] General error:', error.message);
      res.status(500).json({ error: 'Failed to fetch USGS data', message: error.message });
    }
  }
});

// Get detailed river flow data
router.get('/flow/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    
    const response = await axios.get(
      `${USGS_BASE_URL}/iv/?format=json&sites=${siteId}&parameterCd=00060,00065&period=P7D`
    );

    const flowData = response.data.value.timeSeries.map(station => ({
      siteId: station.sourceInfo.siteCode[0].value,
      siteName: station.sourceInfo.siteName,
      parameter: station.variable.variableName,
      unit: station.variable.unit.unitCode,
      values: station.values[0].value.map(point => ({
        time: point.dateTime,
        value: point.value,
        qualifiers: point.qualifiers
      }))
    }));

    res.json(flowData);
  } catch (error) {
    console.error('USGS flow API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch flow data' });
  }
});

// Get flood stage information
router.get('/flood-stage/:siteId', async (req, res) => {
  try {
    const { siteId } = req.params;
    
    const response = await axios.get(
      `${USGS_BASE_URL}/iv/?format=json&sites=${siteId}&parameterCd=00065&period=P7D`
    );

    const currentStage = parseFloat(response.data.value.timeSeries[0]?.values[0]?.value[0]?.value || 0);
    
    // Calculate realistic flood stages based on current stage
    const calculateFloodStages = (currentStage) => {
      const baseStage = Math.max(currentStage, 1);
      return {
        action: Math.max(1, baseStage * 0.8),
        minor: Math.max(2, baseStage * 1.2),
        moderate: Math.max(3, baseStage * 1.5),
        major: Math.max(4, baseStage * 2.0)
      };
    };

    const floodStages = calculateFloodStages(currentStage);

    const floodStatus = {
      currentStage,
      floodStages,
      status: currentStage >= floodStages.major ? 'Major Flood' :
              currentStage >= floodStages.moderate ? 'Moderate Flood' :
              currentStage >= floodStages.minor ? 'Minor Flood' :
              currentStage >= floodStages.action ? 'Action Stage' : 'Normal',
      risk: currentStage >= floodStages.moderate ? 'High' :
            currentStage >= floodStages.minor ? 'Medium' : 'Low'
    };

    res.json(floodStatus);
  } catch (error) {
    console.error('Flood stage API error:', error.message);
    res.status(500).json({ error: 'Failed to fetch flood stage data' });
  }
});

module.exports = router; 