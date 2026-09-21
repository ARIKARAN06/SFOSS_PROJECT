import React from 'react';
import { useAuth } from '../context/AuthContext';

export const Header: React.FC<{ roomCode?: string }> = ({ roomCode }) => {
  const { user, logout } = useAuth();
  const displayRoomCode = roomCode || (user as any)?.roomCode;

  return (
    <header className="main-header">
      <div className="brand-title">
        <span>FOSSFURY 26</span>
        <span className="brand-badge">SFOSS</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {displayRoomCode && (
          <div style={{ background: '#34349A', padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem' }}>
            ROOM: <strong>{displayRoomCode}</strong>
          </div>
        )}

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: '#FFF1DC' }}>
              {user.role === 'PARTICIPANT_TEAM' ? `Team: ${user.teamName}` : `Admin: ${user.username}`}
            </span>
            <button className="btn btn-outline" style={{ color: '#FFFFFF', borderColor: '#FFFFFF', padding: '0.3rem 0.7rem', fontSize: '0.8rem' }} onClick={logout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
