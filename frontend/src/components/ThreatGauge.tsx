import React from 'react';

interface ThreatGaugeProps {
  score: number;
}

const ThreatGauge: React.FC<ThreatGaugeProps> = ({ score }) => {
  const getThreatLevel = (score: number) => {
    if (score >= 0.8) return { level: 'CRITICAL', color: 'text-red-400', bgColor: 'bg-red-500' };
    if (score >= 0.6) return { level: 'HIGH', color: 'text-orange-400', bgColor: 'bg-orange-500' };
    if (score >= 0.4) return { level: 'MEDIUM', color: 'text-yellow-400', bgColor: 'bg-yellow-500' };
    return { level: 'LOW', color: 'text-green-400', bgColor: 'bg-green-500' };
  };

  const threat = getThreatLevel(score);
  const percentage = Math.round(score * 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Threat Level</h3>
      
      <div className="relative flex items-center justify-center">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="rgb(55 65 81)"
            strokeWidth="8"
            fill="transparent"
          />
          
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={`transition-all duration-1000 ${
              score >= 0.8 ? 'text-red-500' :
              score >= 0.6 ? 'text-orange-500' :
              score >= 0.4 ? 'text-yellow-500' :
              'text-green-500'
            }`}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{percentage}%</span>
          <span className={`text-sm font-medium ${threat.color}`}>{threat.level}</span>
        </div>
      </div>
      
      {/* Threat level indicator */}
      <div className="mt-4 flex items-center justify-center">
        <div className={`w-3 h-3 rounded-full ${threat.bgColor} mr-2 animate-pulse`}></div>
        <span className={`text-sm font-medium ${threat.color}`}>
          Anomaly Score: {score.toFixed(3)}
        </span>
      </div>
    </div>
  );
};

export default ThreatGauge;