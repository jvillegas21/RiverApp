import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

interface HistoricalDataPoint {
  timestamp: string;
  level: number;
  flow: number;
}

interface FloodStages {
  action: number;
  minor: number;
  moderate: number;
  major: number;
}

interface WaterLevelChartProps {
  historicalData: HistoricalDataPoint[];
  floodStages: FloodStages;
  currentLevel: number;
  riverName: string;
  days?: number; // default 7
}

const WaterLevelChart: React.FC<WaterLevelChartProps> = ({
  historicalData,
  floodStages,
  currentLevel,
  riverName,
  days = 7
}) => {
  // Accordion state
  const [open, setOpen] = useState(true);
  const displayData = historicalData.slice(-days);

  // Always use the actual currentLevel prop, not the last data point
  // This ensures consistency with the main water level display
  const currentValue = currentLevel;

  if (!displayData || displayData.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
        No historical data available
      </div>
    );
  }

  // Calculate trend
  const levels = displayData.map(d => d.level);
  const recentLevels = levels.slice(-3);
  const trend = recentLevels.length > 1 ? 
    (recentLevels[recentLevels.length - 1] - recentLevels[0]) / (recentLevels[0] || 1) : 0;

  const getTrendIcon = () => {
    if (trend > 0.05) return <TrendingUp className="w-4 h-4 text-red-500" />;
    if (trend < -0.05) return <TrendingDown className="w-4 h-4 text-green-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getTrendText = () => {
    if (trend > 0.05) return 'Rising';
    if (trend < -0.05) return 'Falling';
    return 'Stable';
  };

  const getLevelColor = (level: number) => {
    if (level >= floodStages.major) return '#ef4444'; // red-500
    if (level >= floodStages.moderate) return '#f59e42'; // orange-500
    if (level >= floodStages.minor) return '#eab308'; // yellow-500
    if (level >= floodStages.action) return '#3b82f6'; // blue-500
    return '#22c55e'; // green-500
  };

  const getLevelStatus = (level: number) => {
    if (level >= floodStages.major) return 'Major Flood';
    if (level >= floodStages.moderate) return 'Moderate Flood';
    if (level >= floodStages.minor) return 'Minor Flood';
    if (level >= floodStages.action) return 'Action Stage';
    return 'Normal';
  };

  // Format date for X axis
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  // Custom dot for current value
  const renderDot = (props: any) => {
    const { cx, cy, index } = props;
    if (index === displayData.length - 1) {
      return <circle cx={cx} cy={cy} r={7} fill="#22c55e" stroke="#fff" strokeWidth={2} />;
    }
    return <circle cx={cx} cy={cy} r={4} fill="#3B82F6" stroke="#fff" strokeWidth={1.5} />;
  };

  // Flood stage reference lines
  const floodStageRefs = [
    { y: floodStages.major, color: '#ef4444', label: `Major Flood (${floodStages.major.toFixed(1)} ft)` },
    { y: floodStages.moderate, color: '#f59e42', label: `Moderate (${floodStages.moderate.toFixed(1)} ft)` },
    { y: floodStages.minor, color: '#eab308', label: `Minor (${floodStages.minor.toFixed(1)} ft)` },
    { y: floodStages.action, color: '#3b82f6', label: `Action (${floodStages.action.toFixed(1)} ft)` },
  ];

  return (
    <div className="bg-white rounded-lg border p-0 water-level-chart">
      {/* Accordion Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 border-b hover:bg-gray-50 transition"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="water-level-history-panel"
      >
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-gray-900">Water Level History</span>
          {getTrendIcon()}
          <span className="text-sm text-gray-600">{getTrendText()}</span>
        </div>
        {open ? <ChevronDown className="w-5 h-5 text-gray-500" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
      </button>
      {/* Accordion Panel */}
      {open && (
        <div id="water-level-history-panel" className="px-4 pb-4 pt-2">
          <div className="relative mb-4" style={{ width: '100%', height: 180, margin: '0 auto' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={displayData}
                margin={{ top: 24, right: 24, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="timestamp" tickFormatter={formatDate} fontSize={12} tick={{ fill: '#64748b' }} />
                <YAxis 
                  domain={[(dataMin: number) => {
                    // Ensure we show meaningful scale even for small variations
                    const range = Math.max(...levels) - Math.min(...levels);
                    const padding = Math.max(0.5, range * 0.1); // At least 0.5 ft padding or 10% of range
                    return Math.max(0, Math.min(...levels) - padding);
                  }, (dataMax: number) => {
                    const range = Math.max(...levels) - Math.min(...levels);
                    const padding = Math.max(0.5, range * 0.1); // At least 0.5 ft padding or 10% of range
                    return Math.max(...levels) + padding;
                  }]} 
                  fontSize={12} 
                  tick={{ fill: '#64748b' }} 
                  width={40}
                  tickFormatter={(value) => value.toFixed(1)}
                />
                <Tooltip formatter={(value: any) => `${value} ft`} labelFormatter={(label: any) => `Date: ${formatDate(label)}`} />
                {floodStageRefs.map(ref => (
                  <ReferenceLine key={ref.y} y={ref.y} stroke={ref.color} strokeDasharray="4 2" label={{ value: ref.label, position: 'top', fill: ref.color, fontSize: 11, fontWeight: 'bold' }} />
                ))}
                <Line
                  type="monotone"
                  dataKey="level"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={renderDot}
                  activeDot={{ r: 8, fill: '#22c55e', stroke: '#fff', strokeWidth: 2 }}
                  isAnimationActive={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* Current Level Indicator */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ background: getLevelColor(currentValue) }}></div>
              <span className="text-sm font-medium text-gray-900">
                Current: {currentValue.toFixed(1)} ft
              </span>
            </div>
            <span className="text-sm text-gray-600">{getLevelStatus(currentValue)}</span>
          </div>
          {/* Historical Summary */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">7-Day High</p>
              <p className="font-semibold text-gray-900">
                {Math.max(...levels).toFixed(1)} ft
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">7-Day Low</p>
              <p className="font-semibold text-gray-900">
                {Math.min(...levels).toFixed(1)} ft
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Average</p>
              <p className="font-semibold text-gray-900">
                {(levels.reduce((a, b) => a + b, 0) / levels.length).toFixed(1)} ft
              </p>
            </div>
          </div>
          {/* Time Labels */}
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>{formatDate(displayData[0].timestamp)}</span>
            <span>{formatDate(displayData[displayData.length - 1].timestamp)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaterLevelChart; 