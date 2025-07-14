# RivrWatch - Real-Time Flood Detection App

A comprehensive flood detection and prediction application that provides real-time monitoring of river conditions, weather patterns, and flood risks in your area.

## 🌊 Features

### Core Functionality
- **Real-time River Monitoring**: Track water levels, flow rates, and flood stages for rivers and creeks
- **Weather Integration**: Combine current weather and precipitation forecasts with river data
- **Intelligent Flood Prediction**: Advanced algorithms that consider upstream rivers, historical patterns, and watershed analysis
- **Road Closure Detection**: Automatic detection and mapping of road closures based on river flooding risks
- **Radius-based Search**: Customizable search radius to monitor rivers and road closures within your specified range
- **Interactive Map View**: Visual representation of flood risks, river conditions, and road closures
- **Emergency Alerts**: Real-time notifications for high-risk flood conditions and road closures

### Advanced Analytics
- **Upstream River Analysis**: Consider the impact of rivers upstream from your location
- **Historical Pattern Recognition**: Analyze past flow patterns to improve predictions
- **Watershed Impact Assessment**: Evaluate the overall watershed risk
- **Time-based Predictions**: Estimate when flooding might occur
- **Enhanced Risk Assessment**: Multi-factor risk calculation including precipitation, flow trends, and upstream impacts

### User Experience
- **Accessibility Compliant**: WCAG guidelines followed for inclusive design
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Real-time Updates**: Live data refresh with manual and automatic updates
- **Customizable Settings**: Personalize notifications, units, and display preferences
- **Emergency Contact Management**: Store and manage emergency contacts

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- API keys for:
  - OpenWeatherMap API (required)

### Installation

1. **Clone and navigate to the project**
   ```bash
   cd RivrWatch
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the `backend` directory:
       ```env
    PORT=5001
    OPENWEATHER_API_KEY=your_openweather_api_key_here
    NODE_ENV=development
    ```

4. **Start the application**
   ```bash
   npm run dev
   ```

       This will start both:
    - Backend server on port 5001
    - Frontend development server on port 3000

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔑 API Keys Setup

### OpenWeatherMap API (Required)
1. Sign up at [OpenWeatherMap](https://openweathermap.org/api)
2. Get your free API key
3. Add it to the backend `.env` file

### Mapping (Free & Open Source)
The app uses **Leaflet** with **OpenStreetMap** tiles, which are completely free and don't require any API keys.

## 📱 How to Use

### Dashboard
- **Location Selection**: Use GPS or enter coordinates manually
- **Radius Control**: Adjust search radius (1-100 miles)
- **Real-time Data**: View current weather and river conditions
- **Risk Assessment**: See overall flood risk and individual river status

### Map View
- **Interactive Map**: Visual representation of flood risks
- **River Markers**: Color-coded risk indicators
- **Weather Overlay**: Current weather conditions
- **Flood Zones**: Historical flood areas (when available)

### Settings
- **Notifications**: Customize alert preferences
- **Map Settings**: Configure map display options
- **Privacy**: Control data sharing and analytics
- **Emergency Contacts**: Manage emergency contact list
- **Units**: Choose preferred measurement units

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for modern, responsive styling
- **React Router** for navigation
- **Context API** for state management
- **Axios** for API communication
- **Lucide React** for consistent iconography
- **Leaflet** for interactive mapping (free & open source)

### Backend (Node.js + Express)
- **Express.js** REST API
- **USGS Water Services API** for river data
- **OpenWeatherMap API** for weather data
- **NOAA Weather API** for detailed forecasts
- **Enhanced flood prediction algorithms**
- **Real-time data processing**

## 📊 API Endpoints

### Weather
- `GET /api/weather/current/:lat/:lng` - Current weather data
- `GET /api/weather/precipitation/:lat/:lng` - Precipitation forecast

### Rivers
- `GET /api/rivers/nearby/:lat/:lng/:radius` - Rivers within radius
- `GET /api/rivers/flow/:siteId` - Detailed flow data
- `GET /api/rivers/flood-stage/:siteId` - Flood stage information

### Flood Prediction
- `POST /api/flood/predict` - Enhanced flood prediction
- `GET /api/flood/alerts/:lat/:lng/:radius` - Real-time flood alerts
- `GET /api/flood/history/:siteId` - Historical flood data
- `GET /api/flood/watershed/:lat/:lng/:radius` - Watershed analysis

### Road Closures
- `GET /api/roadclosures/nearby/:lat/:lng/:radius` - Road closures within radius
- `GET /api/roadclosures/details/:closureId` - Detailed road closure information

## 🧠 Flood Prediction Algorithm

The app uses a sophisticated multi-factor algorithm:

1. **Current Conditions**
   - Water level and flow rate
   - Current weather conditions
   - Recent precipitation

2. **Historical Analysis**
   - 30-day flow patterns
   - Seasonal trends
   - Historical flood events

3. **Upstream Impact**
   - Rivers flowing into the area
   - Watershed analysis
   - Flow accumulation

4. **Weather Forecasting**
   - Precipitation predictions
   - Storm intensity
   - Duration of weather events

5. **Risk Calculation**
   - Probability scoring (0-95%)
   - Time-to-flood estimation
   - Risk level classification

## 🎨 Accessibility Features

- **WCAG 2.1 AA Compliance**: High contrast ratios and keyboard navigation
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Focus Management**: Clear focus indicators and logical tab order
- **Color Independence**: Information not conveyed by color alone
- **Responsive Design**: Works on all screen sizes and devices

## 🔒 Privacy & Security

- **Local Data Storage**: Settings and preferences stored locally
- **No Personal Data Collection**: Location data not stored on servers
- **Secure API Communication**: HTTPS for all external API calls
- **User Control**: Full control over data sharing preferences

## 🚨 Emergency Information

This app is designed to provide early warning of potential flood conditions. However:

- **Always follow official emergency instructions**
- **Do not rely solely on this app for evacuation decisions**
- **Monitor local emergency broadcasts**
- **Have a personal emergency plan**

## 🛠️ Development

### Available Scripts

```bash
# Install all dependencies
npm run install-all

# Start both frontend and backend in development mode
npm run dev

# Start only the backend server
npm run server

# Start only the frontend client
npm run client

# Build the frontend for production
npm run build
```

### Project Structure

```
RiverApp/
├── frontend/                 # React frontend
│   ├── public/              # Static files
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── App.tsx          # Main app component
│   │   └── index.tsx        # Entry point
│   └── package.json
├── backend/                  # Node.js backend
│   ├── routes/              # API routes
│   ├── services/            # Business logic
│   ├── server.js            # Express server
│   └── package.json
└── package.json             # Root package.json
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **USGS Water Services** for river data
- **OpenWeatherMap** for weather data
- **NOAA** for detailed weather forecasts
- **React Community** for excellent tools and libraries

## 📞 Support

For support or questions:
- Create an issue in the repository
- Check the documentation
- Review the API documentation

---

**Stay safe and stay informed!** 🌊 