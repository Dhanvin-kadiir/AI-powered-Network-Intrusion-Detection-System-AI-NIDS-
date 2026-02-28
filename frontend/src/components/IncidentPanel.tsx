import React from 'react';
import { AlertTriangle, Clock, Shield, X } from 'lucide-react';
import { useNIDS } from '../context/NIDSContext';

interface Incident {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  description: string;
  affectedHosts: string[];
  status: 'active' | 'investigating' | 'resolved';
  score: number;
}

interface IncidentPanelProps {
  incidents: Incident[];
}

const IncidentPanel: React.FC<IncidentPanelProps> = ({ incidents }) => {
  const { dispatch } = useNIDS();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-900/50 border-red-500';
      case 'high': return 'text-orange-400 bg-orange-900/50 border-orange-500';
      case 'medium': return 'text-yellow-400 bg-yellow-900/50 border-yellow-500';
      default: return 'text-green-400 bg-green-900/50 border-green-500';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const handleResolveIncident = (incidentId: string) => {
    dispatch({ type: 'RESOLVE_INCIDENT', payload: incidentId });
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 max-h-96 overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            <span>Active Incidents</span>
          </h3>
          <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
            {incidents.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {incidents.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            <Shield className="h-8 w-8 mx-auto mb-3 text-gray-500" />
            <p className="text-sm">No active incidents</p>
            <p className="text-xs text-gray-500 mt-1">System is operating normally</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {incidents.map((incident) => (
              <div key={incident.id} className="p-4 hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(incident.severity)}`}>
                      {getSeverityIcon(incident.severity)}
                      <span>{incident.severity.toUpperCase()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleResolveIncident(incident.id)}
                    className="p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
                    title="Resolve incident"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mb-2">
                  <h4 className="text-white font-medium text-sm">{incident.type}</h4>
                  <p className="text-gray-300 text-xs mt-1">{incident.description}</p>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatTimeAgo(incident.timestamp)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>Score:</span>
                      <span className={`font-mono ${
                        incident.score > 0.8 ? 'text-red-400' :
                        incident.score > 0.6 ? 'text-orange-400' :
                        'text-yellow-400'
                      }`}>
                        {incident.score.toFixed(3)}
                      </span>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${
                    incident.status === 'active' ? 'bg-red-900/50 text-red-300' :
                    incident.status === 'investigating' ? 'bg-yellow-900/50 text-yellow-300' :
                    'bg-green-900/50 text-green-300'
                  }`}>
                    {incident.status}
                  </div>
                </div>

                {incident.affectedHosts.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-700">
                    <div className="text-xs text-gray-400 mb-1">Affected Hosts:</div>
                    <div className="flex flex-wrap gap-1">
                      {incident.affectedHosts.slice(0, 3).map((host, index) => (
                        <span key={index} className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs font-mono">
                          {host}
                        </span>
                      ))}
                      {incident.affectedHosts.length > 3 && (
                        <span className="text-gray-400 text-xs">
                          +{incident.affectedHosts.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IncidentPanel;