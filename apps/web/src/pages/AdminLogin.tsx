import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../services/api';

export const AdminLogin: React.FC<{ onSwitchToTeam: () => void }> = ({ onSwitchToTeam }) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetchApi('/auth/login/admin', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    setLoading(false);

    if (res.success && res.token && res.user) {
      login(res.token, {
        userId: res.user.id,
        username: res.user.username,
        role: res.user.role,
      });
    } else {
      setError(res.error || 'Invalid admin credentials.');
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 70px)', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card card-dark animate-fade-in" style={{ width: '100%', maxWidth: '420px', borderRadius: '12px', borderTop: '6px solid #34349A' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ color: '#FFF1DC', fontSize: '1.75rem', fontWeight: 800 }}>ADMIN PORTAL</h1>
          <p style={{ color: '#A0A0C0', fontSize: '0.85rem', marginTop: '0.2rem' }}>FOSSFURY 26 Event Control Center</p>
        </div>

        {error && (
          <div style={{ background: '#FDF2F2', border: '1px solid #D93838', color: '#D93838', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" style={{ color: '#FFF1DC' }}>Admin Username</label>
            <input
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. admin or organizer"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: '#FFF1DC' }}>Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              required
            />
          </div>

          <button type="submit" className="btn btn-indigo" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Access Admin Dashboard →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #2B2B48' }}>
          <button
            onClick={onSwitchToTeam}
            style={{ background: 'none', border: 'none', color: '#F58220', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
          >
            ← Return to Participant Team Login
          </button>
        </div>
      </div>
    </div>
  );
};
