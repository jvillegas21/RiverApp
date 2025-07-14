import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Map } from 'lucide-react';
import Lottie from 'lottie-react';
import waterAnimation from './animations/water-animation.json';

// RivrWatch Logo Component with Lottie Animation
const RivrWatchLogo: React.FC = () => (
  <div className="w-8 h-8">
    <Lottie 
      animationData={waterAnimation} 
      loop={true}
      autoplay={true}
      style={{ width: '100%', height: '100%' }}
    />
  </div>
);

const Header: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 text-xl font-bold">
            <RivrWatchLogo />
            <span>RivrWatch</span>
          </Link>
          
          <nav className="flex space-x-6">
            <Link 
              to="/" 
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                isActive('/') ? 'bg-blue-700' : 'hover:bg-blue-500'
              }`}
            >
              <span>Dashboard</span>
            </Link>
            
            <Link 
              to="/map" 
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                isActive('/map') ? 'bg-blue-700' : 'hover:bg-blue-500'
              }`}
            >
              <Map className="w-5 h-5" />
              <span>Map</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header; 