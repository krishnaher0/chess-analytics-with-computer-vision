import React, { useState } from 'react';
import { Chessboard } from 'react-chessboard';

/**
 * TacticalOpportunities Component
 *
 * Displays missed tactical opportunities from game analysis
 *
 * Props:
 * - opportunities: Array of tactical opportunity objects
 * - onPositionClick: Callback to navigate to specific position
 */
const TacticalOpportunities = ({ opportunities, onPositionClick }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (!opportunities || opportunities.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-600 mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-gray-400">No missed tactics found</p>
        <p className="text-sm text-gray-500 mt-1">Great play!</p>
      </div>
    );
  }

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // Format UCI move to readable format
  const formatMove = (move) => {
    if (!move || move.length < 4) return move;
    const from = move.substring(0, 2);
    const to = move.substring(2, 4);
    const promotion = move.length > 4 ? move[4].toUpperCase() : '';
    return `${from}-${to}${promotion}`;
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'fork':
        return '⚔️';
      case 'pin':
        return '📌';
      case 'skewer':
        return '🗡️';
      case 'discovery':
        return '🔍';
      case 'mate_threat':
        return '♔';
      case 'material_gain':
        return '💎';
      case 'positional':
        return '🎯';
      default:
        return '💡';
    }
  };

  // Get severity color based on cp loss
  const getSeverityColor = (cpLoss) => {
    if (cpLoss >= 300) return 'border-red-500 bg-red-900/20';
    if (cpLoss >= 200) return 'border-orange-500 bg-orange-900/20';
    if (cpLoss >= 100) return 'border-yellow-500 bg-yellow-900/20';
    return 'border-gray-600 bg-gray-800';
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Tactical Opportunities</h3>
          <span className="px-2 py-1 bg-red-900/50 text-red-300 rounded text-sm">
            {opportunities.length} missed
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Key moments where better moves were available
        </p>
      </div>

      {/* List of Opportunities */}
      <div className="divide-y divide-gray-700">
        {opportunities.map((opp, index) => (
          <div
            key={index}
            className={`border-l-4 transition-colors ${getSeverityColor(opp.cpLoss)}`}
          >
            {/* Summary Row */}
            <div
              className="p-4 cursor-pointer hover:bg-gray-700/50 transition-colors"
              onClick={() => toggleExpand(index)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getCategoryIcon(opp.category)}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">
                        Move {opp.moveNumber}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded">
                        {opp.category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      {opp.description || `Missed tactical opportunity`}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-gray-500">
                        Played: <code className="text-red-400">{opp.playerMove}</code>
                      </span>
                      <span className="text-gray-500">
                        Best: <code className="text-green-400">{formatMove(opp.bestMove)}</code>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-red-400">
                    -{opp.cpLoss} cp
                  </div>
                  <button className="text-blue-400 text-xs hover:text-blue-300 mt-1">
                    {expandedIndex === index ? '▼ Hide' : '▶ Show Position'}
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded View - Position */}
            {expandedIndex === index && (
              <div className="px-4 pb-4 bg-gray-900/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  {/* Chessboard */}
                  <div>
                    <div className="text-xs text-gray-400 mb-2">Position before move</div>
                    <Chessboard
                      position={opp.fen}
                      boardWidth={280}
                      arePiecesDraggable={false}
                    />
                  </div>

                  {/* Details */}
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">FEN</div>
                      <code className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded block break-all">
                        {opp.fen}
                      </code>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Evaluation</div>
                      <div className="text-sm text-gray-300">
                        {opp.evaluation.type === 'mate' ? (
                          <span>
                            Mate in {Math.abs(opp.evaluation.value)}
                          </span>
                        ) : (
                          <span>
                            {(opp.evaluation.value / 100).toFixed(2)} pawns
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">Analysis</div>
                      <div className="text-sm text-gray-300">
                        Playing <code className="text-green-400 bg-gray-800 px-1 rounded">{formatMove(opp.bestMove)}</code> instead
                        would have saved approximately <span className="text-red-400 font-semibold">{opp.cpLoss}</span> centipawns
                        of advantage.
                      </div>
                    </div>

                    {onPositionClick && (
                      <button
                        onClick={() => onPositionClick(opp.moveNumber)}
                        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        Jump to this Position
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      {opportunities.length > 0 && (
        <div className="bg-gray-900 px-4 py-3 border-t border-gray-700 text-sm text-gray-400">
          <p>
            💡 <span className="font-semibold">Tip:</span> Review these positions to improve your tactical awareness.
            Focus on calculating deeper in critical positions.
          </p>
        </div>
      )}
    </div>
  );
};

export default TacticalOpportunities;
