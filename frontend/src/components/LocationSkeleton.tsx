import React from 'react';

interface LocationSkeletonProps {
  compact?: boolean;
  className?: string;
}

const LocationSkeleton: React.FC<LocationSkeletonProps> = ({ compact = false, className = '' }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
      <div className="flex flex-col space-y-1">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
        {!compact && (
          <div className="h-3 bg-gray-100 rounded animate-pulse w-32" />
        )}
      </div>
    </div>
  );
};

export default LocationSkeleton; 