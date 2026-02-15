import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function ProfilePage() {
  const { user, token } = useAuth();
  const [feedback, setFeedback]       = useState(null);
  const [stats, setStats]             = useState(null);
  const [recentGames, setRecentGames] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const [fbRes, stRes, gRes] = await Promise.all([
          api.get(`/profile/feedback/${user.id}`,  { headers: { Authorization: `Bearer ${token}` } }),
          api.get(`/profile/stats/${user.id}`,     { headers: { Authorization: `Bearer ${token}` } }),
          api.get(`/profile/games/${user.id}`,     { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        setFeedback(fbRes.data);
        setStats(stRes.data);
        setRecentGames(gRes.data);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    };
    load();
  }, [user, token]);

  if (loading) return <div className="text-center text-gray-500 mt-20">Loading profile…</div>;
  if (error)   return <div className="text-center text-red-400 mt-20">{error}</div>;

  /* ── radar chart data ──── */
  const radarData = {
    labels: ['Opening', 'Middlegame', 'Endgame'],
    datasets: [{
      label: 'Accuracy %',
      data: [
        feedback?.averageStats?.opening?.accuracy    || 0,
        feedback?.averageStats?.middlegame?.accuracy  || 0,
        feedback?.averageStats?.endgame?.accuracy     || 0,
      ],
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      borderColor:     'rgba(34, 197, 94, 0.8)',
      pointBackgroundColor: 'rgba(34, 197, 94, 1)',
    }],
  };
  const radarOptions = {
    scales: {
      r: {
        min: 0, max: 100,
        ticks: { color: '#9ca3af', stepSize: 25 },
        grid: { color: '#374151' },
        pointLabels: { color: '#d1d5db', font: { size: 12 } },
      },
    },
    plugins: { legend: { labels: { color: '#9ca3af' } } },
  };

  /* ── stat badge helper ──── */
  const StatBadge = ({ label, value, color = 'text-primary-400' }) => (
    <div className="card text-center">
      <p className="text-2xl font-bold {color}">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* header */}
      <div className="card flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary-800 flex items-center justify-center text-2xl font-bold text-primary-300">
          {user?.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <h1 className="text-xl font-bold">{user?.username}</h1>
          <p className="text-gray-500 text-sm">{user?.email}</p>
        </div>
      </div>

      {/* stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBadge label="Games Played" value={stats?.gamesPlayed || 0} />
        <StatBadge label="Wins"         value={stats?.gamesWon    || 0} />
        <StatBadge label="Draws"        value={stats?.gamesDrawn  || 0} />
        <StatBadge label="Win Rate"     value={stats?.gamesPlayed ? `${Math.round((stats.gamesWon / stats.gamesPlayed) * 100)}%` : '—'} />
      </div>

      {/* feedback section: radar + recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* radar chart */}
        <div className="card flex flex-col items-center">
          <h2 className="font-semibold text-gray-300 mb-3">Phase Accuracy</h2>
          <div className="w-full" style={{ height: 260 }}>
            <Radar data={radarData} options={{
              scales: {
                r: {
                  beginAtZero: true,
                  max: 100,
                  ticks: { color: '#9ca3af' },
                  grid: { color: '#374151' },
                  pointLabels: { color: '#d1d5db' }
                }
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: '#1f2937',
                  borderColor: '#374151',
                  borderWidth: 1
                }
              }
            }} />
          </div>
        </div>

        {/* recommendations */}
        <div className="card flex flex-col">
          <h2 className="font-semibold text-gray-300 mb-3">Personalized Feedback</h2>
          {feedback?.recommendations?.length > 0 ? (
            <ul className="flex flex-col gap-3 flex-1">
              {feedback.recommendations.map((r, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <span className="text-primary-500 mt-0.5">●</span>
                  <p className="text-sm text-gray-300">{r}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">Play some games to get personalised feedback.</p>
          )}
          <p className="text-xs text-gray-600 mt-auto pt-3">Based on your last {feedback?.gamesAnalyzed || 0} games</p>
        </div>
      </div>

      {/* phase accuracy breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {['opening', 'middlegame', 'endgame'].map(phase => {
          const d = feedback?.averageStats?.[phase];
          return (
            <div key={phase} className="card text-center">
              <h3 className="text-xs text-gray-500 uppercase font-semibold mb-1">{phase}</h3>
              <p className="text-2xl font-bold text-primary-400">{d?.accuracy?.toFixed(0) || '—'}%</p>
              <div className="text-xs text-gray-600 mt-1">
                <span className="text-yellow-500">Inac: {d?.inaccuracies || 0}</span> ·{' '}
                <span className="text-orange-500">Mis: {d?.mistakes || 0}</span> ·{' '}
                <span className="text-red-500">Blu: {d?.blunders || 0}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* recent games list */}
      <div className="card">
        <h2 className="font-semibold text-gray-300 mb-3">Recent Games</h2>
        {recentGames.length === 0 ? (
          <p className="text-gray-500 text-sm">No games yet. Start playing!</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recentGames.map((g) => {
              const isWhite = g.whitePlayerId?._id === user?.id || g.whitePlayerId === user?.id;
              const opponent = isWhite ? (g.blackPlayerId?.username || 'Bot') : (g.whitePlayerId?.username || 'Bot');
              const resultLabel = g.result === 'draw' ? 'Draw'
                : (g.result === 'white' && isWhite) || (g.result === 'black' && !isWhite) ? 'Won' : 'Lost';
              const resultColor = resultLabel === 'Won' ? 'text-green-400' : resultLabel === 'Draw' ? 'text-yellow-400' : 'text-red-400';

              return (
                <Link key={g._id} to={`/game/analysis/${g._id}`} className="flex items-center justify-between bg-gray-800 hover:bg-gray-750 rounded-lg px-4 py-2.5 transition-colors">
                  <div>
                    <span className="text-sm font-medium">vs {opponent}</span>
                    <span className="text-gray-600 text-xs ml-2">{new Date(g.startedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{g.moves?.length || 0} moves</span>
                    <span className={`text-sm font-bold ${resultColor}`}>{resultLabel}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
