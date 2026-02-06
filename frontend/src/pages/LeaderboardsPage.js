import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function LeaderboardsPage() {
  const { token }  = useAuth();
  const [boards, setBoards]     = useState([]);
  const [filter, setFilter]     = useState('');       // filter by tournament name
  const [sortBy, setSortBy]     = useState('date');   // 'date' | 'name'
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/tournaments/leaderboards', { headers: { Authorization: `Bearer ${token}` } });
        setBoards(res.data);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    };
    load();
  }, [token]);

  /* ── derived / filtered list ──── */
  const filtered = boards
    .filter(b => b.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => sortBy === 'date'
      ? new Date(b.startDatetime) - new Date(a.startDatetime)
      : a.name.localeCompare(b.name));

  if (loading) return <div className="text-center text-gray-500 mt-20">Loading leaderboards…</div>;

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Leaderboards</h1>

      {/* filter + sort toolbar */}
      <div className="card flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search by tournament name…"
          className="flex-1 min-w-0"
        />
        <div className="flex gap-1">
          <button onClick={() => setSortBy('date')} className={`btn-secondary text-xs px-3 py-1 ${sortBy === 'date' ? 'bg-primary-800' : ''}`}>Date</button>
          <button onClick={() => setSortBy('name')} className={`btn-secondary text-xs px-3 py-1 ${sortBy === 'name' ? 'bg-primary-800' : ''}`}>Name</button>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {filtered.length === 0 && (
        <div className="card text-center text-gray-500 py-10">No leaderboards match your search.</div>
      )}

      {/* leaderboard cards */}
      <div className="flex flex-col gap-4">
        {filtered.map((board) => (
          <div key={board.tournamentId} className="card">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-lg">{board.name}</h2>
                <p className="text-xs text-gray-500">
                  {new Date(board.startDatetime).toLocaleDateString()} &nbsp;·&nbsp; Title Tournament
                </p>
              </div>
              <Link to={`/tournaments/${board.tournamentId}`} className="btn-secondary text-xs px-3 py-1">View</Link>
            </div>

            {/* top 3 players */}
            {board.topPlayers && board.topPlayers.length > 0 ? (
              <div className="mt-3 flex gap-3">
                {board.topPlayers.map((p, i) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div key={i} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5">
                      <span>{medals[i]}</span>
                      <span className="text-sm font-medium">{p.username}</span>
                      <span className="text-xs text-primary-400 font-bold">{p.score} pts</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-600 text-sm mt-2">No results yet.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
