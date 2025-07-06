import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Box, Typography, CircularProgress, ToggleButton, ToggleButtonGroup } from '@mui/material';
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const WaterLevelChart = ({ siteId }) => {
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(7);
  const [selectedMetric, setSelectedMetric] = useState('Gage height, feet');

  useEffect(() => {
    fetchTrendData();
  }, [siteId, timeRange]);

  const fetchTrendData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/water-trends/${siteId}`, {
        params: { days: timeRange }
      });
      setTrendData(response.data.trends);
      setError(null);
    } catch (err) {
      console.error('Error fetching trend data:', err);
      setError('Failed to fetch trend data');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (event, newRange) => {
    if (newRange !== null) {
      setTimeRange(newRange);
    }
  };

  const handleMetricChange = (event, newMetric) => {
    if (newMetric !== null) {
      setSelectedMetric(newMetric);
    }
  };

  const prepareChartData = () => {
    if (!trendData || !trendData[selectedMetric]) {
      return null;
    }

    const metricData = trendData[selectedMetric];
    const dailyData = metricData.dailyAverages || [];

    return {
      labels: dailyData.map(d => new Date(d.date).toLocaleDateString()),
      datasets: [
        {
          label: 'Average',
          data: dailyData.map(d => d.average),
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Maximum',
          data: dailyData.map(d => d.max),
          borderColor: '#d32f2f',
          backgroundColor: 'rgba(211, 47, 47, 0.1)',
          tension: 0.4,
          borderDash: [5, 5],
        },
        {
          label: 'Minimum',
          data: dailyData.map(d => d.min),
          borderColor: '#388e3c',
          backgroundColor: 'rgba(56, 142, 60, 0.1)',
          tension: 0.4,
          borderDash: [5, 5],
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `${selectedMetric} - ${timeRange} Day Trend`,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: selectedMetric,
        },
      },
      x: {
        title: {
          display: true,
          text: 'Date',
        },
      },
    },
  };

  const getTrendSummary = () => {
    if (!trendData || !trendData[selectedMetric]) return null;
    
    const trend = trendData[selectedMetric].overallTrend;
    const current = trendData[selectedMetric].current;
    
    const trendColors = {
      'significantly_rising': '#d32f2f',
      'rising': '#f57c00',
      'stable': '#388e3c',
      'falling': '#1976d2',
      'significantly_falling': '#0d47a1',
      'insufficient_data': '#757575'
    };
    
    const trendLabels = {
      'significantly_rising': 'Significantly Rising',
      'rising': 'Rising',
      'stable': 'Stable',
      'falling': 'Falling',
      'significantly_falling': 'Significantly Falling',
      'insufficient_data': 'Insufficient Data'
    };
    
    return {
      label: trendLabels[trend] || 'Unknown',
      color: trendColors[trend] || '#757575',
      current: current
    };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  const chartData = prepareChartData();
  const trendSummary = getTrendSummary();
  const availableMetrics = trendData ? Object.keys(trendData) : [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Water Level Trends</Typography>
        {trendSummary && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Current: {trendSummary.current?.toFixed(2)}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: trendSummary.color,
                fontWeight: 'bold',
                padding: '4px 12px',
                backgroundColor: `${trendSummary.color}20`,
                borderRadius: 2
              }}
            >
              {trendSummary.label}
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={handleTimeRangeChange}
          size="small"
        >
          <ToggleButton value={1}>24h</ToggleButton>
          <ToggleButton value={7}>7d</ToggleButton>
          <ToggleButton value={14}>14d</ToggleButton>
          <ToggleButton value={30}>30d</ToggleButton>
        </ToggleButtonGroup>

        {availableMetrics.length > 1 && (
          <ToggleButtonGroup
            value={selectedMetric}
            exclusive
            onChange={handleMetricChange}
            size="small"
          >
            {availableMetrics.map(metric => (
              <ToggleButton key={metric} value={metric}>
                {metric.includes('Gage') ? 'Water Level' : 'Flow Rate'}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        )}
      </Box>

      {chartData ? (
        <Box sx={{ height: 300 }}>
          <Line data={chartData} options={chartOptions} />
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          No data available for the selected metric
        </Typography>
      )}
    </Box>
  );
};

export default WaterLevelChart;