# FloodWatch - Real-time Flood Monitoring Application

FloodWatch is a comprehensive web application that provides real-time flood monitoring and risk assessment using geolocation and multiple geological data APIs. The application helps users stay informed about flood risks in their area by integrating data from USGS water monitoring stations, NOAA flood prediction services, and elevation APIs.

## 🌊 Features

### Core Functionality
- **Real-time Water Level Monitoring**: Live data from USGS water monitoring stations
- **Flood Risk Assessment**: Intelligent risk calculation based on elevation, proximity to water sources, and historical data
- **Interactive Maps**: Leaflet-based mapping with multiple layer options (street, satellite, terrain)
- **Geolocation Integration**: Automatic detection of user location for personalized monitoring
- **Real-time Updates**: WebSocket connections for live data updates
- **Mobile Responsive**: Optimized for both desktop and mobile devices

### Data Sources
- **USGS Water Services**: Real-time and historical water level data
- **NOAA National Water Prediction Service**: Flood forecasts and predictions
- **Open Elevation API**: Topographical elevation data
- **Multiple Map Providers**: OpenStreetMap, Esri Satellite, OpenTopoMap

### User Interface
- **Modern Dashboard**: Clean, intuitive interface with glassmorphism design
- **Interactive Charts**: Real-time water level trend visualization
- **Customizable Settings**: Notification preferences, monitoring intervals, and display options
- **Dark/Light Theme Support**: Automatic theme detection with manual override
- **Progressive Web App**: Can be installed on mobile devices for native-like experience

## 🚀 Quick Start

### Prerequisites
- Node.js 18.0 or higher
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/floodwatch.git
   cd floodwatch
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   cd ..
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

This will start both the Express backend server (port 5000) and React development server (port 3000).

4. **Access the application**
   - Open your browser and navigate to `http://localhost:3000`
   - Allow location access when prompted for full functionality

## 🏗️ Project Structure

```
floodwatch/
├── client/                     # React frontend application
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── Dashboard.js    # Main dashboard view
│   │   │   ├── MapView.js      # Interactive map component
│   │   │   ├── WaterLevelChart.js # Chart visualization
│   │   │   ├── NearbyMonitoringSites.js
│   │   │   └── Settings.js     # Application settings
│   │   ├── hooks/              # Custom React hooks
│   │   │   ├── useGeolocation.js
│   │   │   └── useWebSocket.js
│   │   ├── utils/              # Utility functions
│   │   ├── styles/             # CSS and styling
│   │   ├── App.js              # Main application component
│   │   └── index.js            # React entry point
│   ├── public/                 # Static files
│   └── package.json            # Client dependencies
├── server.js                   # Express backend server
├── package.json                # Server dependencies
└── README.md                   # Project documentation
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory for custom configuration:

```env
PORT=5000
WEBSOCKET_PORT=8080
NODE_ENV=development
```

### API Rate Limits

The application respects API rate limits:
- **USGS Water Services**: No authentication required, reasonable use policy
- **Open Elevation API**: 1000 requests/month free tier
- **NOAA Services**: No authentication required for basic access

## 📊 API Endpoints

### Backend API Routes

#### Water Monitoring
- `GET /api/nearby-sites` - Get nearby USGS monitoring sites
  - Query params: `lat`, `lon`, `radius` (optional, default 50km)
- `GET /api/water-levels/:siteId` - Get water level data for specific site
  - Query params: `days` (optional, default 7)

#### Risk Assessment
- `GET /api/flood-risk` - Get flood risk assessment for location
  - Query params: `lat`, `lon`
- `GET /api/flood-forecast` - Get NOAA flood forecast data
  - Query params: `lat`, `lon`

#### System
- `GET /api/health` - Health check endpoint

### External APIs Used

#### USGS Water Services
```
Base URL: https://waterservices.usgs.gov/nwis/
Endpoints:
- /site/ - Site information
- /iv/ - Instantaneous values (real-time data)
- /dv/ - Daily values (historical data)
```

#### NOAA Water Prediction Service
```
Base URL: https://water.noaa.gov/about/api
Features:
- Real-time streamflow forecasts
- Flood impact predictions
- Hydrologic ensemble forecasts
```

#### Open Elevation API
```
Base URL: https://api.opentopodata.org/v1/
Endpoints:
- /ned10m - 10m resolution elevation data for USA
- /aster30m - 30m global elevation data
```

## 🔄 Real-time Features

### WebSocket Connection
The application maintains a WebSocket connection for real-time updates:
- Automatic reconnection with exponential backoff
- Real-time water level updates
- Flood alert notifications
- Connection status indicator

### Data Refresh
- Automatic data refresh every 15 minutes (configurable)
- Manual refresh capability
- Smart caching to minimize API calls
- Offline support with cached data

## 📱 Mobile Support

### Responsive Design
- Mobile-first CSS design
- Touch-friendly interface
- Optimized map controls for mobile
- Collapsible navigation menu

### Progressive Web App (PWA)
- Installable on mobile devices
- Offline functionality
- Push notification support
- App-like experience

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start both client and server in development mode
npm run server       # Start only the Express server
npm run client       # Start only the React development server

# Production
npm run build        # Build the React app for production
npm start           # Start the production server

# Utilities
npm run install-client  # Install client dependencies
```

### Code Quality
- ESLint configuration for JavaScript
- Prettier for code formatting
- React best practices
- Error boundaries for robust error handling

### Testing
```bash
# Run client tests
cd client
npm test

# Run with coverage
npm test -- --coverage
```

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure proper port settings
3. Set up reverse proxy (nginx recommended)
4. Enable HTTPS for geolocation API access

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## 🔒 Security & Privacy

### Data Protection
- No personal data stored on servers
- Location data processed locally
- HTTPS required for geolocation access
- CORS protection enabled

### API Security
- Rate limiting on backend endpoints
- Input validation and sanitization
- Helmet.js security headers
- Environment variable protection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style
- Add tests for new features
- Update documentation as needed
- Ensure mobile compatibility

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **USGS** for providing comprehensive water monitoring data
- **NOAA** for flood prediction and forecasting services
- **OpenTopoData** for elevation API services
- **Leaflet** for interactive mapping capabilities
- **React** and **Express** communities for excellent frameworks

## 📞 Support

For support, questions, or feature requests:
- Create an issue on GitHub
- Check the [documentation](docs/)
- Review the [FAQ](docs/faq.md)

## 🗺️ Roadmap

### Upcoming Features
- [ ] Historical flood data analysis
- [ ] Weather integration
- [ ] Community reporting features
- [ ] Flood evacuation route planning
- [ ] Advanced alert customization
- [ ] Multi-language support

### Technical Improvements
- [ ] GraphQL API implementation
- [ ] Advanced caching strategies
- [ ] Machine learning flood prediction
- [ ] Enhanced offline capabilities
- [ ] Performance optimizations

---

**FloodWatch** - Helping communities stay safe through intelligent flood monitoring and early warning systems.