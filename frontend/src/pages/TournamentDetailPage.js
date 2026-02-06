import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { TournamentBracket, TournamentStandings } from '../components/Tournament';

export default function TournamentDetailPage() {
  const { tournamentId } = useParams();
  const { token, user }  = useAuth();
  const [tournament, setTournament] = useState(null);
  const [standings, setStandings] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [joined, setJoined]         = useState(false);
  const [activeTab, setActiveTab]   = useState('overview');

  useEffect(() => {
    const load = async () => {
      try {
        const [tRes, lRes, sRes] = await Promise.all([
          api.get(`/tournaments/${tournamentId}`,            { headers: { Authorization: `Bearer ${token}` } }),
          api.get(`/tournaments/${tournamentId}/leaderboard`,{ headers: { Authorization: `Bearer ${token}` } }),
          api.get(`/tournaments/${tournamentId}/standings`,  { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        ]);
        setTournament(tRes.data);
        setLeaderboard(lRes.data);
        setStandings(sRes.data || []);
        setJoined(tRes.data.entrants?.some(e => (e._id || e) === user?.id));
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    };
    load();
  }, [tournamentId, token, user]);

  const handleJoin = async () => {
    try {
      const res = await api.post(`/tournaments/join/${tournamentId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setTournament(res.data);
      setJoined(true);
    } catch (e) { setError(e.message); }
  };

  const handleStart = async () => {
    try {
      const res = await api.post(`/tournaments/${tournamentId}/start`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setTournament(res.data);
    } catch (e) { setError(e.response?.data?.message || e.message); }
  };

  const handleNextRound = async () => {
    try {
      const res = await api.post(`/tournaments/${tournamentId}/next-round`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setTournament(res.data);
    } catch (e) { setError(e.response?.data?.message || e.message); }
  };

  if (loading) return <div className="text-center text-gray-500 mt-20">Loading…</div>;
  if (error)   return <div className="text-center text-red-400 mt-20">{error}</div>;
  if (!tournament) return <div className="text-center text-gray-500 mt-20">Tournament not found.</div>;

  const statusColor = (s) => {
    switch(s) {
      case 'registration': return 'bg-blue-900 text-blue-300';
      case 'upcoming': return 'bg-blue-900 text-blue-300';
      case 'ongoing': return 'bg-green-900 text-green-300';
      case 'completed': return 'bg-gray-700 text-gray-300';
      case 'cancelled': return 'bg-red-900 text-red-300';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  const isCreator = tournament.creatorId?._id === user?.id || tournament.creatorId === user?.id;

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6">
      {/* header */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white">{tournament.name}</h1>
            {tournament.description && (
              <p className="text-gray-400 mt-2">{tournament.description}</p>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(tournament.status)}`}>
            {tournament.status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Format</p>
            <p className="text-white font-medium capitalize">{tournament.format}</p>
          </div>
          <div>
            <p className="text-gray-500">Time Control</p>
            <p className="text-white font-medium">
              {Math.floor((tournament.timeControl?.initial || tournament.timeControl?.totalSeconds) / 60)}+
              {tournament.timeControl?.increment || tournament.timeControl?.incrementSeconds || 0}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Participants</p>
            <p className="text-white font-medium">
              {tournament.participants?.length || tournament.entrants?.length || 0}/{tournament.maxPlayers}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Current Round</p>
            <p className="text-white font-medium">
              {tournament.currentRound || 0}/{tournament.numberOfRounds || '?'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          {(tournament.status === 'registration' || tournament.status === 'upcoming') && !joined && (
            <button onClick={handleJoin} className="btn-primary">
              Join Tournament
            </button>
          )}
          {joined && tournament.status === 'registration' && (
            <span className="text-green-400 text-sm flex items-center gap-2">
              ✓ Registered
            </span>
          )}
          {isCreator && (tournament.status === 'registration' || tournament.status === 'upcoming') && (
            <button onClick={handleStart} className="btn-secondary">
              Start Tournament
            </button>
          )}
          {isCreator && tournament.status === 'ongoing' && tournament.currentRound > 0 && (
            <button onClick={handleNextRound} className="btn-secondary">
              Start Next Round
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <div className="flex gap-6">
          {['overview', 'bracket', 'standings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 font-medium transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Participants */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Participants</h2>
            <div className="flex flex-wrap gap-2">
              {(tournament.participants || tournament.entrants || []).map((participant, i) => (
                <span key={i} className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
                  {participant.username || participant}
                </span>
              ))}
            </div>
          </div>

          {/* Tournament Info */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Tournament Details</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Registration Ends</span>
                <span className="text-white">
                  {tournament.registrationEnd ? new Date(tournament.registrationEnd).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Start Date</span>
                <span className="text-white">
                  {tournament.startDate ? new Date(tournament.startDate).toLocaleString() :
                   tournament.startDatetime ? new Date(tournament.startDatetime).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Rated</span>
                <span className="text-white">{tournament.isRated ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Public</span>
                <span className="text-white">{tournament.isPublic !== false ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'bracket' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Tournament Bracket</h2>
          <TournamentBracket tournament={tournament} />
        </div>
      )}

      {activeTab === 'standings' && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Standings</h2>
          {standings.length > 0 ? (
            <TournamentStandings standings={standings} />
          ) : leaderboard.length > 0 ? (
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">#</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-semibold">Player</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-semibold">Score</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-semibold">W</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-semibold">D</th>
                    <th className="text-center py-3 px-4 text-gray-400 font-semibold">L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {leaderboard.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-750 transition-colors">
                      <td className="py-3 px-4 text-gray-400">{row.rank || i + 1}</td>
                      <td className="py-3 px-4 text-white font-medium">{row.username}</td>
                      <td className="py-3 px-4 text-center font-bold text-primary-400">{row.score}</td>
                      <td className="py-3 px-4 text-center text-green-400">{row.wins}</td>
                      <td className="py-3 px-4 text-center text-yellow-400">{row.draws}</td>
                      <td className="py-3 px-4 text-center text-red-400">{row.losses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              No standings available yet. Tournament hasn't started.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
