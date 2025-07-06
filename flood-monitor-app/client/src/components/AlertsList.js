import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
  Chip,
  Divider,
  ListItemButton,
  Alert as MuiAlert
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon
} from '@mui/icons-material';

const AlertsList = ({ alerts, onSiteSelect }) => {
  const getRiskIcon = (risk) => {
    switch (risk) {
      case 'high':
        return <ErrorIcon sx={{ color: '#d32f2f' }} />;
      case 'medium':
        return <WarningIcon sx={{ color: '#f57c00' }} />;
      default:
        return <WarningIcon sx={{ color: '#388e3c' }} />;
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'success';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffMins < 1440) {
      return `${Math.floor(diffMins / 60)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatMeasurement = (measurement) => {
    if (!measurement) return 'N/A';
    return `${measurement.value.toFixed(2)} ${measurement.unit}`;
  };

  if (alerts.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <MuiAlert severity="success" variant="filled">
          <Typography variant="body1">
            No flood alerts in your area. All monitored sites are at normal levels.
          </Typography>
        </MuiAlert>
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <img 
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Ccircle cx='100' cy='100' r='80' fill='%234caf50' opacity='0.2'/%3E%3Cpath d='M85 100 L95 110 L115 90' stroke='%234caf50' stroke-width='8' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"
            alt="All clear"
            style={{ width: 100, height: 100, opacity: 0.5 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Monitoring {alerts.length || 0} locations
          </Typography>
        </Box>
      </Box>
    );
  }

  const sortedAlerts = [...alerts].sort((a, b) => {
    const riskOrder = { high: 0, medium: 1, low: 2 };
    return riskOrder[a.alert.risk] - riskOrder[b.alert.risk];
  });

  return (
    <Box>
      <Box sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
        <Typography variant="h6" gutterBottom>
          Active Flood Alerts
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Click on an alert to view details
        </Typography>
      </Box>
      
      <List sx={{ pt: 0 }}>
        {sortedAlerts.map((alert, index) => (
          <React.Fragment key={alert.siteId}>
            <ListItem disablePadding>
              <ListItemButton onClick={() => onSiteSelect(alert)}>
                <ListItemIcon>
                  {getRiskIcon(alert.alert.risk)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                        {alert.name}
                      </Typography>
                      <Chip
                        label={alert.alert.risk.toUpperCase()}
                        color={getRiskColor(alert.alert.risk)}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      {/* Alert Reasons */}
                      <Box sx={{ mb: 1 }}>
                        {alert.alert.reasons.map((reason, idx) => (
                          <Typography
                            key={idx}
                            variant="body2"
                            color="text.secondary"
                            sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                          >
                            <TrendingUpIcon sx={{ fontSize: 16 }} />
                            {reason}
                          </Typography>
                        ))}
                      </Box>
                      
                      {/* Measurements */}
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {alert.measurements['Gage height, feet'] && (
                          <Typography variant="caption" color="text.secondary">
                            Water Level: {formatMeasurement(alert.measurements['Gage height, feet'])}
                            {alert.measurements['Gage height, feet'].trend && (
                              <Chip
                                label={alert.measurements['Gage height, feet'].trend}
                                size="small"
                                sx={{ ml: 1, height: 16, fontSize: '0.7rem' }}
                                color={alert.measurements['Gage height, feet'].trend === 'rising' ? 'warning' : 'default'}
                              />
                            )}
                          </Typography>
                        )}
                        
                        {alert.measurements['Discharge, cubic feet per second'] && (
                          <Typography variant="caption" color="text.secondary">
                            Flow Rate: {formatMeasurement(alert.measurements['Discharge, cubic feet per second'])}
                          </Typography>
                        )}
                      </Box>
                      
                      {/* Timestamp */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
                        <TimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          Updated {formatTimestamp(alert.alert.timestamp)}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              </ListItemButton>
            </ListItem>
            {index < sortedAlerts.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Box>
  );
};

export default AlertsList;