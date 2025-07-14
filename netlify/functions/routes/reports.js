const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// In-memory storage for reports
const reports = [];

// Helper to check if a report is expired (older than 48 hours and no upvotes)
function isReportExpired(report) {
  const now = Date.now();
  const created = new Date(report.timestamp).getTime();
  const ageMs = now - created;
  return ageMs > 48 * 60 * 60 * 1000 && (report.upvotes || 0) === 0;
}

// GET /api/reports - List all reports
router.get('/', (req, res) => {
  // Remove expired reports (older than 48h and no upvotes)
  for (let i = reports.length - 1; i >= 0; i--) {
    if (isReportExpired(reports[i])) {
      reports.splice(i, 1);
    }
  }
  // Sort by most recent
  const sorted = reports.slice().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(sorted);
});

// POST /api/reports - Submit a new report
router.post('/', (req, res) => {
  const { lat, lng, description, photoUrl } = req.body;
  if (!lat || !lng || !description) {
    return res.status(400).json({ error: 'lat, lng, and description are required' });
  }
  const report = {
    id: uuidv4(),
    lat,
    lng,
    description,
    photoUrl: photoUrl || null,
    timestamp: new Date().toISOString(),
    flagged: false,
    upvotes: 0,
    downvotes: 0
  };
  reports.push(report);
  res.status(201).json(report);
});

// PATCH /api/reports/:id/flag - Flag a report
router.patch('/:id/flag', (req, res) => {
  const { id } = req.params;
  const report = reports.find(r => r.id === id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  report.flagged = true;
  res.json({ success: true });
});

// PATCH /api/reports/:id/upvote - Upvote a report
router.patch('/:id/upvote', (req, res) => {
  const { id } = req.params;
  const report = reports.find(r => r.id === id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  report.upvotes = (report.upvotes || 0) + 1;
  res.json({ success: true, upvotes: report.upvotes });
});

// PATCH /api/reports/:id/downvote - Downvote a report
router.patch('/:id/downvote', (req, res) => {
  const { id } = req.params;
  const reportIdx = reports.findIndex(r => r.id === id);
  if (reportIdx === -1) {
    return res.status(404).json({ error: 'Report not found' });
  }
  const report = reports[reportIdx];
  report.downvotes = (report.downvotes || 0) + 1;
  if (report.downvotes >= 3) {
    reports.splice(reportIdx, 1);
    return res.json({ success: true, deleted: true });
  }
  res.json({ success: true, downvotes: report.downvotes });
});

module.exports = router; 