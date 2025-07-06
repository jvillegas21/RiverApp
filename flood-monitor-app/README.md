# Flood Monitor - Real-time Water Level Tracking

A web application that monitors water levels in nearby rivers and creeks to provide real-time flood alerts and help communities prepare for potential flooding.

## Features

- **Real-time Water Level Monitoring**: Tracks water levels from USGS monitoring stations
- **Geolocation-based Alerts**: Automatically finds water bodies near your location
- **Interactive Map**: Visual representation of monitoring sites with risk indicators
- **Trend Analysis**: Historical water level charts showing rising/falling trends
- **Smart Alerts**: Risk assessment based on water level changes and flow rates
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

### Backend
- Node.js with Express.js
- USGS Water Services API integration
- Real-time data processing

### Frontend
- React 18
- Material-UI for modern UI components
- Leaflet for interactive maps
- Chart.js for data visualization
- Axios for API communication

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd flood-monitor-app
```

2. Install backend dependencies
```bash
cd server
npm install
```

3. Install frontend dependencies
```bash
cd ../client
npm install
```

### Running the Application

1. Start the backend server (from the server directory)
```bash
cd server
npm start
```
The server will run on http://localhost:5000

2. Start the React development server (from the client directory in a new terminal)
```bash
cd client
npm start
```
The application will open in your browser at http://localhost:3000

## How It Works

1. **Location Detection**: The app requests your location to find nearby water monitoring stations
2. **Data Collection**: Fetches real-time water level data from USGS API
3. **Risk Analysis**: Analyzes water levels and trends to identify flood risks
4. **Alert Generation**: Creates alerts for sites with rising water levels
5. **Visualization**: Displays data on an interactive map and charts

## API Endpoints

- `GET /api/water-levels?lat={latitude}&lon={longitude}&radius={radius}` - Get water levels for nearby stations
- `GET /api/water-trends/:siteId?days={days}` - Get historical trends for a specific site
- `GET /api/flood-alerts?lat={latitude}&lon={longitude}&radius={radius}` - Get flood alerts for the area

## Data Sources

This application uses data from:
- **USGS Water Services**: Real-time water data from the United States Geological Survey
- **OpenStreetMap**: Map tiles and geographical data

## Important Notes

- Water level thresholds for flood risk are approximate and may vary by location
- Always follow official emergency guidance from local authorities
- The app requires location permissions to function properly
- Data updates every 5 minutes automatically

## Future Enhancements

- Push notifications for critical alerts
- Weather data integration for better predictions
- Historical flood data overlay
- Community reporting features
- Multi-language support

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.