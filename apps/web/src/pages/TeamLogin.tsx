import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../services/api';

interface TeamSlot {
  id: string;
  teamNumber: number;
  teamName: string;
  isClaimed: boolean;
  isDisqualified: boolean;
}

interface Round2CompetitorSlot {
  id: string;
  competitorCode: string;
  playerName: string;
  playerPosition: 'A' | 'B';
  originalTeamNumber: number;
  originalTeamName: string;
  isClaimed: boolean;
  isDisqualified: boolean;
  status: string;
}

function formatTeamName(teamNumber: number, teamName?: string): string {
  const fallback = `Team ${String(teamNumber).padStart(2, '0')}`;
  if (!teamName || !teamName.trim()) {
    return fallback;
  }
  const trimmed = teamName.trim();
  const dupRegex = new RegExp(`^Team\\s*0*${teamNumber}\\s+Team\\s*0*${teamNumber}$`, 'i');
  if (dupRegex.test(trimmed)) {
    return fallback;
  }
  return trimmed;
}

export const TeamLogin: React.FC<{ onSwitchToAdmin: () => void }> = ({ onSwitchToAdmin }) => {
  const { login } = useAuth();
  const [step, setStep] = useState<'room' | 'select_slot'>('room');
  const [roomCode, setRoomCode] = useState('');
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [teamSlots, setTeamSlots] = useState<TeamSlot[]>([]);
  const [round2Competitors, setRound2Competitors] = useState<Round2CompetitorSlot[]>([]);
  const [activeRoundTab, setActiveRoundTab] = useState<'round1' | 'round2'>('round1');

  // Round 1 Selection
  const [selectedTeam, setSelectedTeam] = useState<TeamSlot | null>(null);
  const [teamNameInput, setTeamNameInput] = useState('');
  const [player1NameInput, setPlayer1NameInput] = useState('');
  const [player2NameInput, setPlayer2NameInput] = useState('');

  // Round 2 Selection
  const [selectedCompetitor, setSelectedCompetitor] = useState<Round2CompetitorSlot | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const teamNameInputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus Team Name when modal opens
  React.useEffect(() => {
    if (selectedTeam && teamNameInputRef.current) {
      setTimeout(() => {
        teamNameInputRef.current?.focus();
      }, 50);
    }
  }, [selectedTeam]);

  // Close modals on ESC if not loading
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        setSelectedTeam(null);
        setSelectedCompetitor(null);
        setError(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading]);

  const handleValidateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetchApi(`/participant/room/${roomCode}`);
    setLoading(false);

    if (res.success && res.room) {
      setRoomInfo(res.room);
      setTeamSlots(res.teams || []);
      const r2Comps = res.round2Competitors || [];
      setRound2Competitors(r2Comps);

      // If room is in Round 2 active mode, default tab to Round 2
      const round2 = res.room.rounds?.find((r: any) => r.roundNumber === 2);
      if (round2 && round2.status === 'ROUND_ACTIVE' && r2Comps.length > 0) {
        setActiveRoundTab('round2');
      } else {
        setActiveRoundTab('round1');
      }

      setStep('select_slot');
    } else {
      setError(res.error || 'Invalid room code.');
    }
  };

  const handleClaimTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;

    const tName = teamNameInput.trim();
    const p1 = player1NameInput.trim();
    const p2 = player2NameInput.trim();

    if (!tName) {
      setError('Team Name is required.');
      return;
    }
    if (!p1) {
      setError('Player 1 Name is required.');
      return;
    }
    if (!p2) {
      setError('Player 2 Name is required.');
      return;
    }
    if (p1.toLowerCase() === p2.toLowerCase()) {
      setError('Player 1 and Player 2 names cannot be identical.');
      return;
    }

    setError(null);
    setLoading(true);

    const res = await fetchApi('/participant/claim-team', {
      method: 'POST',
      body: JSON.stringify({
        roomCode,
        teamId: selectedTeam.id,
        teamName: tName,
        player1Name: p1,
        player2Name: p2,
      }),
    });

    setLoading(false);

    if (res.success && res.token && res.sessionToken) {
      setSelectedTeam(null);
      login(
        res.token,
        {
          userId: res.team.id,
          username: res.team.teamName,
          role: 'PARTICIPANT_TEAM',
          teamId: res.team.id,
          teamName: res.team.teamName,
          sessionToken: res.sessionToken,
        },
        res.sessionToken
      );
    } else {
      setError(res.error || 'Failed to claim team.');
      // Concurrency protection: Refresh slot state so user sees updated claimed status
      const refreshRes = await fetchApi(`/participant/room/${roomCode}`);
      if (refreshRes.success && refreshRes.teams) {
        setTeamSlots(refreshRes.teams);
      }
    }
  };

  const handleClaimCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompetitor || loading) return;

    setError(null);
    setLoading(true);

    const res = await fetchApi('/participant/claim-competitor', {
      method: 'POST',
      body: JSON.stringify({
        roomCode,
        competitorId: selectedCompetitor.id,
      }),
    });

    setLoading(false);

    if (res.success && res.token && res.sessionToken) {
      setSelectedCompetitor(null);
      login(
        res.token,
        {
          userId: res.competitor.id,
          username: `${res.competitor.playerName} (${res.competitor.competitorCode})`,
          role: 'PARTICIPANT_TEAM',
          competitorId: res.competitor.id,
          competitorCode: res.competitor.competitorCode,
          playerName: res.competitor.playerName,
          originalTeamName: res.competitor.originalTeamName,
          originalTeamNumber: res.competitor.originalTeamNumber,
          sessionToken: res.sessionToken,
        },
        res.sessionToken
      );
    } else {
      setError(res.error || 'Failed to claim competitor slot.');
      const refreshRes = await fetchApi(`/participant/room/${roomCode}`);
      if (refreshRes.success && refreshRes.round2Competitors) {
        setRound2Competitors(refreshRes.round2Competitors);
      }
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 70px)', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      {step === 'room' ? (
        <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '440px', background: '#FFFFFF', borderRadius: '12px', borderTop: '6px solid #F58220' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h1 style={{ color: '#25256F', fontSize: '1.75rem', fontWeight: 800 }}>FOSSFURY 26</h1>
            <p style={{ color: '#555', fontSize: '0.9rem', marginTop: '0.2rem' }}>SFOSS TECHNICAL QUIZ PLATFORM</p>
          </div>

          {error && (
            <div style={{ background: '#FDF2F2', border: '1px solid #D93838', color: '#D93838', padding: '0.75rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleValidateRoom}>
            <div className="form-group">
              <label className="form-label">ROOM CODE</label>
              <input
                type="text"
                className="form-control"
                style={{ fontSize: '1.2rem', textAlign: 'center', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="e.g. FURY26"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', padding: '0.8rem', fontSize: '1.05rem' }} disabled={loading}>
              {loading ? 'Validating Room...' : 'JOIN ROOM →'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #EEE' }}>
            <button
              onClick={onSwitchToAdmin}
              style={{ background: 'none', border: 'none', color: '#34349A', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Admin / Organizer Portal Login →
            </button>
          </div>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: '960px' }}>
          <div className="card animate-fade-in" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ color: '#25256F', fontSize: '1.4rem', fontWeight: 800 }}>
                  ROOM: {roomInfo?.roomCode}
                </h2>
                <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
                  {activeRoundTab === 'round1'
                    ? 'Round 1: Two participants work together on one device'
                    : 'Round 2: Individual qualified competitor entry (separate device)'}
                </p>
              </div>
              <button className="btn btn-outline" onClick={() => setStep('room')}>
                ← Change Room
              </button>
            </div>

            {/* Round 1 vs Round 2 Tabs if Round 2 has competitors */}
            {round2Competitors.length > 0 && (
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
                <button
                  type="button"
                  className={`btn ${activeRoundTab === 'round1' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ color: activeRoundTab === 'round1' ? '#FFF' : '#25256F' }}
                  onClick={() => {
                    setActiveRoundTab('round1');
                    setSelectedCompetitor(null);
                  }}
                >
                  Round 1: Team Entry
                </button>
                <button
                  type="button"
                  className={`btn ${activeRoundTab === 'round2' ? 'btn-primary' : 'btn-outline'}`}
                  style={{ color: activeRoundTab === 'round2' ? '#FFF' : '#25256F', borderColor: '#F58220' }}
                  onClick={() => {
                    setActiveRoundTab('round2');
                    setSelectedTeam(null);
                  }}
                >
                  Round 2: Individual Player Entry ({round2Competitors.length})
                </button>
              </div>
            )}
          </div>

          {error && (
            <div style={{ background: '#FDF2F2', border: '1px solid #D93838', color: '#D93838', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              {error}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: ROUND 1 TEAM SLOTS SELECTION */}
          {/* ======================================================== */}
          {activeRoundTab === 'round1' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {teamSlots.map((slot) => {
                  const isAvailable = !slot.isClaimed && !slot.isDisqualified;
                  const paddedNum = String(slot.teamNumber).padStart(2, '0');

                  return (
                    <div
                      key={slot.id}
                      className="card"
                      style={{
                        padding: '1rem',
                        textAlign: 'center',
                        border: selectedTeam?.id === slot.id ? '2px solid #F58220' : '1px solid #CBD5E1',
                        background: isAvailable ? '#FFFFFF' : '#F1F5F9',
                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                        opacity: isAvailable ? 1 : 0.6,
                        transition: 'all 0.2s',
                      }}
                      onClick={() => {
                        if (isAvailable) {
                          setSelectedTeam(slot);
                          setTeamNameInput(slot.teamName && !slot.teamName.startsWith('Team ') ? slot.teamName : `Team ${paddedNum}`);
                        }
                      }}
                    >
                      <h3 style={{ fontSize: '1.1rem', color: '#25256F', fontWeight: 800 }}>
                        Team {paddedNum}
                      </h3>
                      <div style={{ marginTop: '0.5rem' }}>
                        {isAvailable ? (
                          <span className="status-pill status-active" style={{ fontSize: '0.75rem' }}>
                            AVAILABLE
                          </span>
                        ) : (
                          <span className="status-pill status-ended" style={{ fontSize: '0.75rem' }}>
                            REGISTERED
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: ROUND 2 INDIVIDUAL COMPETITOR SELECTION */}
          {/* ======================================================== */}
          {activeRoundTab === 'round2' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ color: '#25256F', fontSize: '1.4rem', fontWeight: 800 }}>
                  Select Round 2 Competitor
                </h2>
                <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
                  Each qualified competitor competes individually on a separate device.
                </p>
              </div>

              {round2Competitors.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748B', fontStyle: 'italic', background: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1' }}>
                  No qualified competitors have been provisioned by the organizers for Round 2 yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                  {round2Competitors.map((comp) => {
                    const isAvailable = !comp.isClaimed && !comp.isDisqualified;

                    return (
                      <div
                        key={comp.id}
                        className="card"
                        style={{
                          padding: '1.25rem 1rem',
                          textAlign: 'center',
                          border: selectedCompetitor?.id === comp.id ? '2px solid #F58220' : '1px solid #CBD5E1',
                          background: isAvailable ? '#FFFFFF' : '#F1F5F9',
                          cursor: isAvailable ? 'pointer' : 'not-allowed',
                          opacity: isAvailable ? 1 : 0.6,
                          transition: 'all 0.2s',
                          boxShadow: selectedCompetitor?.id === comp.id ? '0 4px 12px rgba(245, 130, 32, 0.2)' : 'none',
                        }}
                        onClick={() => {
                          if (isAvailable) {
                            setSelectedCompetitor(comp);
                            setError(null);
                          }
                        }}
                      >
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#34349A', fontFamily: 'monospace' }}>
                          {comp.competitorCode} — {comp.playerName}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600, marginTop: '0.25rem', marginBottom: '0.6rem' }}>
                          {formatTeamName(comp.originalTeamNumber, comp.originalTeamName)}
                        </div>

                        <div>
                          {isAvailable ? (
                            <span className="status-pill status-active" style={{ fontSize: '0.75rem' }}>
                              AVAILABLE
                            </span>
                          ) : (
                            <span className="status-pill status-ended" style={{ fontSize: '0.75rem' }}>
                              {comp.isDisqualified ? 'DISQUALIFIED' : 'CLAIMED'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* MODAL 1: TEAM SELECTION REGISTRATION POPUP */}
          {/* ======================================================== */}
          {selectedTeam && (
            <div
              className="modal-overlay animate-fade-in"
              onClick={(e) => {
                if (e.target === e.currentTarget && !loading) {
                  setSelectedTeam(null);
                  setPlayer1NameInput('');
                  setPlayer2NameInput('');
                  setError(null);
                }
              }}
            >
              <div className="modal-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div>
                    <h3 style={{ color: '#25256F', fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                      Register Team {String(selectedTeam.teamNumber).padStart(2, '0')}
                    </h3>
                    <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '0.35rem', marginBottom: 0 }}>
                      Both participants will work together on this device.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      if (!loading) {
                        setSelectedTeam(null);
                        setPlayer1NameInput('');
                        setPlayer2NameInput('');
                        setError(null);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '1.5rem',
                      color: '#94A3B8',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      padding: '0.2rem 0.5rem',
                      lineHeight: 1,
                    }}
                    aria-label="Close modal"
                  >
                    ×
                  </button>
                </div>

                {error && (
                  <div style={{ background: '#FDF2F2', border: '1px solid #D93838', color: '#D93838', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleClaimTeam}>
                  <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Team Name <span style={{ color: '#D93838' }}>*</span>
                    </label>
                    <input
                      ref={teamNameInputRef}
                      type="text"
                      className="form-control"
                      value={teamNameInput}
                      onChange={(e) => setTeamNameInput(e.target.value)}
                      placeholder="e.g. Code Warriors"
                      autoFocus
                      required
                      disabled={loading}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700 }}>
                        Player 1 Name <span style={{ color: '#D93838' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={player1NameInput}
                        onChange={(e) => setPlayer1NameInput(e.target.value)}
                        placeholder="e.g. Arjun"
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" style={{ fontWeight: 700 }}>
                        Player 2 Name <span style={{ color: '#D93838' }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={player2NameInput}
                        onChange={(e) => setPlayer2NameInput(e.target.value)}
                        placeholder="e.g. Karthik"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ flex: 1 }}
                      disabled={loading}
                      onClick={() => {
                        setSelectedTeam(null);
                        setPlayer1NameInput('');
                        setPlayer2NameInput('');
                        setError(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span style={{ width: '14px', height: '14px', border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                          JOINING...
                        </>
                      ) : (
                        'JOIN TEAM →'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* MODAL 2: ROUND 2 INDIVIDUAL COMPETITOR CONFIRMATION */}
          {/* ======================================================== */}
          {selectedCompetitor && (
            <div
              className="modal-overlay animate-fade-in"
              onClick={(e) => {
                if (e.target === e.currentTarget && !loading) {
                  setSelectedCompetitor(null);
                  setError(null);
                }
              }}
            >
              <div className="modal-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div>
                    <h3 style={{ color: '#25256F', fontSize: '1.35rem', fontWeight: 800, margin: 0 }}>
                      Join as {selectedCompetitor.competitorCode} — {selectedCompetitor.playerName}
                    </h3>
                    <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '0.35rem', marginBottom: 0 }}>
                      Original Team: {formatTeamName(selectedCompetitor.originalTeamNumber, selectedCompetitor.originalTeamName)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      if (!loading) {
                        setSelectedCompetitor(null);
                        setError(null);
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '1.5rem',
                      color: '#94A3B8',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      padding: '0.2rem 0.5rem',
                      lineHeight: 1,
                    }}
                    aria-label="Close modal"
                  >
                    ×
                  </button>
                </div>

                <div style={{ background: '#F8FAFC', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
                  <p style={{ color: '#475569', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                    You will compete individually on this device for Round 2 (DEBUGNOVA). Once joined, your competition session will be activated.
                  </p>
                </div>

                {error && (
                  <div style={{ background: '#FDF2F2', border: '1px solid #D93838', color: '#D93838', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                    {error}
                  </div>
                )}

                <form onSubmit={handleClaimCompetitor}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ flex: 1 }}
                      disabled={loading}
                      onClick={() => {
                        setSelectedCompetitor(null);
                        setError(null);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span style={{ width: '14px', height: '14px', border: '2px solid #FFFFFF', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                          JOINING...
                        </>
                      ) : (
                        'JOIN ROUND 2 →'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
