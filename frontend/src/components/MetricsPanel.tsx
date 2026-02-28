import React from 'react';
import { Activity, Shield, AlertTriangle, Clock } from 'lucide-react';

interface MetricsPanelProps {
  metrics: {
    totalFlows: number;
    anomaliesDetected: number;
    avgResponseTime: number;
    uptime: number;
  };
}

const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics }) => {
  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">System Metrics</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <span className="text-gray-300 text-sm">Flow Rate</span>
          </div>
          <span className="text-white font-semibold">{metrics.totalFlows}/min</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-green-400" />
            <span className="text-gray-300 text-sm">Detection Rate</span>
          </div>
          <span className="text-white font-semibold">
            {metrics.totalFlows > 0 ? ((metrics.anomaliesDetected / metrics.totalFlows) * 100).toFixed(1) : 0}%
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <span className="text-gray-300 text-sm">Avg Response</span>
          </div>
          <span className="text-white font-semibold">{metrics.avgResponseTime}ms</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-blue-400" />
            <span className="text-gray-300 text-sm">Uptime</span>
          </div>
          <span className="text-white font-semibold font-mono">{formatUptime(metrics.uptime)}</span>
        </div>
      </div>
      
      {/* Performance Indicator */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">Performance</span>
          <span className="text-green-400 text-sm font-medium">Excellent</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div className="bg-green-400 h-2 rounded-full transition-all duration-300" style={{width: '92%'}}></div>
        </div>
      </div>
    </div>
  );
};

export default MetricsPanel;