const express = require('express');
const serverless = require('serverless-http');

const app = express();

app.use('*', (req, res) => {
  console.log('=== API TEST FUNCTION ===');
  console.log('Original URL:', req.url);
  console.log('Path:', req.path);
  console.log('Original Path:', req.originalUrl);
  console.log('Method:', req.method);
  
  res.json({
    message: 'API Test Function',
    url: req.url,
    path: req.path,
    originalUrl: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

module.exports.handler = serverless(app); 