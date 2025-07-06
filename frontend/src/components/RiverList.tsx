import React from 'react';
import { Droplets, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

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
}

interface RiverListProps {
  rivers: River[];
  floodPredictions: FloodPrediction[];
  loading: boolean;
}

const RiverList: React.FC<RiverListProps> = ({ rivers, floodPredictions, loading }) => {
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'High': return 'text-red-600 bg-red-50 border-red-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'High': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'Medium': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'Low': return <CheckCircle className="w-5 h-5 text-green-600" />;
      default: return <Droplets className="w-5 h-5 text-gray-600" />;
    }
  };

  const getFlowTrendIcon = (trend: string) => {
    switch (trend) {
      case 'Increasing': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'Decreasing': return <TrendingDown className="w-4 h-4 text-green-500" />;
      default: return <div className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Droplets className="w-5 h-5 mr-2" />
          Nearby Rivers & Creeks
        </h2>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (rivers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Droplets className="w-5 h-5 mr-2" />
          Nearby Rivers & Creeks
        </h2>
        <div className="text-center py-8 text-gray-500">
          <Droplets className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No rivers found in the selected radius.</p>
          <p className="text-sm">Try increasing the search radius.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Droplets className="w-5 h-5 mr-2" />
        Nearby Rivers & Creeks ({rivers.length})
      </h2>
      
      <div className="space-y-4">
        {rivers.map((river, index) => {
          const prediction = floodPredictions.find(p => p.riverId === river.id);
          
          return (
            <div key={`${river.id}-${index}`} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900">{river.name}</h3>
                  <p className="text-sm text-gray-600">
                    {river.location.lat.toFixed(4)}, {river.location.lng.toFixed(4)}
                  </p>
                </div>
                {prediction && (
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${getRiskColor(prediction.riskLevel)}`}>
                    {getRiskIcon(prediction.riskLevel)}
                    <span className="text-sm font-medium">{prediction.riskLevel} Risk</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-sm text-gray-600">Current Flow</p>
                  <p className="font-semibold">
                    {river.flow !== 'N/A' ? `${river.flow} ${river.unit}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Water Level</p>
                  <p className="font-semibold">
                    {river.stage !== 'N/A' ? `${river.stage} ft` : 'N/A'}
                  </p>
                </div>
              </div>

              {prediction && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Flow Trend:</span>
                    <div className="flex items-center space-x-1">
                      {getFlowTrendIcon(prediction.flowTrend)}
                      <span className="font-medium">{prediction.flowTrend}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Flood Stage:</span>
                    <span className="font-medium">{prediction.floodStage}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Flood Probability:</span>
                    <span className="font-medium">{prediction.floodProbability}%</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Time to Flood:</span>
                    <span className="font-medium">{prediction.timeToFlood}</span>
                  </div>

                  {prediction.recommendations.length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Recommendations:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {prediction.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                Last updated: {new Date(river.lastUpdated).toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiverList; 