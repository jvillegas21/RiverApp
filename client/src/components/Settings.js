import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  Settings as SettingsIcon, 
  Bell, 
  MapPin, 
  Clock, 
  AlertTriangle,
  Save,
  RotateCcw,
  Shield,
  Info,
  Activity
} from 'lucide-react';

const Settings = () => {
  const [settings, setSettings] = useState({
    notifications: {
      enabled: true,
      floodAlerts: true,
      waterLevelChanges: true,
      systemUpdates: false,
      pushNotifications: false
    },
    monitoring: {
      updateInterval: 15, // minutes
      searchRadius: 50, // kilometers
      autoRefresh: true,
      showAllSites: false
    },
    display: {
      mapLayer: 'osm',
      showFloodRisk: true,
      theme: 'auto',
      units: 'metric'
    },
    privacy: {
      shareLocation: true,
      allowAnalytics: false,
      storeHistory: true
    }
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('floodwatch-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  const updateSetting = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const saveSettings = () => {
    try {
      localStorage.setItem('floodwatch-settings', JSON.stringify(settings));
      setHasChanges(false);
      toast.success('Settings saved successfully');
      
      // Request notification permission if notifications are enabled
      if (settings.notifications.enabled && settings.notifications.pushNotifications) {
        requestNotificationPermission();
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  const resetSettings = () => {
    const defaultSettings = {
      notifications: {
        enabled: true,
        floodAlerts: true,
        waterLevelChanges: true,
        systemUpdates: false,
        pushNotifications: false
      },
      monitoring: {
        updateInterval: 15,
        searchRadius: 50,
        autoRefresh: true,
        showAllSites: false
      },
      display: {
        mapLayer: 'osm',
        showFloodRisk: true,
        theme: 'auto',
        units: 'metric'
      },
      privacy: {
        shareLocation: true,
        allowAnalytics: false,
        storeHistory: true
      }
    };
    
    setSettings(defaultSettings);
    setHasChanges(true);
    toast.success('Settings reset to defaults');
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          toast.success('Push notifications enabled');
        } else {
          toast.error('Notification permission denied');
          updateSetting('notifications', 'pushNotifications', false);
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        toast.error('Failed to request notification permission');
      }
    } else {
      toast.error('Your browser does not support notifications');
      updateSetting('notifications', 'pushNotifications', false);
    }
  };

  const SettingSection = ({ title, icon: Icon, children }) => (
    <div className="setting-section">
      <div className="section-header">
        <Icon className="section-icon" />
        <h3 className="section-title">{title}</h3>
      </div>
      <div className="section-content">
        {children}
      </div>
    </div>
  );

  const ToggleSwitch = ({ checked, onChange, label, description }) => (
    <div className="setting-item">
      <div className="setting-info">
        <label className="setting-label">{label}</label>
        {description && <p className="setting-description">{description}</p>}
      </div>
      <div className="toggle-switch" onClick={() => onChange(!checked)}>
        <div className={`toggle-slider ${checked ? 'active' : ''}`}>
          <div className="toggle-knob"></div>
        </div>
      </div>
    </div>
  );

  const SelectField = ({ value, onChange, options, label, description }) => (
    <div className="setting-item">
      <div className="setting-info">
        <label className="setting-label">{label}</label>
        {description && <p className="setting-description">{description}</p>}
      </div>
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="setting-select"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  const NumberField = ({ value, onChange, min, max, step, label, description, unit }) => (
    <div className="setting-item">
      <div className="setting-info">
        <label className="setting-label">{label}</label>
        {description && <p className="setting-description">{description}</p>}
      </div>
      <div className="number-input">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="setting-number"
        />
        {unit && <span className="input-unit">{unit}</span>}
      </div>
    </div>
  );

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <div className="settings-actions">
          <button 
            onClick={resetSettings}
            className="btn btn-secondary"
          >
            <RotateCcw size={18} />
            Reset to Defaults
          </button>
          <button 
            onClick={saveSettings}
            className={`btn ${hasChanges ? 'btn-primary' : 'btn-disabled'}`}
            disabled={!hasChanges}
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </div>

      <div className="settings-content">
        <SettingSection title="Notifications" icon={Bell}>
          <ToggleSwitch
            checked={settings.notifications.enabled}
            onChange={(value) => updateSetting('notifications', 'enabled', value)}
            label="Enable Notifications"
            description="Allow the app to send you important alerts and updates"
          />
          
          <ToggleSwitch
            checked={settings.notifications.floodAlerts}
            onChange={(value) => updateSetting('notifications', 'floodAlerts', value)}
            label="Flood Risk Alerts"
            description="Get notified when flood risk levels change in your area"
          />
          
          <ToggleSwitch
            checked={settings.notifications.waterLevelChanges}
            onChange={(value) => updateSetting('notifications', 'waterLevelChanges', value)}
            label="Water Level Changes"
            description="Receive alerts when nearby water levels show significant changes"
          />
          
          <ToggleSwitch
            checked={settings.notifications.pushNotifications}
            onChange={(value) => updateSetting('notifications', 'pushNotifications', value)}
            label="Push Notifications"
            description="Send notifications even when the app is closed"
          />
        </SettingSection>

        <SettingSection title="Monitoring" icon={Activity}>
          <NumberField
            value={settings.monitoring.updateInterval}
            onChange={(value) => updateSetting('monitoring', 'updateInterval', value)}
            min={5}
            max={60}
            step={5}
            label="Update Interval"
            description="How often to refresh water level data"
            unit="minutes"
          />
          
          <NumberField
            value={settings.monitoring.searchRadius}
            onChange={(value) => updateSetting('monitoring', 'searchRadius', value)}
            min={10}
            max={100}
            step={10}
            label="Search Radius"
            description="Distance to search for monitoring sites from your location"
            unit="km"
          />
          
          <ToggleSwitch
            checked={settings.monitoring.autoRefresh}
            onChange={(value) => updateSetting('monitoring', 'autoRefresh', value)}
            label="Auto Refresh"
            description="Automatically update data at the specified interval"
          />
          
          <ToggleSwitch
            checked={settings.monitoring.showAllSites}
            onChange={(value) => updateSetting('monitoring', 'showAllSites', value)}
            label="Show All Sites"
            description="Display all monitoring sites, not just the closest ones"
          />
        </SettingSection>

        <SettingSection title="Display" icon={MapPin}>
          <SelectField
            value={settings.display.mapLayer}
            onChange={(value) => updateSetting('display', 'mapLayer', value)}
            options={[
              { value: 'osm', label: 'Street Map' },
              { value: 'satellite', label: 'Satellite View' },
              { value: 'terrain', label: 'Terrain Map' }
            ]}
            label="Default Map Layer"
            description="Choose the default map style for the map view"
          />
          
          <SelectField
            value={settings.display.units}
            onChange={(value) => updateSetting('display', 'units', value)}
            options={[
              { value: 'metric', label: 'Metric (meters, km)' },
              { value: 'imperial', label: 'Imperial (feet, miles)' }
            ]}
            label="Units"
            description="Display units for measurements"
          />
          
          <ToggleSwitch
            checked={settings.display.showFloodRisk}
            onChange={(value) => updateSetting('display', 'showFloodRisk', value)}
            label="Show Flood Risk Zones"
            description="Display flood risk visualization on maps"
          />
        </SettingSection>

        <SettingSection title="Privacy & Data" icon={Shield}>
          <ToggleSwitch
            checked={settings.privacy.shareLocation}
            onChange={(value) => updateSetting('privacy', 'shareLocation', value)}
            label="Share Location"
            description="Allow the app to access your location for monitoring"
          />
          
          <ToggleSwitch
            checked={settings.privacy.storeHistory}
            onChange={(value) => updateSetting('privacy', 'storeHistory', value)}
            label="Store History"
            description="Keep a local history of your flood monitoring data"
          />
          
          <ToggleSwitch
            checked={settings.privacy.allowAnalytics}
            onChange={(value) => updateSetting('privacy', 'allowAnalytics', value)}
            label="Anonymous Analytics"
            description="Help improve the app by sharing anonymous usage data"
          />
        </SettingSection>

        <div className="settings-info">
          <div className="info-card">
            <Info className="info-icon" />
            <div className="info-content">
              <h4>About FloodWatch</h4>
              <p>
                FloodWatch provides real-time flood monitoring using data from USGS water monitoring stations
                and NOAA flood prediction services. All data is updated regularly to provide accurate flood risk assessments.
              </p>
              <p>
                <strong>Data Sources:</strong> USGS Water Services, NOAA National Water Prediction Service, Open Elevation API
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .settings-page {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
        }
        
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        
        .settings-header h1 {
          color: white;
          font-size: 2rem;
          font-weight: 700;
          margin: 0;
        }
        
        .settings-actions {
          display: flex;
          gap: 1rem;
        }
        
        .btn-disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .settings-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        
        .setting-section {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        
        .section-header {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid rgba(102, 126, 234, 0.1);
        }
        
        .section-icon {
          width: 24px;
          height: 24px;
          color: #667eea;
        }
        
        .section-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #333;
          margin: 0;
        }
        
        .section-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .setting-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }
        
        .setting-info {
          flex: 1;
        }
        
        .setting-label {
          display: block;
          font-weight: 600;
          color: #333;
          margin-bottom: 0.25rem;
        }
        
        .setting-description {
          color: #666;
          font-size: 0.9rem;
          margin: 0;
          line-height: 1.4;
        }
        
        .toggle-switch {
          width: 48px;
          height: 24px;
          background: #ddd;
          border-radius: 12px;
          cursor: pointer;
          transition: background-color 0.3s ease;
          position: relative;
          flex-shrink: 0;
        }
        
        .toggle-switch.active {
          background: #667eea;
        }
        
        .toggle-slider {
          width: 100%;
          height: 100%;
          position: relative;
        }
        
        .toggle-knob {
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 2px;
          left: 2px;
          transition: transform 0.3s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .toggle-switch.active .toggle-knob {
          transform: translateX(24px);
        }
        
        .setting-select {
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.5rem;
          font-weight: 600;
          color: #333;
          cursor: pointer;
          min-width: 150px;
        }
        
        .setting-select:focus {
          outline: none;
          border-color: #667eea;
        }
        
        .number-input {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .setting-number {
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          padding: 0.5rem;
          font-weight: 600;
          color: #333;
          width: 80px;
          text-align: center;
        }
        
        .setting-number:focus {
          outline: none;
          border-color: #667eea;
        }
        
        .input-unit {
          color: #666;
          font-size: 0.9rem;
          font-weight: 600;
        }
        
        .settings-info {
          margin-top: 2rem;
        }
        
        .info-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-radius: 15px;
          padding: 1.5rem;
          display: flex;
          gap: 1rem;
          border-left: 4px solid #667eea;
        }
        
        .info-icon {
          width: 24px;
          height: 24px;
          color: #667eea;
          flex-shrink: 0;
          margin-top: 0.25rem;
        }
        
        .info-content h4 {
          margin: 0 0 0.5rem 0;
          color: #333;
          font-size: 1.1rem;
        }
        
        .info-content p {
          margin: 0.5rem 0;
          color: #666;
          line-height: 1.5;
          font-size: 0.9rem;
        }
        
        @media (max-width: 768px) {
          .settings-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
          
          .settings-header h1 {
            font-size: 1.5rem;
          }
          
          .setting-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
          
          .setting-select,
          .number-input {
            align-self: flex-start;
          }
          
          .info-card {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
};

export default Settings;