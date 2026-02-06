import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const GameContext = createContext(null);

export const GameProvider = ({ children }) => {
  const { token } = useAuth();
  const [currentGame, setCurrentGame] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameOver, setGameOver]       = useState(false);
  const wsRef = useRef(null);

  const headers = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  /* ── start a new game ──────────────────────────────── */
  const startGame = async ({ opponentId, isVsBot, botDifficulty, timeControl }) => {
    const res = await api.post('/games/start', { opponentId, isVsBot, botDifficulty, timeControl }, { headers: headers() });
    setCurrentGame(res.data);
    setMoveHistory([]);
    setGameOver(false);
    return res.data;
  };

  /* ── submit a move ─────────────────────────────────── */
  const submitMove = async (san, detectedFen) => {
    if (!currentGame) return null;
    const res = await api.post('/games/move', { gameId: currentGame._id, move: san, detectedFen }, { headers: headers() });
    setCurrentGame(res.data);
    setMoveHistory(res.data.moves || []);
    if (res.data.result !== 'ongoing') setGameOver(true);
    return res.data;
  };

  /* ── end game explicitly ───────────────────────────── */
  const endGame = async (result) => {
    if (!currentGame) return null;
    const res = await api.post('/games/end', { gameId: currentGame._id, result }, { headers: headers() });
    setCurrentGame(res.data);
    setGameOver(true);
    return res.data;
  };

  /* ── fetch post-game analysis ──────────────────────── */
  const fetchAnalysis = async (gameId) => {
    const id = gameId || (currentGame && currentGame._id);
    if (!id) return null;
    const res = await api.post(`/games/analysis/${id}`, {}, { headers: headers() });
    return res.data;
  };

  /* ── detect board via camera / image ───────────────── */
  const detectBoard = async (imageBlob) => {
    const formData = new FormData();
    formData.append('image', imageBlob, 'frame.jpg');
    const res = await api.post('/detection/detect', formData, {
      headers: { ...headers(), 'Content-Type': 'multipart/form-data' },
    });
    return res.data; // { fen, pieces, board_detected, errors }
  };

  const detectFromUrl = async (url) => {
    const res = await api.post('/detection/detect', { url }, { headers: headers() });
    return res.data;
  };

  /* ── WebSocket connection for real-time clock ──────── */
  useEffect(() => {
    if (!token) return;
    const WS_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api')
      .replace(/^http/, 'ws').replace(/\/api$/, '');
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => ws.send(JSON.stringify({ type: 'authenticate', token }));
    wsRef.current = ws;
    return () => ws.close();
  }, [token]);

  const value = {
    currentGame, moveHistory, gameOver,
    startGame, submitMove, endGame, fetchAnalysis,
    detectBoard, detectFromUrl,
  };
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => useContext(GameContext);
