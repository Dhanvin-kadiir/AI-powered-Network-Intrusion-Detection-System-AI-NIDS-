import React from 'react';
import { Settings, Sliders, AlertTriangle } from 'lucide-react';
import { useNIDS } from '../context/NIDSContext';
import { scoreFlows } from '../lib/api';

const ControlPanel: React.FC = () => {
  const { state, dispatch } = useNIDS();

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const threshold = parseFloat(e.target.value);
    dispatch({ type: 'UPDATE_CONFIG', payload: { threshold } });
  };

  const handleAttackSimulation = async (attackType: string) => {
    // Build attack-specific flow features for the backend to score
    const attackPayloads: Record<string, any[]> = {
      ddos: Array.from({ length: 3 }, () => ({
        duration: 0,
        src_bytes: Math.floor(Math.random() * 100000) + 50000,
        dst_bytes: Math.floor(Math.random() * 1000) + 50,
        count: Math.floor(Math.random() * 20) + 10,
        srv_count: 1,
        same_srv_rate: 0.1,
        dst_host_count: 50,
        dst_host_srv_count: 2,
        protocol_type: 'udp',
        service: 'unknown',
        flag: 'S0',
      })),
      portscan: Array.from({ length: 3 }, () => ({
        duration: 0,
        src_bytes: 64,
        dst_bytes: 0,
        count: 1,
        srv_count: 1,
        same_srv_rate: 0.05,
        dst_host_count: 100,
        dst_host_srv_count: 1,
        protocol_type: 'tcp',
        service: 'unknown',
        flag: 'S0',
      })),
      exfiltration: Array.from({ length: 3 }, () => ({
        duration: 0,
        src_bytes: Math.floor(Math.random() * 50000) + 10000,
        dst_bytes: Math.floor(Math.random() * 1000) + 50,
        count: 1,
        srv_count: 1,
        same_srv_rate: 0.9,
        dst_host_count: 5,
        dst_host_srv_count: 1,
        protocol_type: 'tcp',
        service: 'unknown',
        flag: 'SF',
      })),
    };

    const payload = attackPayloads[attackType] || attackPayloads.ddos;

    let scores: number[];
    try {
      scores = await scoreFlows(payload);
    } catch {
      // Fallback: simulate high anomaly scores if backend is not available
      scores = payload.map(() => Math.random() * 0.3 + 0.7);
    }

    const genIp = () =>
      `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;

    const flows = payload.map((_, i) => ({
      id: Math.random().toString(36).slice(2, 11),
      timestamp: new Date(),
      srcIp: genIp(),
      dstIp: genIp(),
      srcPort: Math.floor(Math.random() * 64512) + 1024,
      dstPort: Math.floor(Math.random() * 1024) + 1,
      protocol: payload[i].protocol_type.toUpperCase(),
      srcBytes: payload[i].src_bytes,
      dstBytes: payload[i].dst_bytes,
      anomalyScore: scores[i] ?? 0.8,
      isAnomaly: true,
    }));

    const incidents = flows.map((flow) => ({
      id: Math.random().toString(36).slice(2, 11),
      timestamp: new Date(),
      type:
        attackType === 'ddos'
          ? 'DDoS Attack Pattern'
          : attackType === 'portscan'
            ? 'Port Scanning Detected'
            : 'Potential Data Exfiltration',
      severity: (flow.anomalyScore > 0.8 ? 'high' : 'medium') as 'high' | 'medium',
      description: `Simulated ${attackType} attack: ${flow.srcIp} → ${flow.dstIp}`,
      affectedHosts: [flow.srcIp, flow.dstIp],
      status: 'active' as const,
      score: flow.anomalyScore,
    }));

    dispatch({ type: 'APPLY_BATCH', payload: { flows, scores, incidents } });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center space-x-2 mb-4">
        <Settings className="h-5 w-5 text-cyan-400" />
        <h3 className="text-lg font-semibold text-white">Control Panel</h3>
      </div>

      <div className="space-y-6">
        {/* Threshold Control */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-300 flex items-center space-x-2">
              <Sliders className="h-4 w-4" />
              <span>Anomaly Threshold</span>
            </label>
            <span className="text-sm text-cyan-400 font-mono">
              {state.config.threshold.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.05"
            value={state.config.threshold}
            onChange={handleThresholdChange}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #10b981 0%, #10b981 ${state.config.threshold * 100}%, #374151 ${state.config.threshold * 100}%, #374151 100%)`,
            }}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Sensitive</span>
            <span>Balanced</span>
            <span>Conservative</span>
          </div>
        </div>

        {/* Model Parameters */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3">Model Configuration</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-700 rounded p-3">
              <div className="text-gray-400 text-xs">Features</div>
              <div className="text-white font-semibold">{state.config.features.length}</div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-gray-400 text-xs">Estimators</div>
              <div className="text-white font-semibold">{state.config.nEstimators}</div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-gray-400 text-xs">Sample Rate</div>
              <div className="text-white font-semibold">{(state.config.maxSamples * 100).toFixed(0)}%</div>
            </div>
            <div className="bg-gray-700 rounded p-3">
              <div className="text-gray-400 text-xs">Contamination</div>
              <div className="text-white font-semibold">Auto</div>
            </div>
          </div>
        </div>

        {/* Attack Simulation */}
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <span>Attack Simulation</span>
          </h4>
          <div className="space-y-2">
            {[
              { name: 'DDoS Attack', type: 'ddos', color: 'bg-red-600 hover:bg-red-700' },
              { name: 'Port Scan', type: 'portscan', color: 'bg-orange-600 hover:bg-orange-700' },
              { name: 'Data Exfiltration', type: 'exfiltration', color: 'bg-purple-600 hover:bg-purple-700' },
            ].map((attack) => (
              <button
                key={attack.type}
                onClick={() => handleAttackSimulation(attack.type)}
                className={`w-full px-3 py-2 rounded text-sm font-medium text-white transition-colors ${attack.color}`}
              >
                Simulate {attack.name}
              </button>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-2">System Status</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Model Status</span>
              <span className="text-green-400">Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Last Updated</span>
              <span className="text-gray-300 font-mono">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Backend</span>
              <span className="text-cyan-400">http://127.0.0.1:8000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;