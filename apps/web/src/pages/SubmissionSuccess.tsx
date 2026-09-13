import React from 'react';
import { useAuth } from '../context/AuthContext';

export const SubmissionSuccess: React.FC<{ onReturnToLobby: () => void }> = ({ onReturnToLobby }) => {
  const { user } = useAuth();
  const isRound2 = Boolean(user?.competitorId || user?.competitorCode);

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 70px)', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="card card-cream animate-fade-in" style={{ maxWidth: '520px', width: '100%', textAlign: 'center', borderTop: '6px solid #176B5B' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ color: '#25256F', fontSize: '1.6rem', marginBottom: '0.5rem', fontWeight: 800 }}>
          {isRound2 ? 'ROUND 2 COMPLETED' : 'ROUND 1 COMPLETED'}
        </h2>
        <p style={{ color: '#555', fontSize: '1rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
          {isRound2 ? (
            <>
              Your submission has been received.
              <br />
              Please wait for the organizers.
            </>
          ) : (
            <>
              Your submission has been received.
              <br />
              Results are being finalized by the organizers. Please wait.
            </>
          )}
        </p>

        <button className="btn btn-teal" onClick={onReturnToLobby} style={{ width: '100%', padding: '0.8rem', fontSize: '1rem' }}>
          Return to Competition Lobby →
        </button>
      </div>
    </div>
  );
};

