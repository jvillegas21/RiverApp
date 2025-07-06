#!/bin/bash

# RiverFlood Alert App Setup Script
echo "🌊 Setting up RiverFlood Alert App..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
echo "🔧 Installing backend dependencies..."
cd backend
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "🔧 Creating backend .env file..."
    cat > .env << EOF
PORT=5000
OPENWEATHER_API_KEY=your_openweather_api_key_here
NODE_ENV=development
EOF
    echo "⚠️  Please update the .env file with your API keys"
fi

cd ..

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install

cd ..

echo "✅ Setup complete!"
echo ""
echo "🚀 To start the application:"
echo "   npm run dev"
echo ""
echo "📝 Next steps:"
echo "   1. Get API key from OpenWeatherMap (required)"
echo "   2. Update backend/.env file with your API key"
echo "   3. Run 'npm run dev' to start the application"
echo ""
echo "🌊 RiverFlood Alert is ready to help keep you safe!" 