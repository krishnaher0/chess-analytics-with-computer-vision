import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { formatTime, formatEval, pieceToSymbol } from '../utils/chessHelpers';
import api from '../utils/api';

export default function GamePlayPage() {
  const { gameId }          = useParams();
  const nav                 = useNavigate();
  const { token }           = useAuth();
  const { submitMove, endGame } = useGame();

  const [game, setGame]             = useState(null);
  const [chess, setChess]           = useState(() => new Chess());
  const [currentEval, setCurrentEval] = useState(null);
  const [gameOver, setGameOver]     = useState(false);
  const [loading, setLoading]       = useState(true);
  const clockRef                    = useRef(null);

  /* ── fetch game on mount ──── */
  useEffect(() => {
    const fetchGame = async () => {
      try {
        const res = await api.get(`/games/${gameId}`, { headers: { Authorization: `Bearer ${token}` } });
        setGame(res.data);
        const c = new Chess(res.data.currentFen);
        setChess(c);
        if (res.data.result !== 'ongoing') setGameOver(true);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchGame();
  }, [gameId, token]);

  /* ── clock countdown ──── */
  useEffect(() => {
    if (!game || gameOver) return;
    clockRef.current = setInterval(() => {
      setGame(prev => {
        if (!prev || prev.result !== 'ongoing') return prev;
        const key = prev.activeColor === 'white' ? 'whiteTimeLeft' : 'blackTimeLeft';
        const next = { ...prev, [key]: prev[key] - 1000 };
        if (next[key] <= 0) {
          // time ran out — end the game
          const winner = prev.activeColor === 'white' ? 'black' : 'white';
          endGame(winner);
          setGameOver(true);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(clockRef.current);
  }, [game, gameOver, endGame]);

  /* ── handle user move on board ──── */
  const onDrop = useCallback(async (sourceSquare, targetSquare) => {
    if (gameOver || !game) return false;
    // Only let the correct side move
    if (game.activeColor !== (chess.turn() === 'w' ? 'white' : 'black')) return false;

    const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    if (!move) return false;

    // Optimistic UI update
    const newChess = new Chess(chess.fen());
    setChess(newChess);

    try {
      const res = await api.post('/games/move',
        { gameId, move: move.san },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGame(res.data);
      setChess(new Chess(res.data.currentFen));
      if (res.data.moves?.length > 0) {
        const lastMove = res.data.moves[res.data.moves.length - 1];
        setCurrentEval(lastMove.stockfishEval);
      }
      if (res.data.result !== 'ongoing') setGameOver(true);
    } catch (err) {
      // revert on error
      setChess(new Chess(game.currentFen));
      console.error(err);
    }
    return true;
  }, [game, chess, gameOver, gameId, token]);

  /* ── resign button ──── */
  const handleResign = async () => {
    if (gameOver) return;
    const loser  = game.activeColor;
    const winner = loser === 'white' ? 'black' : 'white';
    await endGame(winner);
    setGameOver(true);
  };

  /* ── offer draw ──── */
  const handleDraw = async () => {
    if (gameOver) return;
    await endGame('draw');
    setGameOver(true);
  };

  if (loading) return <div className="text-center text-gray-500 mt-20">Loading game…</div>;
  if (!game)   return <div className="text-center text-red-400 mt-20">Game not found.</div>;

  /* eval bar color */
  const evalVal   = typeof currentEval === 'number' ? currentEval : 0;
  const evalPct   = Math.min(100, Math.max(0, 50 + (evalVal / 10))); // rough mapping
  const evalColor = evalVal >= 0 ? 'bg-white' : 'bg-gray-700';

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
      {/* board + clocks */}
      <div className="flex flex-col items-center gap-3">
        {/* black clock (top) */}
        <div className={`px-4 py-1.5 rounded-lg text-sm font-mono font-bold
          ${game.activeColor === 'black' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400'}`}>
          ♚ Black &nbsp; {formatTime(game.blackTimeLeft)}
        </div>

        {/* chessboard */}
        <Chessboard
          position={chess.fen()}
          onPieceDrop={onDrop}
          boardWidth={Math.min(480, window.innerWidth - 40)}
        />

        {/* white clock (bottom) */}
        <div className={`px-4 py-1.5 rounded-lg text-sm font-mono font-bold
          ${game.activeColor === 'white' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400'}`}>
          ♔ White &nbsp; {formatTime(game.whiteTimeLeft)}
        </div>
      </div>

      {/* sidebar: eval bar, move list, actions */}
      <div className="flex flex-col gap-4 w-full lg:w-64">
        {/* eval bar */}
        <div className="card">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Eval</span>
            <span className="font-mono">{typeof currentEval === 'number' ? (currentEval/100).toFixed(2) : '0.00'}</span>
          </div>
          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${evalColor}`} style={{ width: `${evalPct}%` }} />
          </div>
        </div>

        {/* actions */}
        {!gameOver && (
          <div className="card flex gap-2">
            <button onClick={handleResign} className="btn-danger flex-1 text-sm px-2 py-1.5">Resign</button>
            <button onClick={handleDraw}   className="btn-secondary flex-1 text-sm px-2 py-1.5">Draw</button>
          </div>
        )}

        {/* game over banner */}
        {gameOver && (
          <div className="card text-center">
            <p className="text-lg font-bold text-primary-400 capitalize">{game.result === 'draw' ? 'Draw' : `${game.result} wins`}</p>
            <button onClick={() => nav(`/game/analysis/${gameId}`)} className="btn-primary mt-2 text-sm">
              View Analysis
            </button>
          </div>
        )}

        {/* move list */}
        <div className="card max-h-64 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Moves</h3>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
            {game.moves && game.moves.map((m, i) => (
              <span key={i} className={`font-mono ${m.movedBy === 'white' ? 'text-gray-200' : 'text-gray-500'}`}>
                {m.movedBy === 'white' && <span className="text-gray-600 mr-1">{Math.ceil((i+1)/2)}.</span>}
                {m.san}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
