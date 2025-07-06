const express = require('express');
const router = express.Router();
const axios = require('axios');

// USGS Water Services API
const USGS_BASE_URL = 'https://waterservices.usgs.gov/nwis';

// Flood prediction and risk assessment
router.post('/predict', async (req, res) => {
  try {
    const { lat, lng, radius, rivers } = req.body;
    
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
          
          // Get real flood stage data from USGS
          const floodStageResponse = await axios.get(
            `${USGS_BASE_URL}/iv/?format=json&sites=${river.id}&parameterCd=00065&period=P7D`,
            {
              timeout: 8000,
              headers: {
                'User-Agent': 'RiverApp/1.0 (https://github.com/your-repo)'
              }
            }
          );
          
          const currentStage = parseFloat(floodStageResponse.data.value.timeSeries[0]?.values[0]?.value[0]?.value || 0);
          const floodStageData = {
            currentStage,
            floodStages: { action: 10.0, minor: 12.0, moderate: 15.0, major: 18.0 },
            status: currentStage >= 18.0 ? 'Major Flood' :
                    currentStage >= 15.0 ? 'Moderate Flood' :
                    currentStage >= 12.0 ? 'Minor Flood' :
                    currentStage >= 10.0 ? 'Action Stage' : 'Normal'
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

    res.json({
      rivers: floodPredictions,
      overallRisk,
      weather: weatherResponse.data,
      recommendations: generateRecommendations(overallRisk, floodPredictions)
    });
  } catch (error) {
    console.error('Flood prediction error:', error.message);
    res.status(500).json({ error: 'Failed to generate flood prediction' });
  }
});

// Analyze flood risk for a specific river
function analyzeFloodRisk(river, flowData, floodStage, precipitation) {
  const currentFlow = parseFloat(flowData[0]?.values[0]?.value || 0);
  const currentStage = floodStage.currentStage;
  
  // Calculate flow trend (increasing/decreasing)
  const flowValues = flowData[0]?.values || [];
  const recentFlow = flowValues.slice(-6).map(v => parseFloat(v.value));
  const flowTrend = recentFlow.length > 1 ? 
    (recentFlow[recentFlow.length - 1] - recentFlow[0]) / recentFlow[0] : 0;

  // Calculate precipitation impact
  const totalPrecipitation = precipitation.reduce((sum, p) => sum + p.precipitation, 0);
  const precipitationRisk = totalPrecipitation > 70 ? 'High' : 
                           totalPrecipitation > 40 ? 'Medium' : 'Low';

  // Determine flood probability
  let floodProbability = 0;
  if (currentStage >= floodStage.floodStages.moderate) floodProbability = 90;
  else if (currentStage >= floodStage.floodStages.minor) floodProbability = 70;
  else if (currentStage >= floodStage.floodStages.action) floodProbability = 50;
  else if (flowTrend > 0.2 && precipitationRisk === 'High') floodProbability = 40;
  else if (flowTrend > 0.1 && precipitationRisk === 'Medium') floodProbability = 25;
  else floodProbability = 10;

  return {
    riverId: river.id,
    riverName: river.name,
    currentFlow,
    currentStage,
    flowTrend: flowTrend > 0 ? 'Increasing' : flowTrend < 0 ? 'Decreasing' : 'Stable',
    floodStage: floodStage.status,
    precipitationRisk,
    floodProbability,
    riskLevel: floodProbability >= 70 ? 'High' : 
               floodProbability >= 40 ? 'Medium' : 'Low',
    timeToFlood: estimateTimeToFlood(currentStage, flowTrend, precipitationRisk),
    recommendations: generateRiverRecommendations(floodProbability, currentStage)
  };
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
  if (currentStage >= 15) return 'Immediate';
  if (currentStage >= 12 && flowTrend > 0.1) return '2-4 hours';
  if (currentStage >= 10 && precipitationRisk === 'High') return '4-8 hours';
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

module.exports = router; 