import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';

const GameContext = createContext(null);

export const GameProvider = ({ children }) => {
  const { token } = useAuth();
  const [currentGame, setCurrentGame] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [incomingChallenge, setIncomingChallenge] = useState(null);
  const [outgoingChallenge, setOutgoingChallenge] = useState(null);
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

  /* ── challenge functions ─────────────────────────────── */
  const sendChallenge = (toId, timeControl) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'challenge_send', toId, timeControl }));
      setOutgoingChallenge({ toId, timeControl });
    }
  };

  const acceptChallenge = (fromId, timeControl) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'challenge_accept', fromId, timeControl }));
      setIncomingChallenge(null);
    }
  };

  const declineChallenge = (fromId) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'challenge_decline', fromId }));
      setIncomingChallenge(null);
    }
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

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'challenge_received':
          setIncomingChallenge(data);
          break;
        case 'challenge_accepted':
          // Game started! Both players navigate to the game page.
          // Note: CurrentGame state will be fetched by the GamePlayPage via its own effect or we can set it here if we fetch it.
          // For simplicity, we just trigger a navigation by providing the ID.
          setOutgoingChallenge(null);
          setIncomingChallenge(null);
          window.location.href = `/game/${data.gameId}`;
          break;
        case 'challenge_declined':
          setOutgoingChallenge(null);
          alert('Challenge declined.');
          break;
        case 'challenge_error':
          setOutgoingChallenge(null);
          alert(data.message);
          break;
        default:
          break;
      }
    };

    wsRef.current = ws;

    return () => {
      // Clear handlers before closing to prevent any "after-death" callback execution
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [token]);

  const value = {
    currentGame, moveHistory, gameOver,
    incomingChallenge, outgoingChallenge,
    setIncomingChallenge, setOutgoingChallenge,
    startGame, submitMove, endGame, fetchAnalysis,
    detectBoard, detectFromUrl,
    sendChallenge, acceptChallenge, declineChallenge
  };
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => useContext(GameContext);
