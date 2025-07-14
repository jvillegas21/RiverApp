const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Enhanced compression with better settings
app.use(compression({
  level: 6, // Good balance between compression and speed
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Compress all compressible content
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Disable for API
}));

// CORS with proper settings
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] // Replace with actual production domain
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Enhanced rate limiting with different limits for different endpoints
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { 
    error: 'RATE_LIMIT_EXCEEDED', 
    message,
    retryAfter: Math.ceil(windowMs / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Different limits for different endpoints
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  }
});

// General API rate limiting
app.use('/api/', createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per 15 minutes
  'Too many API requests, please try again later'
));

// Stricter rate limiting for expensive operations
app.use('/api/flood/predict', createRateLimit(
  5 * 60 * 1000, // 5 minutes
  10, // 10 flood predictions per 5 minutes
  'Too many flood prediction requests, please try again later'
));

// Cache control middleware
app.use((req, res, next) => {
  // Set cache headers based on endpoint
  if (req.path.includes('/rivers/nearby') || req.path.includes('/weather/current')) {
    // Cache river and weather data for 2 minutes
    res.set({
      'Cache-Control': 'public, max-age=120, stale-while-revalidate=60',
      'ETag': `"${Date.now()}"`, // Simple ETag based on timestamp
      'Vary': 'Accept-Encoding'
    });
  } else if (req.path.includes('/flood/predict')) {
    // Cache flood predictions for 5 minutes
    res.set({
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=120',
      'ETag': `"${Date.now()}"`,
      'Vary': 'Accept-Encoding'
    });
  } else if (req.path === '/api/health') {
    // Don't cache health checks
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
  } else {
    // Default cache for other endpoints (1 minute)
    res.set({
      'Cache-Control': 'public, max-age=60',
      'Vary': 'Accept-Encoding'
    });
  }
  next();
});

// Import routes
const weatherRoutes = require('./routes/weather');
const riverRoutes = require('./routes/rivers');
const floodRoutes = require('./routes/flood');
const reportRoutes = require('./routes/reports');

// Routes
app.use('/api/weather', weatherRoutes);
app.use('/api/rivers', riverRoutes);
app.use('/api/flood', floodRoutes);
app.use('/api/reports', reportRoutes);

// Enhanced health check
app.get('/api/health', (req, res) => {
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    services: {
      usgs: 'operational', // Could be enhanced to actually check USGS API
      noaa: 'operational'  // Could be enhanced to actually check NOAA API
    }
  };
  
  res.json(healthData);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 