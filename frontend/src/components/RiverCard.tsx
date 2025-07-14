import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, Info, Minus } from 'lucide-react';
import WaterLevelChart from './WaterLevelChart';
import Player from 'lottie-react';
// @ts-ignore
import risingLottie from './animations/rising.json';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

interface HistoricalDataPoint {
  timestamp: string;
  level: number;
  flow: number;
}

interface FloodStages {
  action: number;
  minor: number;
  moderate: number;
  major: number;
}

interface River {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  flow: string;
  stage: string;
  unit: string;
  lastUpdated: string;
  historicalData?: HistoricalDataPoint[];
  floodStages?: FloodStages;
  waterTemp?: string | null;
  precipitation?: string | null;
  parsedLocation?: {
    city?: string | null;
    county?: string | null;
    state?: string | null;
    fullLocation?: string | null;
    displayLocation?: string | null;
    location?: string | null;
  };
  siteMeta?: {
    siteType?: string | null;
    drainageArea?: number | null;
    elevation?: number | null;
    elevationDatum?: string | null;
    county?: string | null;
    state?: string | null;
    huc?: string | null;
    agency?: string | null;
    description?: string | null;
  };
}

interface FloodPrediction {
  riverId: string;
  riverName: string;
  currentFlow: number;
  currentStage: number;
  flowTrend: string;
  floodStage: string;
  precipitationRisk: string;
  floodProbability: number;
  riskLevel: string;
  timeToFlood: string;
  recommendations: string[];
  riskFactors?: {
    stageFactor: number;
    trendFactor: number;
    precipitationFactor: number;
  };
  floodStages?: {
    action: number;
    minor: number;
    moderate: number;
    major: number;
    source: string;
  };
}

interface RiverCardProps {
  river: River;
  prediction?: FloodPrediction;
  index: number;
}

// Add ThreeDots animation component for Stable trend
const ThreeDots: React.FC = () => (
  <span className="three-dots ml-1" aria-label="Stable" title="Stable">
    <span className="dot" />
    <span className="dot" />
    <span className="dot" />
    <style>{`
      .three-dots {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        height: 18px;
      }
      .three-dots .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #3B82F6; /* blue-500 */
        opacity: 0.5;
        animation: three-dots-bounce 1.2s infinite both;
        display: inline-block;
      }
      .three-dots .dot:nth-child(1) { animation-delay: 0s; }
      .three-dots .dot:nth-child(2) { animation-delay: 0.2s; }
      .three-dots .dot:nth-child(3) { animation-delay: 0.4s; }
      @keyframes three-dots-bounce {
        0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
        40% { transform: scale(1.2); opacity: 1; }
      }
    `}</style>
  </span>
);

const RiverCard: React.FC<RiverCardProps> = ({ river, prediction, index }) => {
  // Use parsed location from USGS data instead of reverse geocoding
  const displayLocation = river.parsedLocation?.displayLocation || null;

  // Calculate water level trend from historicalData
  let waterLevelTrend: 'Rising' | 'Falling' | 'Stable' = 'Stable';
  let flowTrend: 'Rising' | 'Falling' | 'Stable' = 'Stable';
  if (river.historicalData && river.historicalData.length >= 3) {
    const levels = river.historicalData.map(d => d.level);
    const flows = river.historicalData.map(d => d.flow);
    const recentLevels = levels.slice(-3);
    const recentFlows = flows.slice(-3);
    const levelTrend = recentLevels.length > 1 ? (recentLevels[recentLevels.length - 1] - recentLevels[0]) / (recentLevels[0] || 1) : 0;
    const flowTrendVal = recentFlows.length > 1 ? (recentFlows[recentFlows.length - 1] - recentFlows[0]) / (recentFlows[0] || 1) : 0;
    if (levelTrend > 0.05) waterLevelTrend = 'Rising';
    else if (levelTrend < -0.05) waterLevelTrend = 'Falling';
    else waterLevelTrend = 'Stable';
    if (flowTrendVal > 0.05) flowTrend = 'Rising';
    else if (flowTrendVal < -0.05) flowTrend = 'Falling';
    else flowTrend = 'Stable';
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'low':
        return 'border-green-500 text-green-800 border-2';
      case 'medium':
        return 'border-yellow-500 text-yellow-800 border-2';
      case 'high':
        return 'border-red-500 text-red-800 border-2';
      case 'critical':
        return 'border-red-700 text-red-900 border-4';
      default:
        return 'border-gray-300 text-gray-800 border-1';
    }
  };
  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel?.toLowerCase()) {
      case 'low':
        return <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />;
      case 'medium':
        return <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />;
      case 'high':
        return <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />;
      case 'critical':
        return <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-red-700" />;
      default:
        return <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />;
    }
  };

  const getTrendAnimation = (trend: string) => {
    if (trend.toLowerCase() === 'rising') {
      return (
        <span className="ml-1" aria-label="Rising" title="Rising">
          <Player autoplay loop animationData={risingLottie} style={{ width: 24, height: 24 }} rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }} />
        </span>
      );
    } else if (trend.toLowerCase() === 'falling') {
      return (
        <span className="ml-1" aria-label="Falling" title="Falling">
          <Player autoplay loop animationData={risingLottie} style={{ width: 24, height: 24, filter: 'hue-rotate(90deg) saturate(2) brightness(1.2)', transform: 'rotate(180deg)' }} rendererSettings={{ preserveAspectRatio: 'xMidYMid slice' }} />
        </span>
      );
    } else if (trend.toLowerCase() === 'stable') {
      return <ThreeDots />;
    }
    return null;
  };

  const formatFlow = (flow: number | null | undefined) => {
    if (flow == null || isNaN(flow)) {
      return 'N/A';
    }
    if (flow >= 1000) {
      return `${(flow / 1000).toFixed(1)}K`;
    }
    return flow.toString();
  };

  const getFlowIntensity = (flow: string) => {
    if (flow === 'N/A') return 'slow';
    const flowValue = parseFloat(flow);
    if (flowValue > 1000) return 'fast';
    if (flowValue > 500) return 'medium';
    return 'slow';
  };

  const flowIntensity = getFlowIntensity(river.flow);

  return (
    <div 
      className={`
        relative overflow-hidden rounded-lg border bg-white p-4 shadow-sm 
        hover:shadow-md transition-all duration-200 min-h-[140px] w-full
        ${prediction ? getRiskColor(prediction.riskLevel) : 'border-gray-200'}
      `}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      <div className="relative z-10 w-full min-w-0">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-3 space-y-2 md:space-y-0">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="font-semibold text-base sm:text-lg text-gray-900 break-words">
              {river.name}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 break-words">
              {river.parsedLocation && (river.parsedLocation.city || river.parsedLocation.state) ? (
                <>
                  {river.parsedLocation.location ? (
                    <span>{river.parsedLocation.location}, </span>
                  ) : null}
                  {river.parsedLocation.city ? (
                    <span>{river.parsedLocation.city}, </span>
                  ) : null}
                  {river.parsedLocation.state ? (
                    <span>{river.parsedLocation.state}</span>
                  ) : null}
                  <span> - </span>
                  <span>{river.location.lat.toFixed(4)}, {river.location.lng.toFixed(4)}</span>
                </>
              ) : (
                <>
                  {river.location.lat.toFixed(4)}, {river.location.lng.toFixed(4)}
                </>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {prediction && (
              <div className={`flex items-center space-x-2 px-2 sm:px-3 py-1 rounded-full border ${getRiskColor(prediction.riskLevel)} risk-pulse`}>
                {getRiskIcon(prediction.riskLevel)}
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">{prediction.riskLevel} Risk</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          <div className="relative min-w-0">
            <p className="text-sm text-gray-600 flex items-center">
              Water Level
              <span className="ml-2 flex items-center">
                <span className="ml-1 text-xs font-medium text-gray-500">{waterLevelTrend}</span>
                {getTrendAnimation(waterLevelTrend)}
              </span>
            </p>
            <div className="font-semibold flex items-center flex-wrap">
              <span className="mr-2">{river.stage !== 'N/A' ? `${river.stage} ft` : 'N/A'}</span>
            </div>
          </div>
          <div className="relative min-w-0">
            <p className="text-sm text-gray-600 flex items-center">
              Flow Trend
              <span className="ml-2 flex items-center">
                <span className="ml-1 text-xs font-medium text-gray-500">{flowTrend}</span>
                {getTrendAnimation(flowTrend)}
              </span>
            </p>
            <div className="font-semibold flex items-center flex-wrap">
              <span className="mr-2">{river.flow !== 'N/A' ? `${river.flow} ${river.unit}` : 'N/A'}</span>
            </div>
          </div>
          {river.waterTemp && (
            <div className="min-w-0">
              <p className="text-sm text-gray-600">Water Temp</p>
              <p className="font-semibold">{river.waterTemp} °C</p>
            </div>
          )}
          {river.precipitation && (
            <div className="min-w-0">
              <p className="text-sm text-gray-600">Precipitation</p>
              <p className="font-semibold">{river.precipitation} in</p>
            </div>
          )}
        </div>

        {prediction && (
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="flex items-center space-x-1">
                <span className="text-gray-600">Flow:</span>
                <span className="font-medium">{formatFlow(prediction.currentFlow)} CFS</span>
                {/* Removed getTrendIcon(prediction.flowTrend) */}
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-gray-600">Stage:</span>
                <span className="font-medium">
                  {prediction.currentStage != null && !isNaN(prediction.currentStage) 
                    ? `${prediction.currentStage.toFixed(1)} ft` 
                    : 'N/A'
                  }
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div className="flex items-center space-x-1 group relative">
                <span className="text-gray-600">Flood Stage:</span>
                <span className="font-medium">{prediction.floodStage || 'N/A'}</span>
                {prediction.floodStages?.source && (
                  <div className="ml-1 cursor-help">
                    <Info className="w-3 h-3 text-gray-400" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-normal max-w-xs z-20">
                      {prediction.floodStages.source === 'NOAA/NWS Official' 
                        ? 'Using official NOAA/NWS flood category levels'
                        : 'Using calculated flood stages (official data not available)'
                      }
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-1 group relative">
                <span className="text-gray-600">Probability:</span>
                <span className="font-medium">
                  {prediction.floodProbability != null && !isNaN(prediction.floodProbability)
                    ? `${prediction.floodProbability.toFixed(0)}%`
                    : 'N/A'
                  }
                </span>
                <div className="ml-1 cursor-help">
                  <Info className="w-3 h-3 text-gray-400" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-normal max-w-xs z-20">
                    Predictive awareness measure based on current conditions and forecasts
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Risk Factors Breakdown */}
            {prediction.riskFactors && (
              <div className="mt-2 p-2 bg-white bg-opacity-70 rounded text-xs">
                <div className="flex items-center space-x-1 group relative mb-1">
                  <span className="text-gray-600 font-medium">Risk Factors:</span>
                  <div className="ml-1 cursor-help">
                    <Info className="w-3 h-3 text-gray-400" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-normal max-w-xs z-20">
                      Enhanced calculation using: River stage (55%), Flow trend (30%), Precipitation forecast (15%)
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-4 text-xs">
                  <div className="flex-1">
                    <div className="text-gray-500 text-left">Stage</div>
                    <div className="font-medium text-left">{prediction.riskFactors.stageFactor || 0}%</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-500 text-left">Trend</div>
                    <div className="font-medium text-left">{prediction.riskFactors.trendFactor || 0}%</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-gray-500 text-left">Rain</div>
                    <div className="font-medium text-left">{prediction.riskFactors.precipitationFactor || 0}%</div>
                  </div>
                </div>
              </div>
            )}

            {prediction.timeToFlood && prediction.timeToFlood !== 'Unknown' && (
              <div className="mt-2 p-2 bg-white bg-opacity-70 rounded text-xs">
                <div className="flex items-center space-x-1 group relative">
                  <span className="text-gray-600">Time to flood level: </span>
                  <span className="font-medium">{prediction.timeToFlood}</span>
                  <div className="ml-1 cursor-help">
                    <Info className="w-3 h-3 text-gray-400" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-normal max-w-xs z-20">
                      Predictive estimate based on current water levels, flow trends, and precipitation forecasts
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {prediction.recommendations && prediction.recommendations.length > 0 && (
              <div className="mt-2 p-2 bg-white bg-opacity-70 rounded text-xs">
                <span className="text-gray-600 font-medium">Recommendations:</span>
                <ul className="mt-1 space-y-1">
                  {prediction.recommendations.slice(0, 2).map((rec, i) => (
                    <li key={i} className="text-gray-700">• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!prediction && (
          <div className="text-xs sm:text-sm text-gray-500">
            No flood prediction data available
          </div>
        )}

        {/* Water Level History Chart */}
        {river.historicalData && river.floodStages && (
          <div className="mt-4">
            <WaterLevelChart
              historicalData={river.historicalData}
              floodStages={river.floodStages}
              currentLevel={parseFloat(river.stage) || 0}
              riverName={river.name}
            />
          </div>
        )}

        {/* Site Metadata Accordion */}
        {/* REMOVED: Site Metadata section as requested */}

        <div className="mt-3 pt-3 border-t text-xs text-gray-500">
          Last updated: {new Date(river.lastUpdated).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default RiverCard; 