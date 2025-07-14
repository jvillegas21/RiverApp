import React, { useEffect, useState, useRef } from 'react';
import { useReports } from '../contexts/ReportContext';
import { ThumbsUp, ThumbsDown, MapPin, Tag, RefreshCw, Plus } from 'lucide-react';
import LocationSkeleton from './LocationSkeleton';
import { GEOCODING_CONFIG, isMapBoxConfigured } from '../config/geocoding';
import ReportForm from './ReportForm';

// Hook to get city name from coordinates
function useCity(lat: number, lng: number) {
  const [city, setCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lat === 0 && lng === 0) return;
    
    async function fetchCity() {
      // Use MapBox for reverse geocoding
      if (!isMapBoxConfigured()) {
        console.log('MapBox not configured, skipping city lookup');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const res = await fetch(GEOCODING_CONFIG.MAPBOX_REVERSE_URL(lat, lng, GEOCODING_CONFIG.MAPBOX_TOKEN));
        const data = await res.json();
        
        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          const context = feature.context || [];
          
          // Extract city and county from MapBox response
          let cityName = null;
          let countyName = null;
          
          // MapBox context structure: [country, region, place]
          for (const item of context) {
            if (item.id.startsWith('place.')) {
              cityName = item.text;
            } else if (item.id.startsWith('region.')) {
              countyName = item.text;
            }
          }
          
          // If no city in context, use the main feature text
          if (!cityName && feature.place_type.includes('place')) {
            cityName = feature.text;
          }
          
          const label = cityName && countyName ? `${cityName} (${countyName})` : cityName || countyName;
          setCity(label);
        }
      } catch (error) {
        console.log('MapBox reverse geocoding error:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchCity();
  }, [lat, lng]);

  return { city, loading };
}

// Component to display location with city/county
const ReportLocation: React.FC<{ location: any }> = ({ location }) => {
  const isCoordinateLocation = typeof location === 'object' && location !== null &&
    (location as any).lat !== undefined && (location as any).lng !== undefined;
  
  const lat = isCoordinateLocation ? (location as any).lat : 0;
  const lng = isCoordinateLocation ? (location as any).lng : 0;
  
  const { city, loading: cityLoading } = useCity(lat, lng);
  
  if (isCoordinateLocation) {
    return cityLoading ? (
      <LocationSkeleton compact={true} />
    ) : (
      <>
        {city ? <span>{city}, </span> : null}
        <span className="text-xs text-gray-400">{(location as any).lat.toFixed(4)}, {(location as any).lng.toFixed(4)}</span>
      </>
    );
  }
  return <span>{location}</span>;
};

const ReportList: React.FC = () => {
  const { reports, loading, error, fetchReports, upvoteReport, downvoteReport, loadingReportId } = useReports();
  const [removingIds, setRemovingIds] = useState<string[]>([]);
  const [localReports, setLocalReports] = useState(reports);
  const timeoutRefs = useRef<{ [id: string]: NodeJS.Timeout }>({});
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Sync localReports with context reports, except for those being removed
  useEffect(() => {
    setLocalReports(prev => {
      // Keep removing reports in local state until their animation is done
      const removingSet = new Set(removingIds);
      return reports.filter(r => !removingSet.has(r.id)).concat(
        prev.filter(r => removingSet.has(r.id) && !reports.find(nr => nr.id === r.id))
      );
    });
  }, [reports, removingIds]);

  // Detect removed reports and trigger animation
  useEffect(() => {
    localReports.forEach(report => {
      if (report.status === 'removed' && !removingIds.includes(report.id)) {
        setRemovingIds(ids => [...ids, report.id]);
        timeoutRefs.current[report.id] = setTimeout(() => {
          setRemovingIds(ids => ids.filter(id => id !== report.id));
          setLocalReports(reps => reps.filter(r => r.id !== report.id));
        }, 1200); // 1.2s for animation
      }
    });
    // Cleanup on unmount
    return () => {
      Object.values(timeoutRefs.current).forEach(clearTimeout);
    };
  }, [localReports, removingIds]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'flood': return 'bg-blue-100 text-blue-800';
      case 'hazard': return 'bg-red-100 text-red-800';
      case 'weather': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'flood': return 'Flood';
      case 'hazard': return 'Hazard';
      case 'weather': return 'Weather';
      default: return 'Other';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg lg:text-xl font-semibold">Nearby User Reports</h2>
        {/* Show buttons when there are reports */}
        {!loading && localReports.length > 0 && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm font-medium flex items-center"
              aria-label="Submit a report"
              title="Submit a report"
              type="button"
            >
              <Plus className="w-4 h-4 mr-1" />
              Submit Report
            </button>
            <button
              onClick={fetchReports}
              className="p-2 rounded-lg text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
              aria-label="Refresh user reports"
              title="Refresh user reports"
              disabled={loading}
              type="button"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
        
        {/* Show only refresh when loading or error */}
        {(loading || error) && (
          <button
            onClick={fetchReports}
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
            aria-label="Refresh user reports"
            title="Refresh user reports"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden lg:inline">Refresh</span>
          </button>
        )}
      </div>
      
      {loading ? (
        <div className="text-gray-600 py-8 text-center">Loading reports...</div>
      ) : error ? (
        <div className="text-red-600 py-8 text-center">{error}</div>
      ) : !localReports.length ? (
        <div className="text-gray-500 py-8 text-center">
          <p className="mb-4">No user-submitted reports yet.</p>
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors"
            aria-label="Submit a report"
          >
            <Plus className="w-4 h-4" />
            <span>Submit a Report</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {localReports.map(report => (
            <div
              key={report.id}
              className={`p-3 rounded-lg border border-gray-200 bg-gray-50 transition-all duration-700 ease-in-out
                ${removingIds.includes(report.id) ? 'opacity-0 translate-y-8 pointer-events-none' : 'opacity-100 translate-y-0'}`}
            >
              {report.status === 'removed' ? (
                <div className="text-red-600 text-center font-semibold py-6 animate-fade-out">This report has been removed.</div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900 text-sm truncate">{report.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getCategoryColor(report.category)}`}>
                          {getCategoryLabel(report.category)}
                        </span>
                      </div>
                      <div className="flex items-center text-xs text-gray-500 mb-2">
                        <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                        <ReportLocation location={report.location} />
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(report.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                      <button
                        className="flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 transition-colors disabled:opacity-60"
                        onClick={() => upvoteReport(report.id)}
                        aria-label="Upvote report"
                        disabled={loadingReportId === report.id}
                      >
                        {loadingReportId === report.id ? (
                          <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                        ) : (
                          <ThumbsUp className="w-3 h-3" />
                        )}
                        <span>{report.upvotes}</span>
                      </button>
                      <button
                        className="flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors disabled:opacity-60"
                        onClick={() => downvoteReport(report.id)}
                        aria-label="Downvote report"
                        disabled={loadingReportId === report.id}
                      >
                        {loadingReportId === report.id ? (
                          <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                        ) : (
                          <ThumbsDown className="w-3 h-3" />
                        )}
                        <span>{report.downvotes}</span>
                      </button>
                    </div>
                  </div>
                  <div className="mb-2 text-gray-800 text-sm line-clamp-2">{report.description}</div>
                  {report.expires_at && (
                    <div className="text-xs text-blue-600 mt-2">
                      Expires: {new Date(report.expires_at).toLocaleString()}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">User-Submitted Report</div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* User Report Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" role="dialog" aria-modal="true">
          <div className="bg-white rounded-lg shadow-lg p-4 max-w-md w-full relative">
            <button
              type="button"
              onClick={() => setIsReportModalOpen(false)}
              aria-label="Close"
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
            >
              &times;
            </button>
            <ReportForm onSuccess={() => {
              setIsReportModalOpen(false);
              fetchReports();
            }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportList; 