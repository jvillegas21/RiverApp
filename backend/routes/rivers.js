const express = require('express');
const router = express.Router();
const axios = require('axios');

// USGS Water Services API
const USGS_BASE_URL = 'https://waterservices.usgs.gov/nwis';
// NWPS API for official flood stages
const NWPS_BASE_URL = 'https://api.water.noaa.gov/nwps/v1';

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
          `${USGS_BASE_URL}/iv/?format=json&bBox=${bBox}&parameterCd=00060,00065&siteType=ST`,
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
    // Group timeSeries by site ID since each parameter comes as separate entries
    const stationMap = new Map();
    
    response.data.value.timeSeries.forEach((timeSeries, idx) => {
      try {
        const siteId = timeSeries.sourceInfo.siteCode[0].value;
        const parameterCode = timeSeries.variable.variableCode[0].value;
        const parameterName = timeSeries.variable.variableName;
        
        if (!stationMap.has(siteId)) {
          stationMap.set(siteId, {
            id: siteId,
            name: timeSeries.sourceInfo.siteName,
            location: {
              lat: parseFloat(timeSeries.sourceInfo.geoLocation.geogLocation.latitude),
              lng: parseFloat(timeSeries.sourceInfo.geoLocation.geogLocation.longitude)
            },
            parameters: {}
          });
        }
        
        const station = stationMap.get(siteId);
        station.parameters[parameterCode] = {
          value: timeSeries.values[0]?.value[0]?.value || 'N/A',
          unit: timeSeries.variable.unit.unitCode,
          dateTime: timeSeries.values[0]?.value[0]?.dateTime || new Date().toISOString(),
          parameterName
        };
      } catch (parseError) {
        console.error(`[USGS] Error parsing timeSeries at index ${idx}:`, parseError, timeSeries);
      }
    });
    
    // Convert station map to rivers array
    const rivers = Array.from(stationMap.values()).map(station => {
      const flowParam = station.parameters['00060']; // Discharge (flow)
      const stageParam = station.parameters['00065']; // Gage height (stage)
      
      return {
        id: station.id,
        name: station.name,
        location: station.location,
        flow: flowParam?.value || 'N/A',
        stage: stageParam?.value || 'N/A',
        unit: flowParam?.unit || stageParam?.unit || 'N/A',
        lastUpdated: flowParam?.dateTime || stageParam?.dateTime || new Date().toISOString(),
        dataSource: 'USGS Real Data'
      };
    }).filter(river => river.flow !== 'N/A' || river.stage !== 'N/A'); // Only include stations with at least some data
    
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

    // Extract stage data properly from the USGS API response
    let currentStage = 0;
    const stageTimeSeries = response.data.value.timeSeries.find(ts => 
      ts.variable.variableCode[0].value === '00065'
    );
    if (stageTimeSeries && stageTimeSeries.values && stageTimeSeries.values[0] && 
        stageTimeSeries.values[0].value && stageTimeSeries.values[0].value[0] &&
        stageTimeSeries.values[0].value[0].value !== undefined && 
        stageTimeSeries.values[0].value[0].value !== null) {
      currentStage = parseFloat(stageTimeSeries.values[0].value[0].value);
    }

    // Get the best available flood stages (official preferred, fallback if needed)
    const floodStages = await getBestFloodStages(siteId, currentStage);

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