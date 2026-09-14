import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../services/api';

interface RoundInfo {
  id: string;
  roundNumber: number;
  roundName: string;
  durationMinutes: number;
  status: string;
}

interface Round1ResultInfo {
  published?: boolean;
  qualified?: boolean;
  isDisqualified?: boolean;
  disqualifiedReason?: string;
  roundName?: string;
  [key: string]: any;
}

export const TeamLobby: React.FC<{ onStartQuiz: (roundId: string) => void }> = ({ onStartQuiz }) => {
  const { user, logout } = useAuth();
  const [rounds, setRounds] = useState<RoundInfo[]>([]);
  const [round1Result, setRound1Result] = useState<Round1ResultInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimWasReset, setClaimWasReset] = useState(false);

  const isRound2Competitor = Boolean(user?.competitorId || user?.competitorCode);

  const loadRoomInfo = async () => {
    const res = await fetchApi('/rooms/current');
    if (!res.success && (res.code === 'CLAIM_RESET' || res.error?.includes('claim was reset') || res.error?.includes('reset by the organizer'))) {
      setClaimWasReset(true);
      setLoading(false);
      return;
    }

    if (res.success && res.room) {
      const sorted = [...(res.room.rounds || [])].sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0));
      setRounds(sorted);

      // If team participant and round 1 is ended/published, load qualification result
      const r1 = sorted.find((r) => r.roundNumber === 1);
      if (!isRound2Competitor && r1 && (r1.status === 'ROUND_ENDED' || r1.status === 'SCORING_COMPLETE' || r1.status === 'RESULTS_PUBLISHED')) {
        const resultRes = await fetchApi('/participant/round1/result');
        if (resultRes.success) {
          setRound1Result(resultRes);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRoomInfo();
    const interval = setInterval(loadRoomInfo, 3000);
    return () => clearInterval(interval);
  }, []);

  const sortedRounds = [...rounds].sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0));
  const round1 = sortedRounds.find((r) => r.roundNumber === 1);
  const round2 = sortedRounds.find((r) => r.roundNumber === 2);

  const isRound1Finished = round1 && (round1.status === 'ROUND_ENDED' || round1.status === 'SCORING_COMPLETE' || round1.status === 'RESULTS_PUBLISHED');
  const isRound2Finished = round2 && (round2.status === 'ROUND_ENDED' || round2.status === 'SCORING_COMPLETE' || round2.status === 'RESULTS_PUBLISHED');

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: '#FFFFFF' }}>
      {/* User Welcome Card */}
      <div className="card card-cream animate-fade-in" style={{ marginBottom: '2rem', borderLeft: '6px solid #176B5B' }}>
        {isRound2Competitor ? (
          <div>
            <h2 style={{ color: '#25256F', fontSize: '1.5rem', marginBottom: '0.25rem' }}>
              Welcome, {user?.playerName}!
            </h2>
            <p style={{ color: '#555555', fontSize: '0.95rem' }}>
              Round 2 Competitor Slot: <strong>{user?.competitorCode}</strong> | Original Team: <strong>{user?.originalTeamName}</strong>
            </p>
          </div>
        ) : (
          <div>
            <h2 style={{ color: '#25256F', fontSize: '1.5rem', marginBottom: '0.25rem' }}>
              Welcome, {user?.teamName}!
            </h2>
            <p style={{ color: '#555555', fontSize: '0.95rem' }}>
              SFOSS Technical Quiz Platform
            </p>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* ROUND 1 QUALIFICATION RESULT CARD (FOR TEAM PARTICIPANTS) */}
      {/* ======================================================== */}
      {!isRound2Competitor && isRound1Finished && (
        <div style={{ marginBottom: '2rem' }}>
          {round1Result?.isDisqualified ? (
            <div className="card animate-fade-in" style={{ borderTop: '6px solid #D93838', textAlign: 'center', padding: '2rem', background: '#FFFFFF' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🚫</div>
              <h3 style={{ color: '#D93838', fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                DISQUALIFIED FROM THIS ROUND
              </h3>
              <p style={{ color: '#171717', fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Your team has been disqualified from this round.
              </p>
              {round1Result.disqualifiedReason && (
                <div style={{ color: '#C53030', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                  <strong>Reason:</strong> {round1Result.disqualifiedReason}
                </div>
              )}
              <p style={{ color: '#64748B', fontSize: '0.85rem', margin: 0 }}>Please contact the organizer.</p>
            </div>
          ) : !round1Result?.published ? (
            <div className="card card-cream animate-fade-in" style={{ borderLeft: '6px solid #F58220', textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34349A', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                ROUND 1 COMPLETED
              </div>
              <p style={{ color: '#171717', fontSize: '1.1rem', margin: 0, fontWeight: 700 }}>
                Results are being finalized by the organizers.
              </p>
              <p style={{ color: '#64748B', fontSize: '0.95rem', marginTop: '0.5rem', marginBottom: 0 }}>
                Please wait.
              </p>
            </div>
          ) : round1Result.qualified ? (
            <div className="card animate-fade-in" style={{ borderTop: '8px solid #176B5B', background: '#FFFFFF', textAlign: 'center', padding: '2.5rem 2rem', boxShadow: '0 8px 24px rgba(23, 107, 91, 0.15)' }}>
              <div style={{ color: '#64748B', fontSize: '0.9rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                ROUND 1 RESULT
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: '#E6F6F3', border: '2px solid #176B5B', borderRadius: '50px', padding: '0.6rem 2rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '1.5rem', color: '#176B5B', fontWeight: 900 }}>✓</span>
                <span style={{ fontSize: '1.5rem', color: '#176B5B', fontWeight: 900, letterSpacing: '1px' }}>QUALIFIED</span>
              </div>
              <h3 style={{ color: '#25256F', fontSize: '1.35rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                Congratulations!
              </h3>
              <p style={{ color: '#171717', fontSize: '1.05rem', fontWeight: 600, margin: '0.25rem 0' }}>
                Your team has qualified for Round 2 — DEBUGNOVA.
              </p>
              <p style={{ color: '#64748B', fontSize: '0.95rem', marginTop: '0.5rem', marginBottom: 0 }}>
                Please wait for instructions from the organizers.
              </p>
            </div>
          ) : (
            <div className="card animate-fade-in" style={{ borderTop: '8px solid #64748B', background: '#FFFFFF', textAlign: 'center', padding: '2.5rem 2rem', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)' }}>
              <div style={{ color: '#64748B', fontSize: '0.9rem', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                ROUND 1 RESULT
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9', border: '2px solid #CBD5E1', borderRadius: '50px', padding: '0.6rem 2rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '1.4rem', color: '#475569', fontWeight: 900, letterSpacing: '1px' }}>NOT QUALIFIED</span>
              </div>
              <p style={{ color: '#171717', fontSize: '1.05rem', fontWeight: 600, margin: '0.25rem 0' }}>
                Thank you for participating in Round 1 — SYNTRACE.
              </p>
              <p style={{ color: '#64748B', fontSize: '0.95rem', marginTop: '0.5rem', marginBottom: 0 }}>
                Your team has not qualified for Round 2.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* ROUND 2 COMPLETION CARD (FOR INDIVIDUAL COMPETITORS)     */}
      {/* ======================================================== */}
      {isRound2Competitor && isRound2Finished && (
        <div className="card card-cream animate-fade-in" style={{ borderLeft: '6px solid #176B5B', textAlign: 'center', padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#25256F', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            ROUND 2 COMPLETED
          </div>
          <p style={{ color: '#171717', fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>
            Your submission has been received.
          </p>
          <p style={{ color: '#64748B', fontSize: '0.9rem', marginTop: '0.35rem', marginBottom: 0 }}>
            Please wait for the organizers.
          </p>
        </div>
      )}

      {/* Competition Rounds List */}
      <h3 style={{ color: '#FFF1DC', marginBottom: '1rem', fontSize: '1.2rem' }}>Competition Rounds</h3>

      {loading ? (
        <p style={{ color: '#E7E6F5' }}>Loading room state...</p>
      ) : (
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {sortedRounds.map((round) => {
            const isPreStart = round.status === 'PRE_START';
            const isActive = round.status === 'ROUND_ACTIVE';
            const isCompleted = round.status === 'ROUND_ENDED' || round.status === 'SCORING_COMPLETE' || round.status === 'RESULTS_PUBLISHED';

            const isMyRound = isRound2Competitor ? round.roundNumber === 2 : round.roundNumber === 1;

            return (
              <div
                key={round.id}
                className="card animate-fade-in"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: (isActive || isPreStart) && isMyRound ? '#FFFFFF' : '#F8FAFC',
                  border: (isActive || isPreStart) && isMyRound ? '2px solid #F58220' : '1px solid #E2E8F0',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#25256F' }}>
                      ROUND {round.roundNumber}: {round.roundName}
                    </span>
                    <span className={`status-pill ${isPreStart ? 'status-pending' : isActive ? 'status-active' : isCompleted ? 'status-ended' : 'status-pending'}`} style={{ background: isPreStart ? '#FFF1DC' : undefined, color: isPreStart ? '#B75500' : undefined }}>
                      {round.status === 'PRE_START' ? 'PRE-START' : round.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34349A', marginBottom: '0.2rem' }}>
                    {round.roundNumber === 1 ? '👥 Team Round' : '👤 Individual Round'}
                  </div>
                  <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
                    Duration: {round.durationMinutes} minutes | Scheme: +1 for Correct, -1 for Wrong
                  </p>
                </div>

                <div>
                  {isPreStart && isMyRound ? (
                    <button className="btn btn-primary" style={{ background: '#F58220', borderColor: '#F58220' }} onClick={() => onStartQuiz(round.id)}>
                      Get Ready (Pre-Start) →
                    </button>
                  ) : isActive && isMyRound ? (
                    <button className="btn btn-primary" onClick={() => onStartQuiz(round.id)}>
                      Enter Quiz Now →
                    </button>
                  ) : (isActive || isPreStart) && !isMyRound ? (
                    <span style={{ color: '#F58220', fontSize: '0.85rem', fontWeight: 600 }}>
                      {round.roundNumber === 2 ? 'Individual Round' : 'Team Round'}
                    </span>
                  ) : isCompleted ? (
                    <span style={{ color: '#176B5B', fontWeight: 700, fontSize: '0.9rem' }}>
                      Round Finished
                    </span>
                  ) : (
                    <span style={{ color: '#64748B', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      Waiting for Admin to Start...
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px dashed #34349A', fontSize: '0.85rem', color: '#E7E6F5' }}>
        📌 <strong>Important Rules:</strong>
        <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', lineHeight: '1.6' }}>
          <li>Do not switch tabs, minimize window, or open developer tools during the active quiz.</li>
          <li>Your answers are automatically saved to the local server as you click options.</li>
          <li>The quiz will automatically submit when the server timer reaches 0.</li>
        </ul>
      </div>

      {/* REVOKED CLAIM DIALOG */}
      {claimWasReset && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1rem',
        }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '2.5rem 2rem', background: '#FFFFFF', borderTop: '6px solid #D93838', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ color: '#D93838', fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              ROUND 2 CLAIM REVOKED
            </h3>
            <p style={{ color: '#171717', fontSize: '1.05rem', fontWeight: 600, marginBottom: '1.75rem', lineHeight: 1.5 }}>
              Your Round 2 claim was reset by the organizer.
            </p>
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 700 }}
              onClick={() => {
                logout();
              }}
            >
              BACK TO PLAYER SELECTION
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
