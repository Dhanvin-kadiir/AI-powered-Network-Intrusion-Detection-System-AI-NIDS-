import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// ──────────────────── Types ────────────────────

export interface NetworkFlow {
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

export interface Incident {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  description: string;
  affectedHosts: string[];
  status: 'active' | 'investigating' | 'resolved';
  score: number;
}

interface Metrics {
  totalFlows: number;
  anomaliesDetected: number;
  avgResponseTime: number;
  uptime: number;
}

interface Config {
  threshold: number;
  features: string[];
  nEstimators: number;
  maxSamples: number;
}

interface NIDSState {
  recentFlows: NetworkFlow[];
  incidents: Incident[];
  scores: number[];
  metrics: Metrics;
  config: Config;
  isLive: boolean;
}

type NIDSAction =
  | { type: 'UPDATE_CONFIG'; payload: Partial<Config> }
  | { type: 'RESOLVE_INCIDENT'; payload: string }
  | { type: 'PAUSE_MONITORING' }
  | { type: 'RESUME_MONITORING' }
  | { type: 'APPLY_BATCH'; payload: { flows: NetworkFlow[]; scores: number[]; incidents: Incident[] } };

// ──────────────────── Initial State ────────────────────

const initialState: NIDSState = {
  recentFlows: [],
  incidents: [],
  scores: [],
  metrics: {
    totalFlows: 0,
    anomaliesDetected: 0,
    avgResponseTime: 12,
    uptime: 0,
  },
  config: {
    threshold: 0.6,
    features: [
      'duration', 'src_bytes', 'dst_bytes', 'count',
      'srv_count', 'same_srv_rate', 'dst_host_count', 'dst_host_srv_count',
    ],
    nEstimators: 300,
    maxSamples: 0.8,
  },
  isLive: true,
};

// ──────────────────── Reducer ────────────────────

const nidsReducer = (state: NIDSState, action: NIDSAction): NIDSState => {
  switch (action.type) {
    case 'UPDATE_CONFIG':
      return {
        ...state,
        config: { ...state.config, ...action.payload },
      };

    case 'RESOLVE_INCIDENT':
      return {
        ...state,
        incidents: state.incidents.filter((i) => i.id !== action.payload),
      };

    case 'PAUSE_MONITORING':
      return { ...state, isLive: false };

    case 'RESUME_MONITORING':
      return { ...state, isLive: true };

    case 'APPLY_BATCH': {
      const { flows, scores, incidents } = action.payload;
      const anomalies = flows.filter((f) => f.isAnomaly).length;

      return {
        ...state,
        recentFlows: [...state.recentFlows, ...flows].slice(-50),
        scores: [...state.scores, ...scores].slice(-200),
        incidents: [...state.incidents, ...incidents].slice(-10),
        metrics: {
          ...state.metrics,
          totalFlows: state.metrics.totalFlows + flows.length,
          anomaliesDetected: state.metrics.anomaliesDetected + anomalies,
          uptime: state.metrics.uptime + 1,
        },
      };
    }

    default:
      return state;
  }
};

// ──────────────────── Context ────────────────────

const NIDSContext = createContext<{
  state: NIDSState;
  dispatch: React.Dispatch<NIDSAction>;
} | null>(null);

// ──────────────────── Provider ────────────────────

export const NIDSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(nidsReducer, initialState);

  return (
    <NIDSContext.Provider value={{ state, dispatch }}>
      {children}
    </NIDSContext.Provider>
  );
};

// ──────────────────── Hook ────────────────────

export const useNIDS = () => {
  const context = useContext(NIDSContext);
  if (!context) {
    throw new Error('useNIDS must be used within a NIDSProvider');
  }
  return context;
};