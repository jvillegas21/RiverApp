// Geocoding service configuration
export const GEOCODING_CONFIG = {
  // MapBox Configuration
  // Get your free token at: https://account.mapbox.com/access-tokens/
  MAPBOX_TOKEN: process.env.REACT_APP_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN',
  
  // Service URLs
  MAPBOX_REVERSE_URL: (lat: number, lng: number, token: string) => 
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=place,region&limit=1`,
  
  MAPBOX_FORWARD_URL: (query: string, token: string) => 
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=us&types=postcode&limit=1`,
  
  // Fallback service (Nominatim - free, no API key required)
  NOMINATIM_REVERSE_URL: (lat: number, lng: number) => 
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
  
  NOMINATIM_FORWARD_URL: (zip: string) => 
    `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(zip)}&country=us&format=json&limit=1`,
};

// Helper function to check if MapBox token is configured
export const isMapBoxConfigured = () => {
  const hasToken = GEOCODING_CONFIG.MAPBOX_TOKEN && GEOCODING_CONFIG.MAPBOX_TOKEN !== 'YOUR_MAPBOX_TOKEN';
  return hasToken;
}; 