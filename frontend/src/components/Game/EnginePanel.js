import React from 'react';

/**
 * EnginePanel Component
 *
 * Displays engine analysis information including:
 * - Best move
 * - Evaluation
 * - Top moves (principal variations)
 *
 * Props:
 * - analysis: { evaluation, bestMove, topMoves, depth }
 * - loading: boolean
 */
const EnginePanel = ({ analysis, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-gray-400 text-sm">Analyzing...</span>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="text-gray-500 text-sm text-center">
          No analysis available
        </div>
      </div>
    );
  }

  const { evaluation, bestMove, topMoves, depth } = analysis;

  // Format evaluation for display
  const formatEval = (evalObj) => {
    if (!evalObj) return '0.0';

    if (evalObj.type === 'mate') {
      const mateIn = Math.abs(evalObj.value);
      return evalObj.value > 0 ? `Mate in ${mateIn}` : `Mated in ${mateIn}`;
    }

    const pawns = (evalObj.value / 100).toFixed(1);
    return pawns > 0 ? `+${pawns}` : pawns;
  };

  // Format UCI move to readable format
  const formatMove = (uciMove) => {
    if (!uciMove || uciMove.length < 4) return '-';
    const from = uciMove.substring(0, 2);
    const to = uciMove.substring(2, 4);
    const promotion = uciMove.length > 4 ? uciMove[4].toUpperCase() : '';
    return `${from}-${to}${promotion}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-900 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">Engine Analysis</h3>
          <span className="text-xs text-gray-500">Depth: {depth}</span>
        </div>
      </div>

      {/* Best Move */}
      <div className="p-4 border-b border-gray-700">
        <div className="text-xs text-gray-500 mb-1">Best Move</div>
        <div className="flex items-center justify-between">
          <code className="text-xl font-bold text-blue-400">
            {formatMove(bestMove)}
          </code>
          <span className={`text-lg font-bold ${
            evaluation?.type === 'mate'
              ? 'text-purple-400'
              : evaluation?.value > 0
                ? 'text-green-400'
                : evaluation?.value < 0
                  ? 'text-red-400'
                  : 'text-gray-400'
          }`}>
            {formatEval(evaluation)}
          </span>
        </div>
      </div>

      {/* Top Moves */}
      {topMoves && topMoves.length > 0 && (
        <div className="p-4">
          <div className="text-xs text-gray-500 mb-2">Top Moves</div>
          <div className="space-y-2">
            {topMoves.map((moveData, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-sm bg-gray-900 rounded px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 font-mono">{idx + 1}.</span>
                  <code className="text-gray-300 font-mono">
                    {formatMove(moveData.move)}
                  </code>
                </div>
                <span className={`font-mono text-xs ${
                  moveData.eval?.type === 'mate'
                    ? 'text-purple-400'
                    : moveData.eval?.value > 0
                      ? 'text-green-400'
                      : moveData.eval?.value < 0
                        ? 'text-red-400'
                        : 'text-gray-400'
                }`}>
                  {formatEval(moveData.eval)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EnginePanel;
