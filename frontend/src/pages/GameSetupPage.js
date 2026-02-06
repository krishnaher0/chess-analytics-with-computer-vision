import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGame } from '../context/GameContext';
import { TIME_CONTROLS, BOT_DIFFICULTIES } from '../utils/chessHelpers';

export default function GameSetupPage() {
  const [params]        = useSearchParams();
  const nav             = useNavigate();
  const { startGame }   = useGame();
  const isFriend        = params.get('mode') === 'friend';

  const [timeControl, setTimeControl]       = useState(TIME_CONTROLS[2]); // Blitz 3+0 default
  const [botDifficulty, setBotDifficulty]   = useState(BOT_DIFFICULTIES[1]);
  const [friendUsername, setFriendUsername]  = useState('');
  const [error, setError]                   = useState('');
  const [loading, setLoading]               = useState(false);

  const handleStart = async () => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        isVsBot: !isFriend,
        botDifficulty: isFriend ? null : botDifficulty.value,
        opponentId: null, // friend search by username will be resolved server-side in a real impl
        timeControl: { totalSeconds: timeControl.totalSeconds, incrementSeconds: timeControl.incrementSeconds },
      };
      if (isFriend && friendUsername.trim()) {
        payload.friendUsername = friendUsername.trim();
      }
      const game = await startGame(payload);
      nav(`/game/${game._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold">
        {isFriend ? '🤝 Play vs Friend' : '♟ Play vs Bot'}
      </h1>

      {/* time control */}
      <div className="card">
        <h2 className="font-semibold mb-3 text-gray-300">Time Control</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TIME_CONTROLS.map((tc) => (
            <button
              key={tc.label}
              onClick={() => setTimeControl(tc)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors
                ${timeControl.label === tc.label
                  ? 'border-primary-500 bg-primary-900 text-primary-300'
                  : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'}`}
            >
              {tc.label}
            </button>
          ))}
        </div>
      </div>

      {/* bot difficulty — only shown when playing vs bot */}
      {!isFriend && (
        <div className="card">
          <h2 className="font-semibold mb-3 text-gray-300">Bot Difficulty</h2>
          <div className="flex gap-2 flex-wrap">
            {BOT_DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                onClick={() => setBotDifficulty(d)}
                className={`rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors
                  ${botDifficulty.value === d.value
                    ? 'border-accent-500 bg-accent-900 text-accent-300'
                    : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'}`}
              >
                {d.label} {d.elo && <span className="text-gray-500">({d.elo})</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* friend username input — only shown when playing vs friend */}
      {isFriend && (
        <div className="card">
          <label className="text-sm text-gray-400 mb-1 block">Friend's Username</label>
          <input
            type="text"
            value={friendUsername}
            onChange={e => setFriendUsername(e.target.value)}
            placeholder="e.g. chess_knight42"
          />
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button onClick={handleStart} disabled={loading} className="btn-primary w-full">
        {loading ? 'Starting…' : 'Start Game'}
      </button>
    </div>
  );
}
