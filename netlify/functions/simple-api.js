const express = require('express');
const serverless = require('serverless-http');

const app = express();

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/test', (req, res) => {
  res.json({ message: 'Simple API working!' });
});

module.exports.handler = serverless(app); 