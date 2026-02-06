import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { EvaluationBar } from '../Game';
import EvaluationGraph from './EvaluationGraph';
import TacticalOpportunities from './TacticalOpportunities';

/**
 * AnalysisViewer Component
 *
 * Interactive viewer for analyzed games with:
 * - Chessboard with move navigation
 * - Evaluation graph
 * - Move list with annotations
 * - Tactical opportunities
 * - Critical moments
 *
 * Props:
 * - analysis: Full analysis object from backend
 */
const AnalysisViewer = ({ analysis }) => {
  const [chess] = useState(new Chess());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1); // -1 = starting position
  const [currentPosition, setCurrentPosition] = useState('start');

  // Navigate to specific move
  const goToMove = (index) => {
    chess.reset();

    if (index >= 0 && analysis?.moves) {
      for (let i = 0; i <= index; i++) {
        const move = analysis.moves[i];
        if (move) {
          try {
            chess.move(move.move);
          } catch (err) {
            console.error('Invalid move:', move.move, err);
          }
        }
      }
    }

    setCurrentMoveIndex(index);
    setCurrentPosition(chess.fen());
  };

  // Navigation controls
  const goToStart = () => goToMove(-1);
  const goToPrevious = () => goToMove(Math.max(-1, currentMoveIndex - 1));
  const goToNext = () => goToMove(Math.min((analysis?.moves?.length || 0) - 1, currentMoveIndex + 1));
  const goToEnd = () => goToMove((analysis?.moves?.length || 0) - 1);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'Home') {
        goToStart();
      } else if (e.key === 'End') {
        goToEnd();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentMoveIndex, analysis]);

  // Initialize to starting position
  useEffect(() => {
    goToStart();
  }, [analysis]);

  if (!analysis) {
    return (
      <div className="text-center text-gray-400 py-12">
        No analysis data available
      </div>
    );
  }

  const currentMove = currentMoveIndex >= 0 ? analysis.moves[currentMoveIndex] : null;
  const boardWidth = 480;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {analysis.players?.white || 'White'} vs {analysis.players?.black || 'Black'}
            </h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
              {analysis.event && <span>{analysis.event}</span>}
              {analysis.date && <span>{new Date(analysis.date).toLocaleDateString()}</span>}
              {analysis.result && (
                <span className="px-2 py-1 bg-gray-700 rounded">{analysis.result}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Analyzed with</div>
            <div className="font-semibold text-gray-200">
              {analysis.engineName || 'Stockfish'} (Depth {analysis.depth})
            </div>
          </div>
        </div>
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Evaluation Bar */}
        <div className="lg:col-span-1 flex lg:flex-col items-center justify-center">
          {currentMove && (
            <EvaluationBar evaluation={currentMove.evalAfter} height={480} />
          )}
        </div>

        {/* Center: Board + Controls */}
        <div className="lg:col-span-6 space-y-4">
          {/* Chessboard */}
          <div className="flex justify-center">
            <Chessboard
              position={currentPosition}
              boardWidth={boardWidth}
              arePiecesDraggable={false}
            />
          </div>

          {/* Navigation Controls */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-white font-semibold">
                {currentMove ? (
                  <>
                    Move {currentMove.moveNumber}.{' '}
                    {currentMove.side === 'black' && '..'}
                    {currentMove.move}
                  </>
                ) : (
                  'Starting Position'
                )}
              </div>
              {currentMove && (
                <div className={`px-2 py-1 rounded text-xs font-semibold ${
                  currentMove.quality === 'best' ? 'bg-green-900 text-green-300' :
                  currentMove.quality === 'excellent' ? 'bg-blue-900 text-blue-300' :
                  currentMove.quality === 'good' ? 'bg-gray-700 text-gray-300' :
                  currentMove.quality === 'inaccuracy' ? 'bg-yellow-900 text-yellow-300' :
                  currentMove.quality === 'mistake' ? 'bg-orange-900 text-orange-300' :
                  'bg-red-900 text-red-300'
                }`}>
                  {currentMove.quality.toUpperCase()}
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div className="flex gap-2">
              <button
                onClick={goToStart}
                disabled={currentMoveIndex === -1}
                className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded font-semibold transition-colors"
              >
                ⏮ Start
              </button>
              <button
                onClick={goToPrevious}
                disabled={currentMoveIndex === -1}
                className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded font-semibold transition-colors"
              >
                ◀ Previous
              </button>
              <button
                onClick={goToNext}
                disabled={currentMoveIndex === (analysis.moves?.length || 0) - 1}
                className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded font-semibold transition-colors"
              >
                Next ▶
              </button>
              <button
                onClick={goToEnd}
                disabled={currentMoveIndex === (analysis.moves?.length || 0) - 1}
                className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded font-semibold transition-colors"
              >
                End ⏭
              </button>
            </div>

            <div className="mt-2 text-center text-xs text-gray-500">
              Use ← → arrow keys to navigate
            </div>
          </div>

          {/* Current Move Details */}
          {currentMove && (
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <h4 className="font-semibold text-white mb-3">Move Details</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-gray-500">Best Move</div>
                  <code className="text-green-400">{currentMove.bestMove || 'N/A'}</code>
                </div>
                <div>
                  <div className="text-gray-500">CP Loss</div>
                  <span className={currentMove.cpLoss > 100 ? 'text-red-400' : 'text-gray-300'}>
                    {currentMove.cpLoss?.toFixed(0) || 0}
                  </span>
                </div>
                <div>
                  <div className="text-gray-500">Eval Before</div>
                  <span className="text-gray-300">
                    {currentMove.evalBefore.type === 'mate'
                      ? `M${currentMove.evalBefore.value}`
                      : (currentMove.evalBefore.value / 100).toFixed(2)}
                  </span>
                </div>
                <div>
                  <div className="text-gray-500">Eval After</div>
                  <span className="text-gray-300">
                    {currentMove.evalAfter.type === 'mate'
                      ? `M${currentMove.evalAfter.value}`
                      : (currentMove.evalAfter.value / 100).toFixed(2)}
                  </span>
                </div>
              </div>
              {currentMove.comment && (
                <div className="mt-3 text-sm text-gray-400 italic">
                  {currentMove.comment}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Move List */}
        <div className="lg:col-span-5 space-y-4">
          {/* Move List */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="bg-gray-900 px-4 py-2 border-b border-gray-700">
              <h4 className="font-semibold text-white">Move List</h4>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-1">
                {analysis.moves?.map((move, idx) => (
                  <button
                    key={idx}
                    onClick={() => goToMove(idx)}
                    className={`w-full text-left px-3 py-2 rounded transition-colors ${
                      idx === currentMoveIndex
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {move.side === 'white' && (
                          <span className="text-gray-500 font-mono text-sm w-8">
                            {move.moveNumber}.
                          </span>
                        )}
                        {move.side === 'black' && (
                          <span className="text-gray-500 font-mono text-sm w-8">...</span>
                        )}
                        <span className="font-mono">{move.move}</span>
                        {move.quality === 'best' && <span className="text-green-400">!!</span>}
                        {move.quality === 'excellent' && <span className="text-blue-400">!</span>}
                        {move.quality === 'inaccuracy' && <span className="text-yellow-400">?!</span>}
                        {move.quality === 'mistake' && <span className="text-orange-400">?</span>}
                        {move.quality === 'blunder' && <span className="text-red-400">??</span>}
                      </div>
                      <span className="text-xs text-gray-500">
                        {move.evalAfter.type === 'mate'
                          ? `M${move.evalAfter.value}`
                          : (move.evalAfter.value / 100).toFixed(1)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
            <h4 className="font-semibold text-white mb-3">Statistics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1">White</div>
                <div className="text-2xl font-bold text-white">
                  {analysis.statistics?.white?.accuracy?.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Avg Loss: {analysis.statistics?.white?.avgCentipawnLoss?.toFixed(0)} cp
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Black</div>
                <div className="text-2xl font-bold text-white">
                  {analysis.statistics?.black?.accuracy?.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Avg Loss: {analysis.statistics?.black?.avgCentipawnLoss?.toFixed(0)} cp
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluation Graph */}
      <EvaluationGraph
        moves={analysis.moves}
        height={250}
        onMoveClick={goToMove}
        currentMoveIndex={currentMoveIndex}
      />

      {/* Tactical Opportunities */}
      {analysis.tacticalOpportunities && analysis.tacticalOpportunities.length > 0 && (
        <TacticalOpportunities
          opportunities={analysis.tacticalOpportunities}
          onPositionClick={(moveNumber) => {
            const idx = analysis.moves.findIndex(m => m.moveNumber === moveNumber);
            if (idx >= 0) goToMove(idx);
          }}
        />
      )}
    </div>
  );
};

export default AnalysisViewer;
