import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const QUICK_ACTIONS = [
  { to: '/game/setup', icon: '♟', title: 'Play vs Bot', desc: 'Train against Stockfish at any difficulty.' },
  { to: '/game/setup?mode=friend', icon: '🤝', title: 'Play vs Friend', desc: 'Challenge a club-mate to a rated game.' },
  { to: '/game/camera', icon: '📷', title: 'Scan Live Board', desc: 'Use IPWebcam to detect and record a physical game.' },
  { to: '/tournaments/create', icon: '🏆', title: 'Host Tournament', desc: 'Create a timed tournament for your club.' },
];

export default function HomePage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [activeGames, setActiveGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveGames = async () => {
      try {
        const res = await api.get('/games/ongoing');
        setActiveGames(res.data);
      } catch (err) {
        console.error('Failed to fetch ongoing games:', err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchActiveGames();
  }, [user]);

  return (
    <div className="flex flex-col gap-8">
      {/* hero */}
      <div className="card text-center py-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome, <span className="text-primary-400">{user?.username}</span>
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto">
          Analyse your chess games in real time, track progress, and compete in club tournaments.
        </p>
      </div>

      {/* active games */}
      {activeGames.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Active Games
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeGames.map((game) => (
              <div key={game._id} className="card border-primary-900 bg-primary-900/10 flex items-center justify-between p-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      {game.isVsBot ? 'Bot' : 'Friend'} • {game.timeControl?.label || 'Custom'}
                    </span>
                  </div>
                  <div className="font-semibold text-gray-200">
                    {game.whitePlayerId?.username || 'Bot'} vs {game.blackPlayerId?.username || 'Bot'}
                  </div>
                </div>
                <button
                  onClick={() => nav(`/game/${game._id}`)}
                  className="btn-primary text-sm px-4 py-2"
                >
                  Resume
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* quick actions grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {QUICK_ACTIONS.map(({ to, icon, title, desc }) => (
          <Link
            key={title}
            to={to}
            className="card hover:border-primary-600 border-gray-800 transition-colors flex items-start gap-4 cursor-pointer"
          >
            <span className="text-3xl">{icon}</span>
            <div>
              <h3 className="font-semibold text-base">{title}</h3>
              <p className="text-gray-500 text-sm mt-0.5">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* recent activity stub */}
      <div className="card">
        <h2 className="font-semibold text-lg mb-3">Recent Activity</h2>
        <p className="text-gray-500 text-sm">Your last games and tournament results will appear here.</p>
      </div>
    </div>
  );
}
