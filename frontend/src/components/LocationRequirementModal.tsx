import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';
import LocationSelector from './LocationSelector';

const LocationRequirementModal: React.FC = () => {
  const { location, locationRequired, setLocationRequired } = useLocation();

  // Close modal when location is set
  React.useEffect(() => {
    if (location && locationRequired) {
      setLocationRequired(false);
    }
  }, [location, locationRequired, setLocationRequired]);

  if (!locationRequired) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <AlertTriangle className="w-6 h-6 text-orange-500 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Location Required</h2>
          </div>
          
          <div className="mb-4">
            <p className="text-gray-600 mb-3">
              We couldn't automatically detect your location. Please enter your location below to view flood data for your area.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>Why is location needed?</strong> We use your location to show relevant river conditions and flood predictions in your area.
              </p>
            </div>
          </div>

          <LocationSelector compact={true} />
        </div>
      </div>
    </div>
  );
};

export default LocationRequirementModal; 