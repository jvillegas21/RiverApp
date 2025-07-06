const express = require('express');
const router = express.Router();
const axios = require('axios');

// USGS Water Services API
const USGS_BASE_URL = 'https://waterservices.usgs.gov/nwis';

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
    const rivers = response.data.value.timeSeries.map((station, idx) => {
      try {
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
          dataSource: 'USGS Real Data'
        };
      } catch (parseError) {
        console.error(`[USGS] Error parsing station at index ${idx}:`, parseError, station);
        return null;
      }
    }).filter(river => river !== null);
    res.json(rivers);
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

    // Get flood stage thresholds (this would typically come from a separate endpoint)
    const floodStages = {
      action: 10.0, // feet
      minor: 12.0,
      moderate: 15.0,
      major: 18.0
    };

    const currentStage = parseFloat(response.data.value.timeSeries[0]?.values[0]?.value[0]?.value || 0);

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