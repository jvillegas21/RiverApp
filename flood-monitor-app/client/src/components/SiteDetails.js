import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Paper,
  Divider
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Water as WaterIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as StableIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';

const SiteDetails = ({ site }) => {
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'rising':
        return <TrendingUpIcon sx={{ fontSize: 16, color: '#f57c00' }} />;
      case 'falling':
        return <TrendingDownIcon sx={{ fontSize: 16, color: '#1976d2' }} />;
      default:
        return <StableIcon sx={{ fontSize: 16, color: '#388e3c' }} />;
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'rising':
        return '#f57c00';
      case 'falling':
        return '#1976d2';
      default:
        return '#388e3c';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatCoordinates = (lat, lon) => {
    return `${lat.toFixed(6)}°, ${lon.toFixed(6)}°`;
  };

  const getMeasurementIcon = (description) => {
    if (description.includes('Gage') || description.includes('height')) {
      return <WaterIcon sx={{ fontSize: 20, color: '#1976d2' }} />;
    }
    if (description.includes('Discharge') || description.includes('flow')) {
      return <SpeedIcon sx={{ fontSize: 20, color: '#0d47a1' }} />;
    }
    return null;
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          {site.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
          <LocationIcon sx={{ fontSize: 18 }} />
          <Typography variant="body2">
            {formatCoordinates(site.latitude, site.longitude)}
          </Typography>
          <Chip
            label={`Site ID: ${site.siteId}`}
            size="small"
            variant="outlined"
            sx={{ ml: 1 }}
          />
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
        Current Measurements
      </Typography>

      {Object.entries(site.measurements).length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No measurement data available for this site.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {Object.entries(site.measurements).map(([key, measurement]) => (
            <Grid item xs={12} key={key}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #e0e0e0',
                  borderRadius: 2
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    {getMeasurementIcon(key)}
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        {key}
                      </Typography>
                      <Typography variant="h5" sx={{ fontWeight: 'medium', mt: 0.5 }}>
                        {measurement.value.toFixed(2)} {measurement.unit}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ textAlign: 'right' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                      {getTrendIcon(measurement.trend)}
                      <Chip
                        label={measurement.trend.toUpperCase()}
                        size="small"
                        sx={{
                          backgroundColor: `${getTrendColor(measurement.trend)}20`,
                          color: getTrendColor(measurement.trend),
                          fontWeight: 'bold'
                        }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <TimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {formatTimestamp(measurement.timestamp)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {site.alert && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'medium' }}>
            Alert Information
          </Typography>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              backgroundColor: site.alert.risk === 'high' ? '#ffebee' : '#fff3e0',
              border: `1px solid ${site.alert.risk === 'high' ? '#ef5350' : '#ff9800'}`,
              borderRadius: 2
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'medium' }}>
                Risk Level
              </Typography>
              <Chip
                label={site.alert.risk.toUpperCase()}
                color={site.alert.risk === 'high' ? 'error' : 'warning'}
                size="small"
                sx={{ fontWeight: 'bold' }}
              />
            </Box>
            {site.alert.reasons.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Reasons:
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {site.alert.reasons.map((reason, idx) => (
                    <li key={idx}>
                      <Typography variant="body2" color="text.secondary">
                        {reason}
                      </Typography>
                    </li>
                  ))}
                </ul>
              </Box>
            )}
          </Paper>
        </>
      )}

      <Box sx={{ mt: 3, p: 2, backgroundColor: '#e3f2fd', borderRadius: 2 }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Note:</strong> Water level thresholds and flood risk assessments are approximate. 
          Always follow official emergency guidance from local authorities.
        </Typography>
      </Box>
    </Box>
  );
};

export default SiteDetails;