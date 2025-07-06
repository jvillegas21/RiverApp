import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const WaterLevelChart = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data || !data.waterLevels || data.waterLevels.length === 0) {
      return null;
    }

    // Find the water level series (gage height)
    const waterLevelSeries = data.waterLevels.find(series => 
      series.parameter.toLowerCase().includes('gage height') ||
      series.parameter.toLowerCase().includes('water level')
    );

    if (!waterLevelSeries || !waterLevelSeries.values) {
      return null;
    }

    // Sort values by date
    const sortedValues = waterLevelSeries.values
      .filter(value => value.value !== null && !isNaN(value.value))
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

    // Prepare data for Chart.js
    const labels = sortedValues.map(value => {
      const date = new Date(value.dateTime);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    });

    const values = sortedValues.map(value => value.value);

    // Calculate trend
    const trend = calculateTrend(values);
    const trendColor = trend > 0.1 ? '#ef4444' : trend < -0.1 ? '#22c55e' : '#3b82f6';

    return {
      labels,
      datasets: [
        {
          label: `Water Level (${waterLevelSeries.unit})`,
          data: values,
          borderColor: trendColor,
          backgroundColor: trendColor + '20',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 5,
          pointBackgroundColor: trendColor,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        }
      ]
    };
  }, [data]);

  const calculateTrend = (values) => {
    if (values.length < 2) return 0;
    
    const recentValues = values.slice(-10); // Last 10 readings
    const firstValue = recentValues[0];
    const lastValue = recentValues[recentValues.length - 1];
    
    return ((lastValue - firstValue) / firstValue) * 100;
  };

  const getTrendMessage = () => {
    if (!chartData) return null;
    
    const values = chartData.datasets[0].data;
    const trend = calculateTrend(values);
    
    if (trend > 0.1) {
      return {
        message: `Water level is rising (${trend.toFixed(1)}% increase)`,
        color: '#ef4444',
        severity: 'warning'
      };
    } else if (trend < -0.1) {
      return {
        message: `Water level is falling (${Math.abs(trend).toFixed(1)}% decrease)`,
        color: '#22c55e',
        severity: 'good'
      };
    } else {
      return {
        message: 'Water level is stable',
        color: '#3b82f6',
        severity: 'normal'
      };
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            family: 'system-ui'
          }
        }
      },
      title: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#667eea',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (context) => {
            const date = new Date(context[0].parsed.x);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
          },
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        ticks: {
          maxTicksLimit: 6,
          font: {
            size: 10
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Water Level',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        ticks: {
          font: {
            size: 10
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    elements: {
      point: {
        hoverRadius: 8
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };

  if (!chartData) {
    return (
      <div className="chart-placeholder">
        <p>No water level data available</p>
      </div>
    );
  }

  const trendInfo = getTrendMessage();

  return (
    <div className="water-level-chart">
      {trendInfo && (
        <div className={`trend-indicator ${trendInfo.severity}`}>
          <span style={{ color: trendInfo.color }}>
            {trendInfo.message}
          </span>
        </div>
      )}
      
      <div className="chart-wrapper">
        <Line data={chartData} options={options} />
      </div>

      <style jsx>{`
        .water-level-chart {
          width: 100%;
          height: 100%;
        }
        
        .chart-wrapper {
          width: 100%;
          height: 250px;
          position: relative;
        }
        
        .chart-placeholder {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 250px;
          color: #666;
          font-style: italic;
        }
        
        .trend-indicator {
          margin-bottom: 1rem;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          text-align: center;
        }
        
        .trend-indicator.warning {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        
        .trend-indicator.good {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
        }
        
        .trend-indicator.normal {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
      `}</style>
    </div>
  );
};

export default WaterLevelChart;