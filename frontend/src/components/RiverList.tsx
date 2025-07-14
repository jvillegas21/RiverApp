import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Droplets, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Filter, RefreshCw } from 'lucide-react';
import RiverCard from './RiverCard';
import { useLocation } from '../contexts/LocationContext';
import { useRiver } from '../contexts/RiverContext';
import { useRadius } from '../contexts/RadiusContext';

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

// Skeleton for loading state
const RiverCardSkeleton: React.FC = () => (
  <div className="border rounded-lg p-4 animate-pulse bg-gray-50">
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
);

const RiverList: React.FC<RiverListProps> = ({ rivers, floodPredictions, loading, loadingProgress = 0 }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [isExpanded, setIsExpanded] = useState(true); // Mobile accordion state
  const [windowWidth, setWindowWidth] = useState(window.innerWidth); // Track window width for responsive updates
  const { location } = useLocation();
  const { fetchFloodPrediction, lastFetched } = useRiver();
  const { radius } = useRadius();
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle window resize for better responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-refresh every 3 minutes, but only set interval after fetch completes
  // REMOVE this useEffect:
  // useEffect(() => {
  //   if (!location) return;
  //   let interval: NodeJS.Timeout | null = null;
  //   let cancelled = false;
  //   const doRefresh = async () => {
  //     setRefreshing(true);
  //     await fetchFloodPrediction(location.lat, location.lng, radius);
  //     setRefreshing(false);
  //     if (!cancelled) {
  //       interval = setTimeout(doRefresh, 180000); // 3 minutes
  //     }
  //   };
  //   doRefresh(); // Initial fetch
  //   return () => {
  //     cancelled = true;
  //     if (interval) clearTimeout(interval);
  //   };
  // }, [location, fetchFloodPrediction, radius]);

  const handleManualRefresh = async () => {
    if (!location) return;
    setRefreshing(true);
    await fetchFloodPrediction(location.lat, location.lng, radius);
    // No need to set local lastUpdated, use context lastFetched
    setRefreshing(false);
  };

  // Haversine formula to calculate distance between two lat/lng points in miles
  function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
    const toRad = (x: number) => x * Math.PI / 180;
    const R = 3958.8; // Radius of Earth in miles
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Sort and filter rivers
  const sortedRivers = useMemo(() => {
    let filtered = rivers.map(river => {
      const prediction = floodPredictions.find(p => p.riverId === river.id);
      return { river, prediction };
    });
    if (filter !== 'all') {
      filtered = filtered.filter(r => (r.prediction?.riskLevel?.toLowerCase() || 'low') === filter);
      // For filtered, sort by risk, rising, probability
      return filtered.sort((a, b) => {
        const riskOrder = { high: 3, medium: 2, low: 1, default: 0 };
        let aRisk = (a.prediction?.riskLevel || 'default').toLowerCase();
        let bRisk = (b.prediction?.riskLevel || 'default').toLowerCase();
        aRisk = ['high', 'medium', 'low'].includes(aRisk) ? aRisk : 'default';
        bRisk = ['high', 'medium', 'low'].includes(bRisk) ? bRisk : 'default';
        const riskDiff = riskOrder[bRisk as 'high' | 'medium' | 'low' | 'default'] - riskOrder[aRisk as 'high' | 'medium' | 'low' | 'default'];
        if (riskDiff !== 0) return riskDiff;
        const aRising = a.prediction?.flowTrend === 'Increasing' ? 1 : 0;
        const bRising = b.prediction?.flowTrend === 'Increasing' ? 1 : 0;
        if (bRising !== aRising) return bRising - aRising;
        return (b.prediction?.floodProbability || 0) - (a.prediction?.floodProbability || 0);
      });
    } else {
      // For 'all', sort by distance to user location
      if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
        return filtered.sort((a, b) => {
          const aDist = getDistance(location.lat, location.lng, a.river.location.lat, a.river.location.lng);
          const bDist = getDistance(location.lat, location.lng, b.river.location.lat, b.river.location.lng);
          return aDist - bDist;
    });
      } else {
        // fallback: sort by name
        return filtered.sort((a, b) => a.river.name.localeCompare(b.river.name));
      }
    }
  }, [rivers, floodPredictions, filter, location]);

  // Pagination
  const totalPages = Math.ceil(sortedRivers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRivers = sortedRivers.slice(startIndex, endIndex);

  // Calculate risk counts for filters
  const riskCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    rivers.forEach(river => {
      const prediction = floodPredictions.find(p => p.riverId === river.id);
      const risk = (prediction?.riskLevel || 'low').toLowerCase();
      if (risk === 'high' || risk === 'medium' || risk === 'low') {
        counts[risk]++;
      }
    });
    return counts;
  }, [rivers, floodPredictions]);

  // In goToPage, scroll the main scrollable section to the top on page change
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    // Scroll the main scrollable section to the top
    if (containerRef.current) {
      // For most browsers
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      // For legacy support
      containerRef.current.scrollTop = 0;
    }
  };


  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 w-full min-w-0 overflow-hidden">
      <div className="flex items-center justify-between mb-1 min-w-0">
        <div className="flex items-center min-w-0 flex-1">
          <Droplets className="w-5 h-5 mr-2 flex-shrink-0" />
          <h2 className="text-xl font-semibold truncate">
            Nearby Rivers & Creeks {loading ? (
              <span className="inline-block w-8 h-4 bg-gray-200 rounded animate-pulse ml-1"></span>
            ) : (
              `(${sortedRivers.length})`
            )}
          </h2>
          {/* Mobile accordion toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="md:hidden ml-2 p-1 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 flex-shrink-0"
            aria-label={isExpanded ? "Collapse rivers section" : "Expand rivers section"}
            aria-expanded={isExpanded}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
        <button
          onClick={handleManualRefresh}
          className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 flex-shrink-0 ml-2"
          disabled={refreshing}
          aria-label="Refresh river data"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>
      
      {/* Loading Progress Bar */}
      {loading && loadingProgress > 0 && (
        <div className="bg-gray-100 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Loading river data...</span>
            <span className="text-sm text-gray-500">{loadingProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Collapsible content */}
      <div className={`${isExpanded ? 'block' : 'hidden'} md:block w-full min-w-0`}>
        {/* Only show last updated if not loading and there is data */}
        {!loading && sortedRivers.length > 0 && (
          <div className="text-xs text-gray-500 mb-4 ml-7 truncate">
            Last updated: {lastFetched ? new Date(lastFetched).toLocaleTimeString() : '—'}
          </div>
        )}
        {/* Only show skeleton if loading */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <RiverCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* Filter Controls */}
            <div className="flex items-center space-x-2 mb-4">
              <Filter className="w-4 h-4 text-gray-500" aria-hidden="true" />
              
              {/* Desktop: Button group */}
              <div className="hidden sm:flex bg-gray-100 rounded-lg p-1" role="group" aria-label="Filter rivers by risk level">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    filter === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-pressed={filter === 'all'}
                >
                  All ({rivers.length})
                </button>
                <button
                  onClick={() => setFilter('high')}
                  disabled={riskCounts.high === 0}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    filter === 'high'
                      ? 'bg-red-100 text-red-800 shadow-sm'
                      : riskCounts.high === 0
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:text-red-700'
                  }`}
                  aria-pressed={filter === 'high'}
                >
                  High Risk ({riskCounts.high})
                </button>
                <button
                  onClick={() => setFilter('medium')}
                  disabled={riskCounts.medium === 0}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    filter === 'medium'
                      ? 'bg-yellow-100 text-yellow-800 shadow-sm'
                      : riskCounts.medium === 0
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:text-yellow-700'
                  }`}
                  aria-pressed={filter === 'medium'}
                >
                  Medium Risk ({riskCounts.medium})
                </button>
                <button
                  onClick={() => setFilter('low')}
                  disabled={riskCounts.low === 0}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    filter === 'low'
                      ? 'bg-green-100 text-green-800 shadow-sm'
                      : riskCounts.low === 0
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:text-green-700'
                  }`}
                  aria-pressed={filter === 'low'}
                >
                  Low Risk ({riskCounts.low})
                </button>
              </div>
              
              {/* Mobile: Select dropdown */}
              <div className="flex sm:hidden flex-1">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as 'all' | 'high' | 'medium' | 'low')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white text-sm"
                  aria-label="Filter rivers by risk level"
                >
                  <option value="all">All Rivers ({rivers.length})</option>
                  <option value="high" disabled={riskCounts.high === 0}>
                    High Risk ({riskCounts.high})
                  </option>
                  <option value="medium" disabled={riskCounts.medium === 0}>
                    Medium Risk ({riskCounts.medium})
                  </option>
                  <option value="low" disabled={riskCounts.low === 0}>
                    Low Risk ({riskCounts.low})
                  </option>
                </select>
              </div>
            </div>
            {/* River Cards */}
            <div className="space-y-4 w-full min-w-0" ref={containerRef} style={{ maxHeight: windowWidth < 768 ? '60vh' : '80vh', overflowY: 'auto' }}>
              <div className="space-y-4">
                {currentRivers.map(({ river, prediction }, index) => (
                  <div key={`${river.id}-${startIndex + index}`} className="w-full min-w-0">
                    <RiverCard
                      river={river}
                      prediction={prediction}
                      index={index}
                    />
                  </div>
                ))}
              </div>
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
                    {/* Smart pagination with ellipsis, always show page 1 */}
                    {(() => {
                      const pageButtons = [];
                      const maxButtons = 5;
                      let start = Math.max(2, currentPage - 2); // always show 1
                      let end = Math.min(totalPages - 1, currentPage + 2); // always show last
                      if (currentPage <= 3) {
                        start = 2;
                        end = Math.min(totalPages - 1, maxButtons);
                      } else if (currentPage >= totalPages - 2) {
                        start = Math.max(2, totalPages - maxButtons + 1);
                        end = totalPages - 1;
                      }
                      // Always show first page
                      pageButtons.push(
                        <button key={1} onClick={() => goToPage(1)} className={`px-3 py-1 rounded text-sm ${currentPage === 1 ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}>1</button>
                      );
                      if (start > 2) {
                        pageButtons.push(<span key="start-ellipsis" className="px-2 text-gray-400" aria-label="ellipsis">…</span>);
                      }
                      for (let i = start; i <= end; i++) {
                        pageButtons.push(
                          <button key={i} onClick={() => goToPage(i)} className={`px-3 py-1 rounded text-sm ${currentPage === i ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}>{i}</button>
                        );
                      }
                      if (end < totalPages - 1) {
                        pageButtons.push(<span key="end-ellipsis" className="px-2 text-gray-400" aria-label="ellipsis">…</span>);
                      }
                      if (totalPages > 1) {
                        pageButtons.push(
                          <button key={totalPages} onClick={() => goToPage(totalPages)} className={`px-3 py-1 rounded text-sm ${currentPage === totalPages ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}>{totalPages}</button>
                        );
                      }
                      return pageButtons;
                    })()}
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
          </>
        )}
      </div>
    </div>
  );
};

export default RiverList; 