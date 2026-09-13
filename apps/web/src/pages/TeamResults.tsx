import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../services/api';

interface Round1Result {
  published?: boolean;
  qualified?: boolean;
  isDisqualified?: boolean;
  disqualifiedReason?: string;
  roundName?: string;
  [key: string]: any;
}

export const TeamResults: React.FC<{ roundId?: string; onReturnToLobby?: () => void }> = ({ onReturnToLobby }) => {
  const { user } = useAuth();
  const [result, setResult] = useState<Round1Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isRound2Competitor = Boolean(user?.competitorId || user?.competitorCode);

  useEffect(() => {
    async function loadResult() {
      if (isRound2Competitor) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const res = await fetchApi('/participant/round1/result');
      if (res.success) {
        setResult(res);
      } else {
        setError(res.error || 'Failed to load results.');
      }
      setLoading(false);
    }

    loadResult();
  }, [isRound2Competitor]);

  if (loading) {
    return <div style={{ color: '#FFF', textAlign: 'center', padding: '4rem' }}>Loading Official Status...</div>;
  }

  // Round 2 Competitor completion view (No leaderboard, no scores)
  if (isRound2Competitor) {
    return (
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 70px)', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="card card-cream animate-fade-in" style={{ maxWidth: '540px', width: '100%', textAlign: 'center', borderTop: '6px solid #176B5B', padding: '2.5rem 2rem' }}>
          <div style={{ color: '#25256F', fontWeight: 900, fontSize: '1.4rem', letterSpacing: '2px', marginBottom: '0.5rem' }}>
            ROUND 2 COMPLETED
          </div>
          <p style={{ color: '#171717', fontSize: '1.05rem', fontWeight: 600, margin: '1rem 0' }}>
            Your submission has been received.
          </p>
          <p style={{ color: '#64748B', fontSize: '0.95rem', marginBottom: '2rem' }}>
            Please wait for the organizers.
          </p>
          {onReturnToLobby && (
            <button className="btn btn-teal" onClick={onReturnToLobby} style={{ width: '100%' }}>
              Return to Competition Lobby →
            </button>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '3rem auto' }} className="card card-cream">
        <h3 style={{ color: '#F58220' }}>Results Pending</h3>
        <p style={{ marginTop: '0.5rem', color: '#555' }}>
          {error}
        </p>
      </div>
    );
  }

  // Disqualified Team view
  if (result?.isDisqualified) {
    return (
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 70px)', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="card animate-fade-in" style={{ maxWidth: '540px', width: '100%', textAlign: 'center', borderTop: '6px solid #D93838', padding: '2.5rem 2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🚫</div>
          <h2 style={{ color: '#D93838', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            DISQUALIFIED FROM THIS ROUND
          </h2>
          <p style={{ color: '#171717', fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Your team has been disqualified from this round.
          </p>
          {result.disqualifiedReason && (
            <div style={{ color: '#C53030', fontSize: '0.9rem', marginBottom: '1rem' }}>
              <strong>Reason:</strong> {result.disqualifiedReason}
            </div>
          )}
          <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
            Please contact the organizer.
          </p>
        </div>
      </div>
    );
  }

  // Pre-publication view: Results are being finalized
  if (!result?.published) {
    return (
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 70px)', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="card card-cream animate-fade-in" style={{ maxWidth: '540px', width: '100%', textAlign: 'center', borderTop: '6px solid #F58220', padding: '2.5rem 2rem' }}>
          <div style={{ color: '#34349A', fontWeight: 900, fontSize: '1.3rem', letterSpacing: '2px', marginBottom: '0.75rem' }}>
            ROUND 1 COMPLETED
          </div>
          <p style={{ color: '#171717', fontSize: '1.1rem', fontWeight: 600, margin: '1rem 0' }}>
            Results are being finalized by the organizers.
          </p>
          <p style={{ color: '#64748B', fontSize: '0.95rem' }}>
            Please wait.
          </p>
          {onReturnToLobby && (
            <div style={{ marginTop: '2rem' }}>
              <button className="btn btn-outline" onClick={onReturnToLobby} style={{ width: '100%' }}>
                Return to Lobby
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Post-publication: QUALIFIED
  if (result.qualified) {
    return (
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 70px)', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div
          className="card animate-fade-in"
          style={{
            maxWidth: '560px',
            width: '100%',
            textAlign: 'center',
            borderTop: '8px solid #176B5B',
            background: '#FFFFFF',
            padding: '3rem 2rem',
            boxShadow: '0 12px 32px rgba(23, 107, 91, 0.18)',
          }}
        >
          <div style={{ color: '#64748B', fontSize: '0.95rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1rem' }}>
            ROUND 1 RESULT
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', background: '#E6F6F3', border: '2px solid #176B5B', borderRadius: '50px', padding: '0.75rem 2.25rem', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.75rem', color: '#176B5B', fontWeight: 900 }}>✓</span>
            <span style={{ fontSize: '1.75rem', color: '#176B5B', fontWeight: 900, letterSpacing: '1px' }}>QUALIFIED</span>
          </div>

          <h2 style={{ color: '#25256F', fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Congratulations!
          </h2>

          <p style={{ color: '#171717', fontSize: '1.1rem', fontWeight: 600, margin: '0.5rem 0' }}>
            Your team has qualified for Round 2 — DEBUGNOVA.
          </p>

          <p style={{ color: '#64748B', fontSize: '0.95rem', marginTop: '0.75rem', marginBottom: 0 }}>
            Please wait for instructions from the organizers.
          </p>

          {onReturnToLobby && (
            <div style={{ marginTop: '2.5rem' }}>
              <button className="btn btn-teal" onClick={onReturnToLobby} style={{ width: '100%' }}>
                Return to Competition Lobby →
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Post-publication: NOT QUALIFIED
  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 70px)', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div
        className="card animate-fade-in"
        style={{
          maxWidth: '560px',
          width: '100%',
          textAlign: 'center',
          borderTop: '8px solid #64748B',
          background: '#FFFFFF',
          padding: '3rem 2rem',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.08)',
        }}
      >
        <div style={{ color: '#64748B', fontSize: '0.95rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1rem' }}>
          ROUND 1 RESULT
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9', border: '2px solid #CBD5E1', borderRadius: '50px', padding: '0.75rem 2.25rem', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '1.5rem', color: '#475569', fontWeight: 900, letterSpacing: '1px' }}>NOT QUALIFIED</span>
        </div>

        <p style={{ color: '#171717', fontSize: '1.1rem', fontWeight: 600, margin: '0.5rem 0' }}>
          Thank you for participating in Round 1 — SYNTRACE.
        </p>

        <p style={{ color: '#64748B', fontSize: '0.95rem', marginTop: '0.75rem', marginBottom: 0 }}>
          Your team has not qualified for Round 2.
        </p>

        {onReturnToLobby && (
          <div style={{ marginTop: '2.5rem' }}>
            <button className="btn btn-outline" onClick={onReturnToLobby} style={{ width: '100%' }}>
              Return to Competition Lobby →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
