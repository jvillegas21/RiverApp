import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface FloodAlertProps {
  risk: string;
}

const FloodAlert: React.FC<FloodAlertProps> = ({ risk }) => {
  const getAlertConfig = (riskLevel: string) => {
    switch (riskLevel) {
      case 'High':
        return {
          icon: <AlertTriangle className="w-6 h-6" />,
          bgColor: 'bg-red-50 border-red-200',
          textColor: 'text-red-800',
          title: 'High Flood Risk',
          description: 'Immediate action may be required. Monitor local emergency broadcasts and consider evacuation if in flood-prone areas.',
          recommendations: [
            'Consider evacuation if in flood-prone areas',
            'Monitor local emergency broadcasts',
            'Move to higher ground if near rivers or creeks',
            'Avoid driving through flooded areas',
            'Prepare emergency supplies'
          ]
        };
      case 'Medium':
        return {
          icon: <AlertCircle className="w-6 h-6" />,
          bgColor: 'bg-yellow-50 border-yellow-200',
          textColor: 'text-yellow-800',
          title: 'Moderate Flood Risk',
          description: 'Stay alert to changing conditions. Prepare emergency supplies and have an evacuation plan ready.',
          recommendations: [
            'Stay alert to changing conditions',
            'Prepare emergency supplies',
            'Monitor river levels closely',
            'Have evacuation plan ready',
            'Stay informed about weather updates'
          ]
        };
      case 'Low':
        return {
          icon: <Info className="w-6 h-6" />,
          bgColor: 'bg-green-50 border-green-200',
          textColor: 'text-green-800',
          title: 'Low Flood Risk',
          description: 'Conditions are normal. Continue monitoring weather updates and stay informed about local conditions.',
          recommendations: [
            'Continue normal activities',
            'Stay informed about weather updates',
            'Monitor local conditions',
            'Keep emergency supplies updated'
          ]
        };
      default:
        return {
          icon: <Info className="w-6 h-6" />,
          bgColor: 'bg-gray-50 border-gray-200',
          textColor: 'text-gray-800',
          title: 'Risk Assessment Unavailable',
          description: 'Unable to determine flood risk at this time. Please check back later.',
          recommendations: []
        };
    }
  };

  const config = getAlertConfig(risk);

  return (
    <div className={`border rounded-lg p-4 ${config.bgColor}`} role="alert" aria-live="polite">
      <div className="flex items-start space-x-3">
        <div className={`${config.textColor} flex-shrink-0`}>
          {config.icon}
        </div>
        <div className="flex-1">
          <h3 className={`text-lg font-semibold ${config.textColor}`}>
            {config.title}
          </h3>
          <p className={`mt-1 ${config.textColor}`}>
            {config.description}
          </p>
          
          {config.recommendations.length > 0 && (
            <div className="mt-3">
              <p className={`text-sm font-medium ${config.textColor} mb-2`}>
                Recommended Actions:
              </p>
              <ul className={`text-sm ${config.textColor} space-y-1`}>
                {config.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FloodAlert; 