import React from 'react';
import { MapPin } from 'lucide-react';

interface RadiusSelectorProps {
  radius: number;
  onRadiusChange: (radius: number) => void;
}

const RadiusSelector: React.FC<RadiusSelectorProps> = ({ radius, onRadiusChange }) => {
  const radiusOptions = [5, 10, 25, 50, 100];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <MapPin className="w-5 h-5 mr-2" />
        Search Radius
      </h2>
      
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Select the radius (in miles) to search for rivers and creeks:
        </p>
        
        <div className="grid grid-cols-5 gap-2">
          {radiusOptions.map((option) => (
            <button
              key={option}
              onClick={() => onRadiusChange(option)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                radius === option
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option} mi
            </button>
          ))}
        </div>
        
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-blue-800">
            Currently searching within <strong>{radius} miles</strong> of your location
          </p>
        </div>
      </div>
    </div>
  );
};

export default RadiusSelector; 