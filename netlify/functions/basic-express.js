const express = require('express');
const serverless = require('serverless-http');

const app = express();

// Handle all routes
app.get('*', (req, res) => {
  const path = req.path;
  
  if (path === '/health' || path.endsWith('/health')) {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  } else if (path === '/' || path.endsWith('/')) {
    res.json({ message: 'Basic Express working!' });
  } else {
    res.json({ 
      message: 'Basic Express working!', 
      path: path,
      timestamp: new Date().toISOString() 
    });
  }
});

module.exports.handler = serverless(app); 