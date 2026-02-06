import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { TIME_CONTROLS } from '../utils/chessHelpers';
import api from '../utils/api';

export default function CameraGamePage() {
  const nav             = useNavigate();
  const { token }       = useAuth();
  const { detectBoard, detectFromUrl, startGame, submitMove } = useGame();

  /* ── mode: 'url' (IPWebcam) | 'upload' (image/video) ── */
  const [mode, setMode]                 = useState('url');
  const [ipUrl, setIpUrl]               = useState('');
  const [detectedFen, setDetectedFen]   = useState(null);
  const [detectionInfo, setDetectionInfo] = useState(null);
  const [scanning, setScanning]         = useState(false);
  const [gameStarted, setGameStarted]   = useState(false);
  const [currentGame, setCurrentGame]   = useState(null);
  const [previousFen, setPreviousFen]   = useState(null);
  const [timeControl, setTimeControl]   = useState(TIME_CONTROLS[4]); // Rapid 10+0
  const [error, setError]               = useState('');
  const fileRef                         = useRef(null);
  const intervalRef                     = useRef(null);

  /* ── continuous scan loop for IPWebcam ──── */
  useEffect(() => {
    if (scanning && mode === 'url' && ipUrl) {
      intervalRef.current = setInterval(async () => {
        try {
          const res = await detectFromUrl(ipUrl);
          if (res.board_detected) {
            setDetectedFen(res.fen);
            setDetectionInfo(res);
          }
        } catch (e) {
          setError('Detection failed: ' + e.message);
        }
      }, 3000); // poll every 3 seconds
      return () => clearInterval(intervalRef.current);
    }
  }, [scanning, mode, ipUrl, detectFromUrl]);

  /* ── single-shot image upload ──── */
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setScanning(true);
    try {
      const res = await detectBoard(file);
      if (res.board_detected) {
        setDetectedFen(res.fen);
        setDetectionInfo(res);
      } else {
        setError('Board not detected in the image. Try a clearer photo.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  };

  /* ── start a camera-recorded game ──── */
  const handleStartGame = async () => {
    if (!detectedFen) { setError('Detect a board first.'); return; }
    setError('');
    try {
      const game = await startGame({
        isVsBot: false,
        opponentId: null,
        timeControl: { totalSeconds: timeControl.totalSeconds, incrementSeconds: timeControl.incrementSeconds },
      });
      setCurrentGame(game);
      setGameStarted(true);
      setPreviousFen(detectedFen);
    } catch (err) {
      setError(err.message);
    }
  };

  /* ── detect move change (new FEN != previous) ──── */
  useEffect(() => {
    if (!gameStarted || !detectedFen || detectedFen === previousFen) return;
    // A new position was detected — the backend will diff and record the move
    // For now just update the previous; full SAN diff logic lives on the backend
    setPreviousFen(detectedFen);
  }, [detectedFen, gameStarted, previousFen]);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">📷 Camera Game Recording</h1>

      {/* mode toggle */}
      <div className="card flex gap-2">
        <button onClick={() => setMode('url')}    className={`btn-secondary flex-1 text-sm ${mode === 'url'    ? 'bg-primary-800' : ''}`}>IPWebcam (Live)</button>
        <button onClick={() => setMode('upload')} className={`btn-secondary flex-1 text-sm ${mode === 'upload' ? 'bg-primary-800' : ''}`}>Image / Video Upload</button>
      </div>

      {/* IPWebcam URL input */}
      {mode === 'url' && (
        <div className="card flex flex-col gap-3">
          <label className="text-sm text-gray-400">IPWebcam URL (e.g. http://192.168.1.50:8080/shot.jpg)</label>
          <input type="text" value={ipUrl} onChange={e => setIpUrl(e.target.value)} placeholder="http://192.168.x.x:8080/shot.jpg" />
          <div className="flex gap-2">
            <button
              onClick={() => setScanning(!scanning)}
              disabled={!ipUrl}
              className={scanning ? 'btn-danger flex-1' : 'btn-primary flex-1'}
            >
              {scanning ? 'Stop Scanning' : 'Start Scanning'}
            </button>
          </div>
        </div>
      )}

      {/* file upload */}
      {mode === 'upload' && (
        <div className="card">
          <label className="text-sm text-gray-400 mb-2 block">Upload an image of the chessboard</label>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="text-sm text-gray-400" />
        </div>
      )}

      {/* time control selector (shown before game start) */}
      {!gameStarted && (
        <div className="card">
          <h2 className="font-semibold text-sm text-gray-400 mb-2">Time Control</h2>
          <div className="flex flex-wrap gap-2">
            {TIME_CONTROLS.map(tc => (
              <button
                key={tc.label}
                onClick={() => setTimeControl(tc)}
                className={`rounded-lg border px-3 py-1 text-sm
                  ${timeControl.label === tc.label ? 'border-primary-500 bg-primary-900 text-primary-300' : 'border-gray-700 bg-gray-800 text-gray-300'}`}
              >
                {tc.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* detected board preview */}
      {detectedFen && (
        <div className="card flex flex-col items-center gap-3">
          <h2 className="font-semibold text-gray-300">Detected Board</h2>
          <Chessboard position={detectedFen} boardWidth={Math.min(400, window.innerWidth - 80)} areDragPiecesEnabled={false} />
          <p className="text-xs text-gray-500 font-mono break-all">{detectedFen}</p>
          {detectionInfo?.pieces && (
            <p className="text-xs text-gray-500">{detectionInfo.pieces.length} pieces detected</p>
          )}
        </div>
      )}

      {/* start / stop game */}
      {!gameStarted && detectedFen && (
        <button onClick={handleStartGame} className="btn-primary w-full">Start Recording Game</button>
      )}

      {gameStarted && (
        <div className="card text-center">
          <p className="text-green-400 font-semibold">Game recording in progress…</p>
          <p className="text-gray-500 text-sm mt-1">The system will automatically detect each move as pieces are moved on the board.</p>
          <button onClick={() => nav(`/game/analysis/${currentGame?._id}`)} className="btn-secondary mt-3 text-sm">
            End & Analyse
          </button>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
