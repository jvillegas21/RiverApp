const express = require('express');
const router = express.Router();
const axios = require('axios');
const { sendSuccess, sendError, ERROR_CODES } = require('../utils/apiResponse');
const { validateCoordinates, validateRadius, validateRequestBody } = require('../utils/validation');

// USGS Water Services API
const USGS_BASE_URL = 'https://waterservices.usgs.gov/nwis';
// NWPS API for official flood stages
const NWPS_BASE_URL = 'https://api.water.noaa.gov/nwps/v1';

// Flood prediction and risk assessment
router.post('/predict', async (req, res) => {
  try {
    // Validate request body
    const schema = {
      required: ['lat', 'lng', 'radius', 'rivers'],
      fields: {
        lat: { type: 'number' },
        lng: { type: 'number' },
        radius: { type: 'number' },
        rivers: { type: 'array' }
      }
    };
    
    const bodyValidation = validateRequestBody(req.body, schema);
    if (!bodyValidation.isValid) {
      return sendError(res, 'Invalid request data', ERROR_CODES.VALIDATION_ERROR, bodyValidation.errors, 400);
    }
    
    const { lat, lng, radius, rivers } = bodyValidation.data;
    
    // Validate coordinates and radius
    const coordValidation = validateCoordinates(lat, lng);
    const radiusValidation = validateRadius(radius);
    
    if (!coordValidation.isValid) {
      return sendError(res, 'Invalid coordinates', ERROR_CODES.VALIDATION_ERROR, coordValidation.errors, 400);
    }
    
    if (!radiusValidation.isValid) {
      return sendError(res, 'Invalid radius', ERROR_CODES.VALIDATION_ERROR, radiusValidation.errors, 400);
    }
    
    const latNum = coordValidation.lat;
    const lngNum = coordValidation.lng;
    const radiusNum = radiusValidation.value;
    
    // Get current weather from NOAA/NWS
    let weatherResponse;
    try {
      // Get points data to find nearest weather station
      const pointsResponse = await axios.get(
        `https://api.weather.gov/points/${lat},${lng}`,
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
        `https://api.weather.gov/stations/${nearestStation.properties.stationIdentifier}/observations/latest`,
        {
          timeout: 10000,
          headers: {
            'User-Agent': 'RiverApp/1.0 (https://github.com/your-repo)'
          }
        }
      );
      
      // Transform NOAA data to match expected format
      const observation = observationResponse.data;
      weatherResponse = {
        data: {
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
        }
      };
    } catch (weatherError) {
      console.error('NOAA Weather API error in flood prediction:', weatherError.message);
      throw new Error('Failed to fetch weather data: ' + weatherError.message);
    }
    
    // Get real precipitation data from NOAA API
    let precipitationData = [];
    try {
      const noaaResponse = await axios.get(
        `https://api.weather.gov/points/${lat},${lng}`,
        {
          timeout: 10000,
          headers: {
            'User-Agent': 'RiverApp/1.0 (https://github.com/your-repo)'
          }
        }
      );
      
      const forecastUrl = noaaResponse.data.properties.forecast;
      const forecastResponse = await axios.get(forecastUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'RiverApp/1.0 (https://github.com/your-repo)'
        }
      });
      
      precipitationData = forecastResponse.data.properties.periods
        .filter(period => period.shortForecast.toLowerCase().includes('rain') || 
                         period.shortForecast.toLowerCase().includes('storm'))
        .map(period => ({
          time: period.startTime,
          forecast: period.shortForecast,
          precipitation: period.probabilityOfPrecipitation?.value || 0
        }));
    } catch (noaaError) {
      console.error('NOAA precipitation API error:', noaaError.message);
      throw new Error('Failed to fetch precipitation data: ' + noaaError.message);
    }

    // Analyze each river for flood risk using direct USGS calls
    const floodPredictions = await Promise.all(
      rivers.map(async (river) => {
        try {
          // Add retry logic for individual river API calls
          let flowResponse;
          let retries = 3;
          while (retries > 0) {
            try {
              flowResponse = await axios.get(
                `${USGS_BASE_URL}/iv/?format=json&sites=${river.id}&parameterCd=00060,00065&period=P7D`,
                {
                  timeout: 8000, // 8 second timeout for individual river calls
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
              console.log(`River ${river.id} retry ${3 - retries}/3 due to: ${error.message}`);
              await new Promise(resolve => setTimeout(resolve, 500)); // Wait 0.5 seconds before retry
            }
          }
          
          // Get real flood stage data from USGS - use the same call as flow since it has both parameters
          // Extract stage data from the combined response
          let currentStage = 0;
          const stageTimeSeries = flowResponse.data.value.timeSeries.find(ts => 
            ts.variable.variableCode[0].value === '00065'
          );
          if (stageTimeSeries && stageTimeSeries.values && stageTimeSeries.values[0] && 
              stageTimeSeries.values[0].value && stageTimeSeries.values[0].value[0] &&
              stageTimeSeries.values[0].value[0].value !== undefined && 
              stageTimeSeries.values[0].value[0].value !== null) {
            currentStage = parseFloat(stageTimeSeries.values[0].value[0].value);
          }
          
          // Get the best available flood stages (official preferred, fallback if needed)
          const floodStages = await getBestFloodStages(river.id, currentStage);
          
          const floodStageData = {
            currentStage,
            floodStages,
            status: currentStage >= floodStages.major ? 'Major Flood' :
                    currentStage >= floodStages.moderate ? 'Moderate Flood' :
                    currentStage >= floodStages.minor ? 'Minor Flood' :
                    currentStage >= floodStages.action ? 'Action Stage' : 'Normal'
          };

          return analyzeFloodRisk(river, flowResponse.data, floodStageData, precipitationData);
        } catch (riverError) {
          console.error(`River ${river.id} API error:`, riverError.message);
          throw new Error(`Failed to fetch data for river ${river.id}: ${riverError.message}`);
        }
      })
    );

    // Calculate overall flood risk for the area
    const overallRisk = calculateOverallRisk(floodPredictions, precipitationData);

    const floodPredictionResult = {
      rivers: floodPredictions,
      overallRisk,
      weather: weatherResponse.data,
      recommendations: generateRecommendations(overallRisk, floodPredictions)
    };

    const meta = {
      coordinates: { lat: latNum, lng: lngNum },
      radius: radiusNum,
      riversAnalyzed: rivers.length,
      dataSource: 'USGS + NOAA/NWS + NWPS'
    };

    return sendSuccess(res, floodPredictionResult, 'Flood prediction completed', meta);
  } catch (error) {
    console.error('Flood prediction error:', error.message);
    if (error.message && error.message.includes('fetch data for river')) {
      return sendError(res, 'Failed to fetch data for one or more rivers', ERROR_CODES.EXTERNAL_API_ERROR, error.message, 502);
    } else if (error.message && error.message.includes('weather data')) {
      return sendError(res, 'Failed to fetch weather data for prediction', ERROR_CODES.EXTERNAL_API_ERROR, error.message, 502);
    } else {
      return sendError(res, 'Failed to generate flood prediction', ERROR_CODES.GENERAL_ERROR, error.message, 500);
    }
  }
});

// Analyze flood risk for a specific river
function analyzeFloodRisk(river, flowData, floodStage, precipitation) {
  // Extract flow data from the correct timeSeries structure
  let currentFlow = 0;
  const flowTimeSeries = flowData.value.timeSeries.find(ts => 
    ts && ts.variable && ts.variable.variableCode && ts.variable.variableCode[0] && 
    ts.variable.variableCode[0].value === '00060'
  );
  if (flowTimeSeries && flowTimeSeries.values && flowTimeSeries.values[0] && 
      flowTimeSeries.values[0].value && flowTimeSeries.values[0].value[0] &&
      flowTimeSeries.values[0].value[0].value !== undefined && 
      flowTimeSeries.values[0].value[0].value !== null) {
    currentFlow = parseFloat(flowTimeSeries.values[0].value[0].value);
  }
  
  const currentStage = floodStage.currentStage;
  
  // Calculate flow trend (increasing/decreasing) using the correct structure
  const flowValues = flowTimeSeries?.values[0]?.value || [];
  const recentFlow = flowValues.slice(-6).map(v => parseFloat(v.value)).filter(v => !isNaN(v));
  const flowTrend = recentFlow.length > 1 ? 
    (recentFlow[recentFlow.length - 1] - recentFlow[0]) / recentFlow[0] : 0;

  // Enhanced flood risk calculation using weighted factors
  const riskScore = calculateFloodRiskScore(currentStage, floodStage.floodStages, flowTrend, precipitation);
  
  // Determine flood probability based on risk score
  const floodProbability = Math.min(95, Math.max(5, riskScore.probability));
  
  // Enhanced time to flood estimation
  const timeToFlood = estimateTimeToFloodEnhanced(currentStage, floodStage.floodStages, flowTrend, precipitation, riskScore);
  
  // Determine risk level based on comprehensive analysis
  const riskLevel = determineRiskLevel(riskScore, currentStage, floodStage.floodStages);

  return {
    riverId: river.id,
    riverName: river.name,
    currentFlow,
    currentStage,
    flowTrend: flowTrend > 0.05 ? 'Increasing' : flowTrend < -0.05 ? 'Decreasing' : 'Stable',
    floodStage: floodStage.status,
    precipitationRisk: riskScore.precipitationRisk,
    floodProbability,
    riskLevel,
    timeToFlood,
    riskFactors: riskScore.factors, // New: detailed breakdown
    recommendations: generateRiverRecommendations(floodProbability, currentStage, riskScore)
  };
}

// Enhanced flood risk calculation using weighted factors
function calculateFloodRiskScore(currentStage, floodStages, flowTrend, precipitation) {
  const factors = {};
  
  // 1. River Stage Factor (40% weight) - How close to flood stage
  const stageRatio = currentStage / floodStages.minor;
  const stageFactor = Math.min(100, Math.max(0, (stageRatio - 0.5) * 100));
  factors.stageFactor = Math.round(stageFactor);
  
  // 2. Flow Trend Factor (25% weight) - Rate of water level change
  const trendFactor = flowTrend > 0 ? Math.min(100, flowTrend * 200) : 0;
  factors.trendFactor = Math.round(trendFactor);
  
  // 3. Precipitation Factor (35% weight) - Forecasted rain impact
  const totalPrecipitation = precipitation.reduce((sum, p) => sum + p.precipitation, 0);
  const avgPrecipitation = precipitation.length > 0 ? totalPrecipitation / precipitation.length : 0;
  
  // Weight precipitation by probability and intensity
  const precipitationFactor = Math.min(100, (avgPrecipitation * 1.5) + (totalPrecipitation * 0.3));
  factors.precipitationFactor = Math.round(precipitationFactor);
  
  // Determine precipitation risk level
  let precipitationRisk = 'Low';
  if (precipitationFactor > 70) precipitationRisk = 'High';
  else if (precipitationFactor > 40) precipitationRisk = 'Medium';
  
  // Calculate weighted risk score
  const weightedScore = (
    (stageFactor * 0.40) +      // 40% weight for stage
    (trendFactor * 0.25) +      // 25% weight for trend
    (precipitationFactor * 0.35) // 35% weight for precipitation
  );
  
  return {
    probability: Math.round(weightedScore),
    stageFactor: factors.stageFactor,
    trendFactor: factors.trendFactor,
    precipitationFactor: factors.precipitationFactor,
    precipitationRisk,
    factors
  };
}

// Enhanced time to flood estimation based on NOAA/NWS hydrological principles
function estimateTimeToFloodEnhanced(currentStage, floodStages, flowTrend, precipitation, riskScore) {
  try {
    // Calculate key hydrological factors
    const stageRatio = currentStage / floodStages.minor;
    const precipitationIntensity = precipitation.reduce((sum, p) => sum + p.precipitation, 0) / Math.max(1, precipitation.length);
    const stageToFlood = floodStages.minor - currentStage;
    
    // Immediate flood conditions (already at or above flood stage)
    if (currentStage >= floodStages.major) return 'Major flooding now';
    if (currentStage >= floodStages.moderate) return 'Moderate flooding now';
    if (currentStage >= floodStages.minor) return 'Minor flooding now';
    
    // Critical conditions - very high probability of flooding
    if (currentStage >= floodStages.action) {
      if (flowTrend > 0.2 && precipitationIntensity > 70) return '1-2 hours';
      if (flowTrend > 0.15 && precipitationIntensity > 60) return '2-4 hours';
      if (flowTrend > 0.1 || precipitationIntensity > 50) return '4-8 hours';
      if (precipitationIntensity > 30) return '8-12 hours';
      return '12-24 hours';
    }
    
    // High risk conditions - approaching action stage
    if (stageRatio > 0.8) {
      if (flowTrend > 0.15 && precipitationIntensity > 60) return '4-8 hours';
      if (flowTrend > 0.1 && precipitationIntensity > 40) return '8-12 hours';
      if (flowTrend > 0.05 || precipitationIntensity > 50) return '12-24 hours';
      if (precipitationIntensity > 20) return '1-2 days';
      return '2-3 days';
    }
    
    // Moderate risk conditions - significant stage or trend
    if (stageRatio > 0.6) {
      if (flowTrend > 0.1 && precipitationIntensity > 50) return '12-24 hours';
      if (flowTrend > 0.05 && precipitationIntensity > 30) return '1-2 days';
      if (precipitationIntensity > 60) return '1-3 days';
      if (flowTrend > 0.02 || precipitationIntensity > 15) return '3-5 days';
      return '5-7 days';
    }
    
    // Lower risk but still measurable threat
    if (stageRatio > 0.4) {
      if (flowTrend > 0.05 && precipitationIntensity > 40) return '1-3 days';
      if (precipitationIntensity > 50) return '2-4 days';
      if (flowTrend > 0.02 || precipitationIntensity > 20) return '5-7 days';
      return '1-2 weeks';
    }
    
    // Very low immediate risk
    if (riskScore < 15) return 'No immediate threat';
    if (riskScore < 25) return 'Low threat - monitor weekly';
    if (riskScore < 35) return 'Monitor conditions daily';
    
    // Default for edge cases
    return 'Monitor conditions';
  } catch (error) {
    console.error('[TIME TO FLOOD] Error calculating time to flood:', error);
    return 'Monitor conditions';
  }
}

// Enhanced risk level determination
function determineRiskLevel(riskScore, currentStage, floodStages) {
  const stageRatio = currentStage / floodStages.minor;
  
  // High risk conditions
  if (currentStage >= floodStages.moderate || riskScore.probability >= 75) return 'High';
  if (currentStage >= floodStages.minor && riskScore.trendFactor > 50) return 'High';
  if (stageRatio > 0.9 && riskScore.precipitationFactor > 60) return 'High';
  
  // Medium risk conditions
  if (currentStage >= floodStages.action || riskScore.probability >= 50) return 'Medium';
  if (stageRatio > 0.7 && (riskScore.trendFactor > 30 || riskScore.precipitationFactor > 40)) return 'Medium';
  
  // Low risk
  return 'Low';
}

// Enhanced recommendations based on comprehensive risk analysis
function generateRiverRecommendations(floodProbability, currentStage, riskScore) {
  const recommendations = [];
  
  if (floodProbability >= 70) {
    recommendations.push(
      '⚠️ IMMEDIATE ACTION REQUIRED',
      'Consider evacuation if in flood-prone areas',
      'Monitor emergency broadcasts',
      'Move to higher ground if near river'
    );
  } else if (floodProbability >= 50) {
    recommendations.push(
      '⚠️ STAY ALERT',
      'Prepare emergency supplies',
      'Monitor river levels closely',
      'Have evacuation plan ready'
    );
  } else if (floodProbability >= 30) {
    recommendations.push(
      '⚠️ MONITOR CONDITIONS',
      'Stay informed about weather updates',
      'Check local flood warnings',
      'Prepare emergency kit'
    );
  } else {
    recommendations.push(
      '✅ CONDITIONS NORMAL',
      'Continue monitoring weather updates',
      'Stay informed about local conditions'
    );
  }
  
  // Add specific recommendations based on risk factors
  if (riskScore.precipitationFactor > 60) {
    recommendations.push('Heavy rainfall expected - avoid low-lying areas');
  }
  if (riskScore.trendFactor > 50) {
    recommendations.push('River levels rising rapidly - monitor closely');
  }
  
  return recommendations;
}

// Calculate overall flood risk for the area
function calculateOverallRisk(riverPredictions, precipitation) {
  const highRiskRivers = riverPredictions.filter(r => r.riskLevel === 'High').length;
  const mediumRiskRivers = riverPredictions.filter(r => r.riskLevel === 'Medium').length;
  const totalPrecipitation = precipitation.reduce((sum, p) => sum + p.precipitation, 0);

  if (highRiskRivers > 0 || totalPrecipitation > 80) return 'High';
  if (mediumRiskRivers > 1 || totalPrecipitation > 50) return 'Medium';
  return 'Low';
}

// Estimate time to flood based on current conditions
function estimateTimeToFlood(currentStage, flowTrend, precipitationRisk) {
  // Calculate realistic flood stages for time estimation
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
  
  if (currentStage >= floodStages.moderate) return 'Immediate';
  if (currentStage >= floodStages.minor && flowTrend > 0.1) return '2-4 hours';
  if (currentStage >= floodStages.action && precipitationRisk === 'High') return '4-8 hours';
  if (flowTrend > 0.2 && precipitationRisk === 'High') return '8-12 hours';
  return 'No immediate threat';
}

// Generate recommendations based on risk level
function generateRecommendations(overallRisk, riverPredictions) {
  const recommendations = [];
  
  if (overallRisk === 'High') {
    recommendations.push(
      '⚠️ HIGH FLOOD RISK: Consider evacuation if in flood-prone areas',
      'Monitor local emergency broadcasts',
      'Move to higher ground if near rivers or creeks',
      'Avoid driving through flooded areas'
    );
  } else if (overallRisk === 'Medium') {
    recommendations.push(
      '⚠️ MODERATE FLOOD RISK: Stay alert to changing conditions',
      'Prepare emergency supplies',
      'Monitor river levels closely',
      'Have evacuation plan ready'
    );
  } else {
    recommendations.push(
      '✅ LOW FLOOD RISK: Conditions are normal',
      'Continue monitoring weather updates',
      'Stay informed about local conditions'
    );
  }

  return recommendations;
}

function generateRiverRecommendations(floodProbability, currentStage) {
  if (floodProbability >= 70) {
    return ['Immediate action required', 'Consider evacuation', 'Monitor emergency alerts'];
  } else if (floodProbability >= 40) {
    return ['Stay alert', 'Prepare emergency supplies', 'Monitor river levels'];
  } else {
    return ['Continue normal activities', 'Stay informed'];
  }
}

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

// Get official NOAA flood stages from NWPS API
async function getOfficialFloodStages(usgsId) {
  try {
    console.log(`[NWPS] Fetching official flood stages for USGS site: ${usgsId}`);
    
    const response = await axios.get(`${NWPS_BASE_URL}/gauges`, {
      params: {
        'site.usgs': usgsId
      },
      timeout: 10000,
      headers: {
        'User-Agent': 'RiverApp/1.0'
      }
    });

    if (response.data && response.data.features && response.data.features.length > 0) {
      const gauge = response.data.features[0];
      const properties = gauge.properties;
      
      // Extract official flood stages if available
      if (properties.floodStages) {
        const officialStages = {
          action: properties.floodStages.action || null,
          minor: properties.floodStages.minor || null,
          moderate: properties.floodStages.moderate || null,
          major: properties.floodStages.major || null,
          source: 'NOAA/NWS Official'
        };
        
        console.log(`[NWPS] Found official flood stages for ${usgsId}:`, officialStages);
        return officialStages;
      }
    }
    
    console.log(`[NWPS] No official flood stages found for USGS site: ${usgsId}`);
    return null;
  } catch (error) {
    console.error(`[NWPS] Error fetching official flood stages for ${usgsId}:`, error.message);
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
  // First, try to get official NOAA flood stages
  const officialStages = await getOfficialFloodStages(usgsId);
  
  if (officialStages && officialStages.action && officialStages.minor && 
      officialStages.moderate && officialStages.major) {
    return officialStages;
  }
  
  // If official stages aren't available or incomplete, use calculated fallback
  console.log(`[FLOOD] Using calculated fallback flood stages for USGS site: ${usgsId}`);
  return calculateFallbackFloodStages(currentStage);
}

module.exports = router; 