import React, { useState, useEffect } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Container,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Grid,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Chip
} from '@mui/material';
import {
  Water as WaterIcon,
  LocationOn as LocationIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import MapComponent from './components/MapComponent';
import WaterLevelChart from './components/WaterLevelChart';
import AlertsList from './components/AlertsList';
import SiteDetails from './components/SiteDetails';
import axios from 'axios';

function App() {
  const [location, setLocation] = useState(null);
  const [waterData, setWaterData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your location. Please enable location services.');
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
      setLoading(false);
    }
  }, []);

  // Fetch water data when location is available
  useEffect(() => {
    if (location) {
      fetchWaterData();
      fetchAlerts();
    }
  }, [location]);

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    if (autoRefresh && location) {
      const interval = setInterval(() => {
        fetchWaterData();
        fetchAlerts();
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(interval);
    }
  }, [autoRefresh, location]);

  const fetchWaterData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/water-levels', {
        params: {
          lat: location.lat,
          lon: location.lon,
          radius: 50
        }
      });
      setWaterData(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching water data:', err);
      setError('Failed to fetch water level data');
      toast.error('Failed to fetch water level data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await axios.get('/api/flood-alerts', {
        params: {
          lat: location.lat,
          lon: location.lon,
          radius: 50
        }
      });
      setAlerts(response.data.alerts);
      
      // Show toast notifications for high-risk alerts
      response.data.alerts.forEach(alert => {
        if (alert.alert.risk === 'high') {
          toast.warning(`High flood risk at ${alert.name}!`, {
            position: "top-right",
            autoClose: false,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        }
      });
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  };

  const handleSiteSelect = (site) => {
    setSelectedSite(site);
  };

  const getAlertCount = () => {
    return {
      high: alerts.filter(a => a.alert.risk === 'high').length,
      medium: alerts.filter(a => a.alert.risk === 'medium').length,
      total: alerts.length
    };
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" sx={{ backgroundColor: '#1976d2' }}>
        <Toolbar>
          <WaterIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Flood Monitor - Real-time Water Level Tracking
          </Typography>
          {location && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <LocationIcon sx={{ mr: 1 }} />
              <Typography variant="body2">
                {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
              </Typography>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
        {loading && !waterData.length ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
            <CircularProgress />
          </Box>
        ) : error && !waterData.length ? (
          <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        ) : (
          <Grid container spacing={3}>
            {/* Alert Summary */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <WarningIcon sx={{ mr: 2, color: 'warning.main' }} />
                    <Typography variant="h6">Flood Alert Summary</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Chip 
                      label={`${getAlertCount().high} High Risk`} 
                      color="error" 
                      icon={<TrendingUpIcon />}
                    />
                    <Chip 
                      label={`${getAlertCount().medium} Medium Risk`} 
                      color="warning"
                      icon={<TrendingUpIcon />}
                    />
                    <Chip 
                      label={`${waterData.length} Total Sites`} 
                      color="primary"
                    />
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => {
                        fetchWaterData();
                        fetchAlerts();
                      }}
                    >
                      Refresh Data
                    </Button>
                  </Box>
                </Box>
              </Paper>
            </Grid>

            {/* Map */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ height: 500, position: 'relative' }}>
                <MapComponent
                  userLocation={location}
                  waterSites={waterData}
                  alerts={alerts}
                  onSiteSelect={handleSiteSelect}
                />
              </Paper>
            </Grid>

            {/* Alerts List */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ height: 500, overflow: 'auto' }}>
                <AlertsList 
                  alerts={alerts} 
                  onSiteSelect={handleSiteSelect}
                />
              </Paper>
            </Grid>

            {/* Selected Site Details */}
            {selectedSite && (
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <SiteDetails site={selectedSite} />
                </Paper>
              </Grid>
            )}

            {/* Water Level Chart */}
            {selectedSite && (
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <WaterLevelChart siteId={selectedSite.siteId} />
                </Paper>
              </Grid>
            )}
          </Grid>
        )}
      </Container>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </Box>
  );
}

export default App;