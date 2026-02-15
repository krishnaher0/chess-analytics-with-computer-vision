import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { TIME_CONTROLS, BOT_DIFFICULTIES } from '../utils/chessHelpers';
import api from '../utils/api';

export default function GameSetupPage() {
  const { token } = useAuth();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { startGame, sendChallenge, outgoingChallenge } = useGame();
  const isFriend = params.get('mode') === 'friend';

  const [timeControl, setTimeControl] = useState(TIME_CONTROLS[2]); // Blitz 3+0 default
  const [botDifficulty, setBotDifficulty] = useState(BOT_DIFFICULTIES[1]);
  const [friendUsername, setFriendUsername] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Debounced user search
  useEffect(() => {
    if (!isFriend || friendUsername.length < 1) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setError('');
      try {
        const res = await api.get(`/profile/search?username=${friendUsername}`);
        setSearchResults(res.data);
      } catch (err) {
        console.error('Search error:', err);
        setError(`Search failed: ${err.message}`);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [friendUsername, isFriend]);

  const handleStartBotGame = async () => {
    setError('');
    setLoading(true);
    try {
      const payload = {
        isVsBot: true,
        botDifficulty: botDifficulty.value,
        timeControl: { totalSeconds: timeControl.totalSeconds, incrementSeconds: timeControl.incrementSeconds },
      };
      const game = await startGame(payload);
      nav(`/game/${game._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChallenge = (user) => {
    sendChallenge(user._id, timeControl);
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

      {/* friend search — only shown when playing vs friend */}
      {isFriend && (
        <div className="card">
          <label className="text-sm text-gray-400 mb-1 block">Find Friend</label>
          <input
            type="text"
            className="w-full bg-gray-800 border-gray-700 text-white rounded-lg px-4 py-2 border focus:border-primary-500 outline-none transition-colors"
            value={friendUsername}
            onChange={e => setFriendUsername(e.target.value)}
            placeholder="Search by username..."
          />

          <div className="mt-4 space-y-2">
            {searching ? (
              <p className="text-xs text-gray-500 animate-pulse">Searching...</p>
            ) : searchResults.length > 0 ? (
              searchResults.map(user => (
                <div key={user._id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
                      {user.username[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-200">{user.username}</span>
                  </div>
                  <button
                    onClick={() => handleChallenge(user)}
                    disabled={outgoingChallenge?.toId === user._id}
                    className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all
                      ${outgoingChallenge?.toId === user._id
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-primary-600 hover:bg-primary-500 text-white shadow-sm'}`}
                  >
                    {outgoingChallenge?.toId === user._id ? 'Challenged' : 'Challenge'}
                  </button>
                </div>
              ))
            ) : friendUsername.length >= 1 ? (
              <p className="text-xs text-gray-500">No users found.</p>
            ) : (
              <p className="text-xs text-gray-500 italic">Type at least 1 character to search.</p>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!isFriend && (
        <button onClick={handleStartBotGame} disabled={loading} className="btn-primary w-full">
          {loading ? 'Starting…' : 'Start Game'}
        </button>
      )}

      {isFriend && outgoingChallenge && (
        <div className="text-center p-3 bg-primary-900/30 border border-primary-800/50 rounded-lg animate-pulse">
          <p className="text-sm text-primary-200">Waiting for friend to accept...</p>
        </div>
      )}
    </div>
  );
}
