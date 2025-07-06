import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Shield, Globe, Save } from 'lucide-react';

interface EmergencyContact {
  name: string;
  phone: string;
  email: string;
}

interface SettingsState {
  notifications: {
    enabled: boolean;
    highRisk: boolean;
    mediumRisk: boolean;
    lowRisk: boolean;
    sound: boolean;
    vibration: boolean;
  };
  map: {
    defaultRadius: number;
    showWeather: boolean;
    showRivers: boolean;
    showFloodZones: boolean;
  };
  privacy: {
    shareLocation: boolean;
    allowAnalytics: boolean;
    emergencyContacts: EmergencyContact[];
  };
  units: {
    distance: string;
    temperature: string;
    flow: string;
  };
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsState>({
    notifications: {
      enabled: true,
      highRisk: true,
      mediumRisk: true,
      lowRisk: false,
      sound: true,
      vibration: true
    },
    map: {
      defaultRadius: 10,
      showWeather: true,
      showRivers: true,
      showFloodZones: true
    },
    privacy: {
      shareLocation: false,
      allowAnalytics: true,
      emergencyContacts: []
    },
    units: {
      distance: 'miles',
      temperature: 'fahrenheit',
      flow: 'cfs'
    }
  });

  const [newContact, setNewContact] = useState<EmergencyContact>({ name: '', phone: '', email: '' });

  const handleSettingChange = (category: keyof SettingsState, setting: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  const addEmergencyContact = () => {
    if (newContact.name && newContact.phone) {
      setSettings(prev => ({
        ...prev,
        privacy: {
          ...prev.privacy,
          emergencyContacts: [...prev.privacy.emergencyContacts, newContact]
        }
      }));
      setNewContact({ name: '', phone: '', email: '' });
    }
  };

  const removeEmergencyContact = (index: number) => {
    setSettings(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        emergencyContacts: prev.privacy.emergencyContacts.filter((_, i) => i !== index)
      }
    }));
  };

  const saveSettings = () => {
    // In a real app, this would save to localStorage or backend
    localStorage.setItem('floodAppSettings', JSON.stringify(settings));
    alert('Settings saved successfully!');
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <SettingsIcon className="w-8 h-8 mr-3" />
          Settings
        </h1>
        <p className="text-gray-600">Customize your flood detection app preferences</p>
      </div>

      <div className="space-y-6">
        {/* Notifications Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Notifications
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable Notifications</p>
                <p className="text-sm text-gray-600">Receive alerts about flood risks</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.enabled}
                  onChange={(e) => handleSettingChange('notifications', 'enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {settings.notifications.enabled && (
              <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm">High Risk Alerts</span>
                  <input
                    type="checkbox"
                    checked={settings.notifications.highRisk}
                    onChange={(e) => handleSettingChange('notifications', 'highRisk', e.target.checked)}
                    className="rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Medium Risk Alerts</span>
                  <input
                    type="checkbox"
                    checked={settings.notifications.mediumRisk}
                    onChange={(e) => handleSettingChange('notifications', 'mediumRisk', e.target.checked)}
                    className="rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Low Risk Alerts</span>
                  <input
                    type="checkbox"
                    checked={settings.notifications.lowRisk}
                    onChange={(e) => handleSettingChange('notifications', 'lowRisk', e.target.checked)}
                    className="rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sound Alerts</span>
                  <input
                    type="checkbox"
                    checked={settings.notifications.sound}
                    onChange={(e) => handleSettingChange('notifications', 'sound', e.target.checked)}
                    className="rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Vibration Alerts</span>
                  <input
                    type="checkbox"
                    checked={settings.notifications.vibration}
                    onChange={(e) => handleSettingChange('notifications', 'vibration', e.target.checked)}
                    className="rounded"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            Map Settings
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Search Radius: {settings.map.defaultRadius} miles
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={settings.map.defaultRadius}
                onChange={(e) => handleSettingChange('map', 'defaultRadius', parseInt(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Show Weather Overlay</span>
              <input
                type="checkbox"
                checked={settings.map.showWeather}
                onChange={(e) => handleSettingChange('map', 'showWeather', e.target.checked)}
                className="rounded"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Show River Markers</span>
              <input
                type="checkbox"
                checked={settings.map.showRivers}
                onChange={(e) => handleSettingChange('map', 'showRivers', e.target.checked)}
                className="rounded"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm">Show Flood Zones</span>
              <input
                type="checkbox"
                checked={settings.map.showFloodZones}
                onChange={(e) => handleSettingChange('map', 'showFloodZones', e.target.checked)}
                className="rounded"
              />
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Privacy & Emergency Contacts
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Share Location Data</p>
                <p className="text-sm text-gray-600">Allow app to use your location for flood detection</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.privacy.shareLocation}
                  onChange={(e) => handleSettingChange('privacy', 'shareLocation', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Allow Analytics</p>
                <p className="text-sm text-gray-600">Help improve the app with anonymous usage data</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.privacy.allowAnalytics}
                  onChange={(e) => handleSettingChange('privacy', 'allowAnalytics', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Emergency Contacts */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Emergency Contacts</h3>
              
              <div className="space-y-3">
                {settings.privacy.emergencyContacts.map((contact, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-sm text-gray-600">{contact.phone}</p>
                      {contact.email && <p className="text-sm text-gray-600">{contact.email}</p>}
                    </div>
                    <button
                      onClick={() => removeEmergencyContact(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 border-2 border-dashed border-gray-300 rounded-lg">
                <h4 className="font-medium mb-3">Add New Contact</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Name"
                    value={newContact.name}
                    onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={newContact.phone}
                    onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    value={newContact.email}
                    onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={addEmergencyContact}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Contact
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Units Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Units</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Distance
              </label>
              <select
                value={settings.units.distance}
                onChange={(e) => handleSettingChange('units', 'distance', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="miles">Miles</option>
                <option value="kilometers">Kilometers</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature
              </label>
              <select
                value={settings.units.temperature}
                onChange={(e) => handleSettingChange('units', 'temperature', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="fahrenheit">Fahrenheit</option>
                <option value="celsius">Celsius</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Flow Rate
              </label>
              <select
                value={settings.units.flow}
                onChange={(e) => handleSettingChange('units', 'flow', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="cfs">Cubic Feet/Second</option>
                <option value="cms">Cubic Meters/Second</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-5 h-5" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings; 