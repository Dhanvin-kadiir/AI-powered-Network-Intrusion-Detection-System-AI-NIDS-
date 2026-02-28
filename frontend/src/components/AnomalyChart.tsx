import React, { useRef, useEffect } from 'react';

interface AnomalyChartProps {
  scores: number[];
  threshold: number;
}

const AnomalyChart: React.FC<AnomalyChartProps> = ({ scores, threshold }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Clear canvas
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);

    if (scores.length === 0) return;

    // Draw grid
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + (i * chartHeight) / 4;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = padding + (i * chartWidth) / 10;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    ctx.setLineDash([]);

    // Draw threshold line
    const thresholdY = height - padding - (threshold * chartHeight);
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, thresholdY);
    ctx.lineTo(width - padding, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw threshold label
    ctx.fillStyle = '#f97316';
    ctx.font = '12px monospace';
    ctx.fillText(`Threshold: ${threshold.toFixed(2)}`, padding + 5, thresholdY - 5);

    // Draw anomaly scores
    const maxPoints = Math.min(scores.length, 100);
    const recentScores = scores.slice(-maxPoints);

    if (recentScores.length > 1) {
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let i = 0; i < recentScores.length; i++) {
        const x = padding + (i * chartWidth) / (recentScores.length - 1);
        const y = height - padding - (recentScores[i] * chartHeight);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Draw points and fill areas above threshold
      ctx.fillStyle = 'rgba(0, 212, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(padding, height - padding);
      
      for (let i = 0; i < recentScores.length; i++) {
        const x = padding + (i * chartWidth) / (recentScores.length - 1);
        const y = height - padding - (recentScores[i] * chartHeight);
        ctx.lineTo(x, y);
      }
      
      ctx.lineTo(width - padding, height - padding);
      ctx.fill();

      // Highlight anomalous points
      for (let i = 0; i < recentScores.length; i++) {
        const score = recentScores[i];
        const x = padding + (i * chartWidth) / (recentScores.length - 1);
        const y = height - padding - (score * chartHeight);
        
        if (score > threshold) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, 2 * Math.PI);
          ctx.fill();
        } else {
          ctx.fillStyle = '#00d4ff';
          ctx.beginPath();
          ctx.arc(x, y, 2, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
    }

    // Draw axes labels
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px monospace';
    
    // Y-axis labels
    for (let i = 0; i <= 4; i++) {
      const value = (1 - i / 4).toFixed(1);
      const y = padding + (i * chartHeight) / 4;
      ctx.fillText(value, 5, y + 4);
    }

    // X-axis label
    ctx.fillText('Time →', width / 2 - 20, height - 5);
    ctx.fillText('Anomaly Score ↑', 5, 15);

  }, [scores, threshold]);

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Anomaly Detection Timeline</h3>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-cyan-400 rounded"></div>
            <span className="text-gray-300">Normal</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-gray-300">Anomaly</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-0.5 bg-orange-500"></div>
            <span className="text-gray-300">Threshold</span>
          </div>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-64 rounded"
        style={{ background: '#1f2937' }}
      />
    </div>
  );
};

export default AnomalyChart;