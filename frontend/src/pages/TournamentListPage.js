import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function TournamentListPage() {
  const { token }  = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/tournaments', { headers: { Authorization: `Bearer ${token}` } });
        setTournaments(res.data);
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    };
    fetch();
  }, [token]);

  const statusColor = (s) => {
    if (s === 'upcoming')  return 'text-blue-400';
    if (s === 'active')    return 'text-green-400';
    return 'text-gray-500';
  };

  if (loading) return <div className="text-center text-gray-500 mt-20">Loading tournaments…</div>;

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tournaments</h1>
        <Link to="/tournaments/create" className="btn-primary text-sm">+ Create</Link>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {tournaments.length === 0 && !error && (
        <div className="card text-center text-gray-500 py-10">No tournaments yet. Create one!</div>
      )}

      <div className="flex flex-col gap-3">
        {tournaments.map((t) => (
          <div key={t._id} className="card flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold">{t.name}</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Starts: {new Date(t.startDatetime).toLocaleString()} &nbsp;·&nbsp;
                Players: {t.entrants?.length || 0}/{t.maxPlayers} &nbsp;·&nbsp;
                Time: {Math.floor(t.timeControl?.totalSeconds / 60)}+{t.timeControl?.incrementSeconds || 0}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className={`text-xs font-semibold uppercase ${statusColor(t.status)}`}>{t.status}</span>
              <Link to={`/tournaments/${t._id}`} className="btn-secondary text-xs px-3 py-1">Details</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
