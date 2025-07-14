const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

console.log('API function loaded');

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);

// Import routes
const weatherRoutes = require('./routes/weather');
const riverRoutes = require('./routes/rivers');
const floodRoutes = require('./routes/flood');
const reportRoutes = require('./routes/reports');

// Handle all routes with path parsing
app.use('*', (req, res, next) => {
  let originalUrl = req.originalUrl;
  // Strip Netlify function prefix if present
  originalUrl = originalUrl.replace(/^\/\.netlify\/functions\/api/, '');
  // Strip /api prefix if present
  originalUrl = originalUrl.replace(/^\/api/, '');

  console.log('Request originalUrl:', originalUrl);

  if (originalUrl.startsWith('/weather') || originalUrl.includes('/weather/')) {
    req.url = originalUrl.replace(/^\/weather/, '') || '/';
    return weatherRoutes(req, res, next);
  } else if (originalUrl.startsWith('/rivers') || originalUrl.includes('/rivers/')) {
    req.url = originalUrl.replace(/^\/rivers/, '') || '/';
    return riverRoutes(req, res, next);
  } else if (originalUrl.startsWith('/flood') || originalUrl.includes('/flood/')) {
    req.url = originalUrl.replace(/^\/flood/, '') || '/';
    return floodRoutes(req, res, next);
  } else if (originalUrl.startsWith('/reports') || originalUrl.includes('/reports/')) {
    req.url = originalUrl.replace(/^\/reports/, '') || '/';
    return reportRoutes(req, res, next);
  } else if (originalUrl === '/health' || originalUrl.endsWith('/health')) {
    console.log('Health check called');
    return res.json({ status: 'OK', timestamp: new Date().toISOString() });
  } else {
    return res.status(404).json({ error: 'Route not found', path: originalUrl });
  }
});

// Export the serverless function
module.exports.handler = serverless(app); 