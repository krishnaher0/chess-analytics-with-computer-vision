import React, { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * EvaluationGraph Component
 *
 * Displays a line graph showing evaluation throughout the game
 *
 * Props:
 * - moves: Array of move objects with evalAfter
 * - height: Graph height in pixels (default 200)
 * - onMoveClick: Callback when clicking a point (optional)
 * - currentMoveIndex: Highlight specific move (optional)
 */
const EvaluationGraph = ({ moves, height = 200, onMoveClick, currentMoveIndex }) => {
  const chartRef = useRef(null);

  // Convert moves to data points
  const getChartData = () => {
    if (!moves || moves.length === 0) {
      return {
        labels: [],
        datasets: []
      };
    }

    // Convert evaluations to numeric values (in pawns)
    const evaluations = moves.map(move => {
      if (move.evalAfter.type === 'mate') {
        // Cap mate scores at +/-10 pawns for visualization
        return move.evalAfter.value > 0 ? 10 : -10;
      }
      // Convert centipawns to pawns, cap at +/-10
      const pawns = move.evalAfter.value / 100;
      return Math.max(-10, Math.min(10, pawns));
    });

    // Labels: move numbers
    const labels = moves.map((move, idx) => {
      if (move.side === 'white') {
        return `${move.moveNumber}.`;
      } else {
        return `${move.moveNumber}...`;
      }
    });

    // Create gradient for area fill
    const createGradient = (ctx, chartArea) => {
      if (!chartArea) return null;

      const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      gradient.addColorStop(0.5, 'rgba(128, 128, 128, 0.1)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      return gradient;
    };

    return {
      labels,
      datasets: [
        {
          label: 'Evaluation',
          data: evaluations,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return null;
            return createGradient(ctx, chartArea);
          },
          borderWidth: 2,
          pointRadius: (context) => {
            // Highlight current move
            return context.dataIndex === currentMoveIndex ? 6 : 3;
          },
          pointBackgroundColor: (context) => {
            const idx = context.dataIndex;
            if (idx === currentMoveIndex) return 'rgb(59, 130, 246)';

            // Color code by move quality
            const move = moves[idx];
            if (!move) return 'rgb(156, 163, 175)';

            switch (move.quality) {
              case 'best':
              case 'excellent':
                return 'rgb(34, 197, 94)';
              case 'good':
                return 'rgb(156, 163, 175)';
              case 'inaccuracy':
                return 'rgb(234, 179, 8)';
              case 'mistake':
                return 'rgb(249, 115, 22)';
              case 'blunder':
                return 'rgb(239, 68, 68)';
              default:
                return 'rgb(156, 163, 175)';
            }
          },
          pointBorderColor: 'rgba(255, 255, 255, 0.8)',
          pointBorderWidth: 1,
          fill: true,
          tension: 0.1
        }
      ]
    };
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    onClick: (event, elements) => {
      if (elements.length > 0 && onMoveClick) {
        const index = elements[0].index;
        onMoveClick(index);
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: (context) => {
            const idx = context[0].dataIndex;
            const move = moves[idx];
            return `${move.side === 'white' ? 'White' : 'Black'} - Move ${move.moveNumber}: ${move.move}`;
          },
          label: (context) => {
            const idx = context.dataIndex;
            const move = moves[idx];

            let evalText = '';
            if (move.evalAfter.type === 'mate') {
              const mateIn = Math.abs(move.evalAfter.value);
              evalText = move.evalAfter.value > 0 ? `Mate in ${mateIn}` : `Mated in ${mateIn}`;
            } else {
              const pawns = (move.evalAfter.value / 100).toFixed(2);
              evalText = `Eval: ${pawns > 0 ? '+' : ''}${pawns}`;
            }

            const qualityText = move.quality.charAt(0).toUpperCase() + move.quality.slice(1);
            const cpLossText = move.cpLoss > 0 ? ` (${move.cpLoss}cp loss)` : '';

            return [evalText, `Quality: ${qualityText}${cpLossText}`];
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 20,
          font: {
            size: 10
          }
        }
      },
      y: {
        min: -10,
        max: 10,
        grid: {
          color: (context) => {
            // Highlight center line (equal position)
            return context.tick.value === 0
              ? 'rgba(255, 255, 255, 0.3)'
              : 'rgba(255, 255, 255, 0.05)';
          },
          drawBorder: false
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          callback: (value) => {
            if (value === 0) return '0.0';
            return value > 0 ? `+${value}` : value;
          },
          font: {
            size: 11
          }
        }
      }
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">Evaluation Graph</h3>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Good</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span>Inaccuracy</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
            <span>Mistake</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span>Blunder</span>
          </div>
        </div>
      </div>

      <div style={{ height: `${height}px`, position: 'relative' }}>
        {moves && moves.length > 0 ? (
          <Line ref={chartRef} data={getChartData()} options={options} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No move data available
          </div>
        )}
      </div>

      <div className="mt-2 text-center text-xs text-gray-500">
        Click on a point to jump to that move
      </div>
    </div>
  );
};

export default EvaluationGraph;
