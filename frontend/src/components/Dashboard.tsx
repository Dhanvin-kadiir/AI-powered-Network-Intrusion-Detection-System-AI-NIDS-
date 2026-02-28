import React, { useEffect, useState } from 'react';
import { Shield, Activity, AlertTriangle, Settings, Play, Pause, Download } from 'lucide-react';
import { useNIDS } from '../context/NIDSContext';
import MetricsPanel from './MetricsPanel';
import AnomalyChart from './AnomalyChart';
import FlowTable from './FlowTable';
import ControlPanel from './ControlPanel';
import IncidentPanel from './IncidentPanel';
import ThreatGauge from './ThreatGauge';
import { scoreFlows } from '../lib/api';

function genIp() {
  const r = () => Math.floor(Math.random() * 256);
  return `${r()}.${r()}.${r()}.${r()}`;
}
function genPort(ephemeral:boolean){ return ephemeral ? Math.floor(Math.random()*64512)+1024 : Math.floor(Math.random()*1024)+1; }
function genFlowBase() {
  const protocols = ['TCP','UDP','ICMP'];
  return {
    id: Math.random().toString(36).slice(2,11),
    timestamp: new Date(),
    srcIp: genIp(),
    dstIp: genIp(),
    srcPort: genPort(true),
    dstPort: genPort(false),
    protocol: protocols[Math.floor(Math.random()*protocols.length)],
    srcBytes: Math.floor(Math.random()*10000)+100,
    dstBytes: Math.floor(Math.random()*5000)+50
  };
}


const Dashboard: React.FC = () => {
  const { state, dispatch } = useNIDS();
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(async () => {
      // Generate a batch of 5 flows
      const batch = Array.from({length:5}, () => genFlowBase());

      // Map to backend features
      const payload = batch.map(f => ({
        duration: 0,
        src_bytes: f.srcBytes,
        dst_bytes: f.dstBytes,
        count: 1,
        srv_count: 1,
        same_srv_rate: 0.7,
        dst_host_count: 20,
        dst_host_srv_count: 5,
        protocol_type: f.protocol.toLowerCase(),
        service: "unknown",
        flag: "SF",
      }));

      let scores: number[] = [];
      try {
        scores = await scoreFlows(payload);
      } catch (e) {
        scores = batch.map(() => Math.random()*0.3+0.2);
      }

      const threshold = state.config.threshold ?? 0.3;
      const flows = batch.map((f, i) => ({
        ...f,
        anomalyScore: scores[i] ?? 0,
        isAnomaly: (scores[i] ?? 0) >= threshold
      }));

      // Minimal incident objects for anomalies
      const incidents = flows.filter(f => f.isAnomaly).map(flow => ({
        id: Math.random().toString(36).slice(2, 11),
        timestamp: new Date(),
        type: flow.srcBytes > 4000 ? 'Potential DDoS attack' : 'Suspicious activity',
        severity: flow.anomalyScore > 0.8 ? 'high' : (flow.anomalyScore > 0.6 ? 'medium' : 'low'),
        description: `Anomalous traffic detected from ${flow.srcIp} to ${flow.dstIp}`,
        affectedHosts: [flow.srcIp, flow.dstIp],
        status: 'active',
        score: flow.anomalyScore
      }));

      dispatch({ type: 'APPLY_BATCH', payload: { flows, scores, incidents } });
    }, 1000);

    return () => clearInterval(interval);
  }, [dispatch, isLive]);

  const toggleLive = () => {
    setIsLive(!isLive);
    if (!isLive) {
      dispatch({ type: 'RESUME_MONITORING' });
    } else {
      dispatch({ type: 'PAUSE_MONITORING' });
    }
  };

  const exportData = () => {
    const data = {
      incidents: state.incidents,
      metrics: state.metrics,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nids-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentThreatLevel = state.scores.length > 0 
    ? state.scores[state.scores.length - 1] 
    : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white">AI-NIDS</h1>
            <span className="text-sm text-gray-400">Network Intrusion Detection System</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleLive}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isLive 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isLive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{isLive ? 'Pause' : 'Resume'}</span>
            </button>
            
            <button
              onClick={exportData}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Status Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">System Status</p>
                <p className={`font-semibold ${isLive ? 'text-green-400' : 'text-yellow-400'}`}>
                  {isLive ? 'Active' : 'Paused'}
                </p>
              </div>
              <Activity className={`h-6 w-6 ${isLive ? 'text-green-400' : 'text-yellow-400'}`} />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Flows Processed</p>
                <p className="text-xl font-semibold text-white">{state.metrics.totalFlows}</p>
              </div>
              <Shield className="h-6 w-6 text-cyan-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Anomalies Detected</p>
                <p className="text-xl font-semibold text-orange-400">{state.metrics.anomaliesDetected}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-orange-400" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Incidents</p>
                <p className="text-xl font-semibold text-red-400">{state.incidents.length}</p>
              </div>
              <Settings className="h-6 w-6 text-red-400" />
            </div>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Threat Level and Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ThreatGauge score={currentThreatLevel} />
              <MetricsPanel metrics={state.metrics} />
            </div>
            
            {/* Anomaly Chart */}
            <AnomalyChart 
              scores={state.scores} 
              threshold={state.config.threshold}
            />
            
            {/* Flow Table */}
            <FlowTable flows={state.recentFlows} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Control Panel */}
            <ControlPanel />
            
            {/* Incident Panel */}
            <IncidentPanel incidents={state.incidents} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;