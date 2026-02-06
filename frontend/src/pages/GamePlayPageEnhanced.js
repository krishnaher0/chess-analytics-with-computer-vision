import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { EvaluationBar, BestMoveOverlay, EnginePanel } from '../components/Game';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';

export default function GamePlayPageEnhanced() {
  const { gameId } = useParams();
  const nav = useNavigate();
  const { user, token } = useAuth();
  const { submitMove, endGame } = useGame();

  // Game state
  const [game, setGame] = useState(null);
  const [chess, setChess] = useState(() => new Chess());
  const [gameOver, setGameOver] = useState(false);
  const [loading, setLoading] = useState(true);

  // Engine state
  const [engineEnabled, setEngineEnabled] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [analyzingPosition, setAnalyzingPosition] = useState(false);
  const [showBestMove, setShowBestMove] = useState(true);

  // WebSocket
  const wsRef = useRef(null);
  const clockRef = useRef(null);

  // Format time display
  const formatTime = (ms) => {
    if (!ms || ms < 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  /* ── WebSocket Setup ──── */
  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected');
      ws.send(JSON.stringify({ type: 'authenticate', token }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'authenticated':
            console.log('[WS] Authenticated');
            ws.send(JSON.stringify({
              type: 'watch_game',
              gameId,
              opponentId: null // TODO: get from game object
            }));
            break;

          case 'clock_tick':
            // Update clocks locally
            setGame((prev) => {
              if (!prev || prev.result !== 'ongoing') return prev;
              const key = prev.activeColor === 'white' ? 'whiteTimeLeft' : 'blackTimeLeft';
              const next = { ...prev, [key]: prev[key] - 1000 };
              if (next[key] <= 0) {
                const winner = prev.activeColor === 'white' ? 'black' : 'white';
                endGame(winner);
                setGameOver(true);
              }
              return next;
            });
            break;

          case 'opponent_move':
            // Refresh game state when opponent moves
            fetchGame();
            break;

          case 'analysis_result':
            setAnalysis(message);
            setAnalyzingPosition(false);
            break;

          case 'analysis_error':
            console.error('[WS] Analysis error:', message.error);
            setAnalyzingPosition(false);
            break;

          case 'engine_toggled':
            console.log('[WS] Engine toggled:', message.enabled);
            break;

          default:
            console.log('[WS] Unknown message type:', message.type);
        }
      } catch (err) {
        console.error('[WS] Message parse error:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'unwatch_game' }));
        ws.close();
      }
    };
  }, [token, gameId]);

  /* ── Fetch game on mount ──── */
  const fetchGame = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/games/${gameId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setGame(data);
      const c = new Chess(data.currentFen || 'start');
      setChess(c);
      if (data.result !== 'ongoing') setGameOver(true);

      // If engine is enabled, analyze new position
      if (engineEnabled && wsRef.current?.readyState === WebSocket.OPEN) {
        requestAnalysis(c.fen());
      }
    } catch (e) {
      console.error('[Game] Fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [gameId, token, engineEnabled]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  /* ── Request analysis via WebSocket ──── */
  const requestAnalysis = useCallback((fen) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[Engine] WebSocket not ready');
      return;
    }

    setAnalyzingPosition(true);
    wsRef.current.send(JSON.stringify({
      type: 'request_analysis',
      fen,
      depth: 15,
      multipv: 3
    }));
  }, []);

  /* ── Toggle engine ──── */
  const toggleEngine = useCallback(() => {
    const newState = !engineEnabled;
    setEngineEnabled(newState);

    // Notify server
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'toggle_engine',
        gameId,
        enabled: newState
      }));
    }

    // If enabling, analyze current position
    if (newState && chess) {
      requestAnalysis(chess.fen());
    } else {
      setAnalysis(null);
    }
  }, [engineEnabled, gameId, chess, requestAnalysis]);

  /* ── Handle user move on board ──── */
  const onDrop = useCallback(async (sourceSquare, targetSquare) => {
    if (gameOver || !game) return false;

    // Check if it's the user's turn
    const currentTurn = chess.turn();
    const userColor = user?.id === game.players?.white?.toString() ? 'w' : 'b';

    if (currentTurn !== userColor) {
      return false;
    }

    const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    if (!move) return false;

    // Optimistic UI update
    const newChess = new Chess(chess.fen());
    setChess(newChess);

    try {
      const response = await fetch(`${API_URL}/games/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ gameId, move: move.san })
      });

      const data = await response.json();
      setGame(data);
      setChess(new Chess(data.currentFen));

      if (data.result !== 'ongoing') {
        setGameOver(true);
      }

      // Analyze new position if engine enabled
      if (engineEnabled) {
        requestAnalysis(data.currentFen);
      }
    } catch (err) {
      // Revert on error
      setChess(new Chess(game.currentFen));
      console.error('[Game] Move error:', err);
    }
    return true;
  }, [game, chess, gameOver, gameId, token, user, engineEnabled, requestAnalysis]);

  /* ── Resign button ──── */
  const handleResign = async () => {
    if (gameOver) return;
    const userColor = user?.id === game.players?.white?.toString() ? 'white' : 'black';
    const winner = userColor === 'white' ? 'black' : 'white';
    await endGame(winner);
    setGameOver(true);
  };

  /* ── Offer draw ──── */
  const handleDraw = async () => {
    if (gameOver) return;
    await endGame('draw');
    setGameOver(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="text-center text-red-400 mt-20">
        Game not found.
      </div>
    );
  }

  const boardWidth = Math.min(480, window.innerWidth - 40);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Evaluation Bar */}
        <div className="lg:col-span-1 flex lg:flex-col items-center justify-center">
          {engineEnabled && analysis && (
            <EvaluationBar evaluation={analysis.evaluation} height={480} />
          )}
        </div>

        {/* Center: Chessboard */}
        <div className="lg:col-span-7 flex flex-col items-center gap-4">
          {/* Black Player Info */}
          <div className={`w-full max-w-md px-4 py-2 rounded-lg flex justify-between items-center ${
            game.activeColor === 'black' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400'
          }`}>
            <span className="font-semibold">♚ Black</span>
            <span className="font-mono">{formatTime(game.blackTimeLeft)}</span>
          </div>

          {/* Chessboard with Overlay */}
          <div className="relative">
            <Chessboard
              position={chess.fen()}
              onPieceDrop={onDrop}
              boardWidth={boardWidth}
              arePiecesDraggable={!gameOver}
            />
            {engineEnabled && showBestMove && analysis?.bestMove && (
              <BestMoveOverlay
                bestMove={analysis.bestMove}
                boardWidth={boardWidth}
                boardOrientation="white"
                show={true}
              />
            )}
          </div>

          {/* White Player Info */}
          <div className={`w-full max-w-md px-4 py-2 rounded-lg flex justify-between items-center ${
            game.activeColor === 'white' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400'
          }`}>
            <span className="font-semibold">♔ White</span>
            <span className="font-mono">{formatTime(game.whiteTimeLeft)}</span>
          </div>

          {/* Game Controls */}
          <div className="w-full max-w-md flex gap-3">
            <button
              onClick={toggleEngine}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                engineEnabled
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {engineEnabled ? '🔌 Engine On' : '⚪ Engine Off'}
            </button>

            {engineEnabled && (
              <button
                onClick={() => setShowBestMove(!showBestMove)}
                className={`px-4 py-2 rounded-lg font-semibold ${
                  showBestMove
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {showBestMove ? '👁️' : '🙈'}
              </button>
            )}
          </div>

          {!gameOver && (
            <div className="w-full max-w-md flex gap-3">
              <button
                onClick={handleResign}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
              >
                Resign
              </button>
              <button
                onClick={handleDraw}
                className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold"
              >
                Offer Draw
              </button>
            </div>
          )}

          {gameOver && (
            <div className="w-full max-w-md bg-gray-800 border-2 border-gray-600 rounded-lg p-6 text-center">
              <p className="text-2xl font-bold text-blue-400 mb-4">
                {game.result === 'draw' ? 'Draw!' : `${game.result} wins!`}
              </p>
              <button
                onClick={() => nav(`/game/analysis/${gameId}`)}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
              >
                View Full Analysis
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Engine Panel */}
          {engineEnabled && (
            <EnginePanel analysis={analysis} loading={analyzingPosition} />
          )}

          {/* Move List */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <div className="bg-gray-900 px-4 py-2 border-b border-gray-700">
              <h3 className="font-semibold text-white">Move History</h3>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <div className="space-y-1">
                {game.moves && game.moves.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {m.movedBy === 'white' && (
                      <span className="text-gray-600 font-mono text-sm w-8">
                        {Math.ceil((i + 1) / 2)}.
                      </span>
                    )}
                    <span className={`font-mono text-sm ${
                      m.movedBy === 'white' ? 'text-gray-200' : 'text-gray-400'
                    }`}>
                      {m.san}
                    </span>
                    {m.quality && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        m.quality === 'best' ? 'bg-green-900 text-green-300' :
                        m.quality === 'excellent' ? 'bg-blue-900 text-blue-300' :
                        m.quality === 'good' ? 'bg-gray-700 text-gray-300' :
                        m.quality === 'inaccuracy' ? 'bg-yellow-900 text-yellow-300' :
                        m.quality === 'mistake' ? 'bg-orange-900 text-orange-300' :
                        'bg-red-900 text-red-300'
                      }`}>
                        {m.quality === 'best' ? '!!' :
                         m.quality === 'excellent' ? '!' :
                         m.quality === 'inaccuracy' ? '?!' :
                         m.quality === 'mistake' ? '?' :
                         m.quality === 'blunder' ? '??' : ''}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
