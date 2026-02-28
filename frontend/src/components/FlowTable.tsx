import React from 'react';
import { AlertCircle, Shield, Activity } from 'lucide-react';

interface NetworkFlow {
  id: string;
  timestamp: Date;
  srcIp: string;
  dstIp: string;
  srcPort: number;
  dstPort: number;
  protocol: string;
  srcBytes: number;
  dstBytes: number;
  anomalyScore: number;
  isAnomaly: boolean;
}

interface FlowTableProps {
  flows: NetworkFlow[];
}

const FlowTable: React.FC<FlowTableProps> = ({ flows }) => {
  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <Activity className="h-5 w-5 text-cyan-400" />
          <span>Recent Network Flows</span>
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Destination
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Protocol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Bytes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Score
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {flows.slice(-10).reverse().map((flow) => (
              <tr 
                key={flow.id} 
                className={`${
                  flow.isAnomaly 
                    ? 'bg-red-900/20 border-l-4 border-l-red-500' 
                    : 'bg-gray-800 hover:bg-gray-750'
                } transition-colors`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    {flow.isAnomaly ? (
                      <AlertCircle className="h-4 w-4 text-red-400" />
                    ) : (
                      <Shield className="h-4 w-4 text-green-400" />
                    )}
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      flow.isAnomaly 
                        ? 'bg-red-900/50 text-red-300' 
                        : 'bg-green-900/50 text-green-300'
                    }`}>
                      {flow.isAnomaly ? 'ANOMALY' : 'NORMAL'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300 font-mono text-sm">
                  {formatTime(flow.timestamp)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300 font-mono text-sm">
                  {flow.srcIp}:{flow.srcPort}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300 font-mono text-sm">
                  {flow.dstIp}:{flow.dstPort}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded font-medium ${
                    flow.protocol === 'TCP' ? 'bg-blue-900/50 text-blue-300' :
                    flow.protocol === 'UDP' ? 'bg-purple-900/50 text-purple-300' :
                    'bg-gray-900/50 text-gray-300'
                  }`}>
                    {flow.protocol}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-sm">
                  ↑{formatBytes(flow.srcBytes)} ↓{formatBytes(flow.dstBytes)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <span className={`font-mono text-sm ${
                      flow.anomalyScore > 0.7 ? 'text-red-400' :
                      flow.anomalyScore > 0.4 ? 'text-orange-400' :
                      'text-green-400'
                    }`}>
                      {flow.anomalyScore.toFixed(3)}
                    </span>
                    <div className="w-16 bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          flow.anomalyScore > 0.7 ? 'bg-red-500' :
                          flow.anomalyScore > 0.4 ? 'bg-orange-500' :
                          'bg-green-500'
                        }`}
                        style={{width: `${Math.min(flow.anomalyScore * 100, 100)}%`}}
                      ></div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
            {flows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                  <div className="flex flex-col items-center space-y-2">
                    <Activity className="h-8 w-8 text-gray-500" />
                    <span>No network flows detected yet</span>
                    <span className="text-sm text-gray-500">Waiting for data...</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FlowTable;