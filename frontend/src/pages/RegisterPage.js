import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register }     = useAuth();
  const nav              = useNavigate();
  const [username, setUsername]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await register(username, email, password);
      nav('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="card w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-1">Create Account</h1>
        <p className="text-gray-500 text-center text-sm mb-6">Join the Chess Analytics platform</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="chess_knight42" required minLength={3} />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-1 block">Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-5">
          Already have an account? <Link to="/login" className="text-primary-400 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
