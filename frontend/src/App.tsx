import React from 'react';
import Dashboard from './components/Dashboard';
import { NIDSProvider } from './context/NIDSContext';

function App() {
  return (
    <NIDSProvider>
      <div className="min-h-screen bg-gray-900">
        <Dashboard />
      </div>
    </NIDSProvider>
  );
}

export default App;