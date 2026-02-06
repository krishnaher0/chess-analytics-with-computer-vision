import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TIME_CONTROLS } from '../utils/chessHelpers';
import api from '../utils/api';

export default function TournamentCreatePage() {
  const { token }  = useAuth();
  const nav        = useNavigate();
  const [name, setName]                   = useState('');
  const [description, setDescription]     = useState('');
  const [format, setFormat]               = useState('swiss');
  const [startDatetime, setStartDatetime] = useState('');
  const [registrationEnd, setRegistrationEnd] = useState('');
  const [timeControl, setTimeControl]     = useState(TIME_CONTROLS[4]);
  const [maxPlayers, setMaxPlayers]       = useState(8);
  const [minPlayers, setMinPlayers]       = useState(2);
  const [isRated, setIsRated]             = useState(true);
  const [isPublic, setIsPublic]           = useState(true);
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Tournament name is required.'); return; }
    if (!startDatetime)  { setError('Start date and time are required.'); return; }
    if (new Date(startDatetime) <= new Date()) { setError('Start time must be in the future.'); return; }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        format,
        startDatetime,
        registrationEnd: registrationEnd || startDatetime,
        timeControl: { totalSeconds: timeControl.totalSeconds, incrementSeconds: timeControl.incrementSeconds },
        maxPlayers,
        minPlayers,
        isRated,
        isPublic,
      };

      // Add startDate for enhanced model
      payload.startDate = startDatetime;
      payload.timeControl = {
        initial: timeControl.totalSeconds,
        increment: timeControl.incrementSeconds
      };

      const res = await api.post('/tournaments/create', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      nav(`/tournaments/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <h1 className="text-2xl font-bold">🏆 Create Tournament</h1>

      <form onSubmit={handleCreate} className="flex flex-col gap-4">
        {/* name */}
        <div className="card">
          <label className="text-sm text-gray-400 mb-1 block">Tournament Name</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kathmandu Open 2026" required />
        </div>

        {/* description */}
        <div className="card">
          <label className="text-sm text-gray-400 mb-1 block">Description (Optional)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Tournament description..."
            rows={3}
            maxLength={500}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 w-full
                       focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* format */}
        <div className="card">
          <label className="text-sm text-gray-400 mb-2 block">Tournament Format</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'swiss', label: 'Swiss System', desc: 'Players paired by score' },
              { value: 'round-robin', label: 'Round Robin', desc: 'Everyone plays everyone' },
              { value: 'knockout', label: 'Knockout', desc: 'Single elimination bracket' },
              { value: 'double-elimination', label: 'Double Elim.', desc: 'Two chances per player' }
            ].map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFormat(f.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  format === f.value
                    ? 'border-primary-500 bg-primary-900 text-primary-300'
                    : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                }`}
              >
                <div className="font-medium text-sm">{f.label}</div>
                <div className="text-xs text-gray-500 mt-1">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* dates */}
        <div className="card grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Registration Ends</label>
            <input
              type="datetime-local"
              value={registrationEnd}
              onChange={e => setRegistrationEnd(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 w-full
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Start Date & Time</label>
            <input
              type="datetime-local"
              value={startDatetime}
              onChange={e => setStartDatetime(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 w-full
                         focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
        </div>

        {/* time control */}
        <div className="card">
          <h2 className="font-semibold text-sm text-gray-400 mb-2">Time Control</h2>
          <div className="flex flex-wrap gap-2">
            {TIME_CONTROLS.map(tc => (
              <button
                key={tc.label}
                type="button"
                onClick={() => setTimeControl(tc)}
                className={`rounded-lg border px-3 py-1 text-sm
                  ${timeControl.label === tc.label ? 'border-primary-500 bg-primary-900 text-primary-300' : 'border-gray-700 bg-gray-800 text-gray-300'}`}
              >
                {tc.label}
              </button>
            ))}
          </div>
        </div>

        {/* players */}
        <div className="card grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Min Players</label>
            <input
              type="number"
              value={minPlayers}
              onChange={e => setMinPlayers(Math.max(2, Number(e.target.value)))}
              min={2}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 w-full"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Max Players</label>
            <input
              type="number"
              value={maxPlayers}
              onChange={e => setMaxPlayers(Math.min(256, Math.max(2, Number(e.target.value))))}
              min={2}
              max={256}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 w-full"
            />
          </div>
        </div>

        {/* settings */}
        <div className="card space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRated}
              onChange={e => setIsRated(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-300">Rated (affects player ratings)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={e => setIsPublic(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-300">Public (visible to all players)</span>
          </label>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Creating…' : 'Create Tournament'}
        </button>
      </form>
    </div>
  );
}
