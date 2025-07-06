import React, { useState, useMemo } from 'react';
import { Droplets, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

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
  loadingProgress?: number;
}

const RiverList: React.FC<RiverListProps> = ({ rivers, floodPredictions, loading, loadingProgress = 0 }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Sort rivers by risk level (High -> Medium -> Low)
  const sortedRivers = useMemo(() => {
    return rivers.map(river => {
      const prediction = floodPredictions.find(p => p.riverId === river.id);
      return { river, prediction };
    }).sort((a, b) => {
      const riskOrder = { 'High': 3, 'Medium': 2, 'Low': 1, 'default': 0 };
      const aRisk = a.prediction?.riskLevel || 'default';
      const bRisk = b.prediction?.riskLevel || 'default';
      return riskOrder[bRisk as keyof typeof riskOrder] - riskOrder[aRisk as keyof typeof riskOrder];
    });
  }, [rivers, floodPredictions]);

  // Pagination
  const totalPages = Math.ceil(sortedRivers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRivers = sortedRivers.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };
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
        
        {/* Loading Progress Bar */}
        {loadingProgress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Loading river data...</span>
              <span>{loadingProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <div className="h-3 bg-gray-200 rounded w-20 mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
                <div>
                  <div className="h-3 bg-gray-200 rounded w-20 mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center">
          <Droplets className="w-5 h-5 mr-2" />
          Nearby Rivers & Creeks
        </h2>
        <div className="text-sm text-gray-600">
          {rivers.length} rivers found
        </div>
      </div>
      
      {/* Risk Level Summary */}
      {sortedRivers.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Risk Summary:</span>
            <div className="flex space-x-4">
              <span className="text-red-600">
                {sortedRivers.filter(r => r.prediction?.riskLevel === 'High').length} High Risk
              </span>
              <span className="text-yellow-600">
                {sortedRivers.filter(r => r.prediction?.riskLevel === 'Medium').length} Medium Risk
              </span>
              <span className="text-green-600">
                {sortedRivers.filter(r => r.prediction?.riskLevel === 'Low').length} Low Risk
              </span>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-4">
        {currentRivers.map(({ river, prediction }, index) => {
          return (
            <div key={`${river.id}-${startIndex + index}`} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, sortedRivers.length)} of {sortedRivers.length} rivers
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`px-3 py-1 rounded text-sm ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiverList; 