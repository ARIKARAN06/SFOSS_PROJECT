import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../services/api';
import { Timer } from '../components/Timer';
import { AntiCheatGuard } from '../components/AntiCheatGuard';
import { useLocalCountdown } from '../hooks/useLocalCountdown';

interface Question {
  id: string;
  questionNumber: number;
  questionText: string;
  codeSnippet?: string;
  options: Array<{
    id: string;
    optionLetter: string;
    optionText: string;
  }>;
}

export const QuizView: React.FC<{
  roundId: string;
  onSubmitted: () => void;
}> = ({ roundId, onSubmitted }) => {
  const { user, logout } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedAnswers, setSavedAnswers] = useState<Record<string, string>>({});
  const [endTime, setEndTime] = useState<string | null>(null);
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimWasReset, setClaimWasReset] = useState(false);
  const [isTimeExpired, setIsTimeExpired] = useState(false);
  const autoSubmitTriggeredRef = useRef(false);

  // Pre-start & Disqualification state
  const [isPreStart, setIsPreStart] = useState(false);
  const [scheduledAnswerStartAt, setScheduledAnswerStartAt] = useState<string | null>(null);
  const [roundInfo, setRoundInfo] = useState<any>(null);
  const [isDisqualified, setIsDisqualified] = useState(false);
  const [disqualifiedReason, setDisqualifiedReason] = useState<string | null>(null);
  const [competitorInfo, setCompetitorInfo] = useState<{ playerName?: string; competitorCode?: string } | null>(null);

  const loadQuizSession = async () => {
    if (isDisqualified) return;
    const res = await fetchApi(`/quiz/session/${roundId}`);
    if (!res.success && (res.code === 'CLAIM_RESET' || res.error?.includes('claim was reset') || res.error?.includes('reset by the organizer'))) {
      setClaimWasReset(true);
      setLoading(false);
      return;
    }

    if (res.serverTime) {
      setServerTime(res.serverTime);
    }

    if (res.success) {
      if (res.isDisqualified) {
        setIsDisqualified(true);
        setDisqualifiedReason(res.disqualificationReason || res.reason || null);
        if (res.competitor) setCompetitorInfo(res.competitor);
        setLoading(false);
        return;
      }

      if (res.isPreStart || res.round?.status === 'PRE_START') {
        setIsPreStart(true);
        setRoundInfo(res.round);
        setScheduledAnswerStartAt(res.round.scheduledAnswerStartAt);
        setQuestions([]);
        setLoading(false);
        return;
      }

      // Quiz is active
      setIsPreStart(false);
      setRoundInfo(res.round);

      if (res.session?.isCompleted) {
        onSubmitted();
        return;
      }

      setQuestions(res.questions || []);
      setSavedAnswers(res.savedAnswers || {});
      setEndTime(res.round.endTime);
    } else {
      if (res.isDisqualified || res.error?.toLowerCase().includes('disqualified')) {
        setIsDisqualified(true);
        setDisqualifiedReason(res.disqualificationReason || res.reason || res.error || null);
        if (res.competitor) setCompetitorInfo(res.competitor);
      } else {
        setError(res.error || 'Failed to load quiz session.');
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadQuizSession();
  }, [roundId]);

  // Monotonic participant-local pre-start countdown
  const preStartTimer = useLocalCountdown({
    targetDeadline: isPreStart ? scheduledAnswerStartAt : null,
    serverTime,
    onExpired: () => {
      // Auto-transition to quiz when pre-start reaches 00:00 without requiring manual refresh
      loadQuizSession();
    },
  });

  // Active quiz periodic check to immediately detect organizer disqualification or claim reset
  useEffect(() => {
    if (isPreStart || isDisqualified || loading) return;

    const poll = setInterval(async () => {
      try {
        const res = await fetchApi(`/quiz/session/${roundId}`);
        if (!res.success && (res.code === 'CLAIM_RESET' || res.error?.includes('claim was reset') || res.error?.includes('reset by the organizer'))) {
          setClaimWasReset(true);
          return;
        }
        if (res.isDisqualified || (!res.success && res.error?.toLowerCase().includes('disqualified'))) {
          setIsDisqualified(true);
          setDisqualifiedReason(res.disqualificationReason || res.reason || res.error || null);
          if (res.competitor) setCompetitorInfo(res.competitor);
        }
      } catch (err) {
        // network glitches ignored
      }
    }, 5000);

    return () => {
      clearInterval(poll);
    };
  }, [isPreStart, isDisqualified, loading, roundId]);

  const handleTimeExpired = () => {
    setIsTimeExpired(true);
    setShowConfirmModal(false);
    if (!autoSubmitTriggeredRef.current) {
      autoSubmitTriggeredRef.current = true;
      handleFinalSubmit();
    }
  };

  const handleSelectOption = async (questionId: string, optionId: string) => {
    if (isPreStart || isDisqualified || isTimeExpired) return;

    const currentSaved = savedAnswers[questionId];
    const newSelected = currentSaved === optionId ? null : optionId;

    // Optimistic UI update
    setSavedAnswers((prev) => {
      const copy = { ...prev };
      if (newSelected) {
        copy[questionId] = newSelected;
      } else {
        delete copy[questionId];
      }
      return copy;
    });

    // Save to local server
    const res = await fetchApi('/quiz/answer', {
      method: 'POST',
      body: JSON.stringify({
        roundId,
        questionId,
        selectedOptionId: newSelected,
      }),
    });

    if (!res.success && (res.code === 'CLAIM_RESET' || res.error?.includes('claim was reset') || res.error?.includes('reset by the organizer'))) {
      setClaimWasReset(true);
      return;
    }

    if (!res.success && (res.isDisqualified || res.error?.toLowerCase().includes('disqualified'))) {
      setIsDisqualified(true);
      setDisqualifiedReason(res.disqualificationReason || res.reason || res.error || 'Disqualified from this round');
      if (res.competitor) setCompetitorInfo(res.competitor);
    }
  };

  const handleFinalSubmit = async () => {
    if (isPreStart || isDisqualified) return;

    setSubmitting(true);
    const res = await fetchApi('/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({ roundId }),
    });
    setSubmitting(false);

    if (res.success) {
      onSubmitted();
    } else {
      if (res.code === 'CLAIM_RESET' || res.error?.includes('claim was reset') || res.error?.includes('reset by the organizer')) {
        setClaimWasReset(true);
        return;
      }
      if (res.isDisqualified || res.error?.toLowerCase().includes('disqualified')) {
        setIsDisqualified(true);
        setDisqualifiedReason(res.disqualificationReason || res.reason || res.error || 'Disqualified from this round');
        if (res.competitor) setCompetitorInfo(res.competitor);
      } else {
        setError(res.error || 'Submission failed.');
      }
    }
  };

  if (loading) {
    return (
      <div style={{ color: '#FFFFFF', textAlign: 'center', padding: '4rem' }}>
        Loading Session & Authoritative State...
      </div>
    );
  }

  // DISQUALIFIED SCREEN
  if (isDisqualified) {
    const isRound2 = Boolean(user?.competitorId || user?.competitorCode || competitorInfo || roundInfo?.roundNumber === 2);
    const playerName = competitorInfo?.playerName || user?.playerName;
    const competitorCode = competitorInfo?.competitorCode || user?.competitorCode;

    return (
      <div style={{ padding: '3rem 1.5rem', maxWidth: '640px', margin: '3rem auto' }} className="card">
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🚫</div>
          <h2 style={{ color: '#D93838', fontSize: '1.6rem', fontWeight: 800, marginBottom: '1rem' }}>
            DISQUALIFIED FROM THIS ROUND
          </h2>
          <p style={{ fontSize: '1.15rem', color: '#171717', lineHeight: '1.6', marginBottom: '1.25rem', fontWeight: 600 }}>
            {isRound2
              ? 'You have been disqualified from this round.'
              : 'Your team has been disqualified from this round.'}
          </p>

          {isRound2 ? (
            (playerName || competitorCode) && (
              <div style={{ marginBottom: '1.5rem', padding: '0.85rem 1.25rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'inline-block', textAlign: 'left' }}>
                {playerName && (
                  <div style={{ fontSize: '0.95rem', color: '#1E293B', marginBottom: '0.35rem' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>Player:</span> <strong>{playerName}</strong>
                  </div>
                )}
                {competitorCode && (
                  <div style={{ fontSize: '0.95rem', color: '#1E293B' }}>
                    <span style={{ color: '#64748B', fontWeight: 600 }}>Competitor:</span> <code style={{ color: '#34349A', fontWeight: 800, fontFamily: 'monospace', fontSize: '1rem' }}>{competitorCode}</code>
                  </div>
                )}
              </div>
            )
          ) : (
            user?.teamName && (
              <div style={{ marginBottom: '1.5rem', padding: '0.75rem 1.25rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'inline-block' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Team:</span> <strong>{user.teamName}</strong>
              </div>
            )
          )}

          {disqualifiedReason && (
            <div style={{ marginTop: '0.5rem', marginBottom: '1.5rem', padding: '0.75rem 1rem', background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: '6px', color: '#C53030', fontSize: '0.95rem' }}>
              <strong>Reason:</strong> {disqualifiedReason}
            </div>
          )}

          <p style={{ fontSize: '0.95rem', color: '#64748B', lineHeight: '1.6', marginTop: '1rem' }}>
            Please contact the organizer.
          </p>
        </div>
      </div>
    );
  }

  // PRE-START WAITING SCREEN
  if (isPreStart) {
    return (
      <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div
          className="card animate-fade-in"
          style={{
            maxWidth: '620px',
            width: '100%',
            textAlign: 'center',
            background: '#FFFFFF',
            borderRadius: '16px',
            borderTop: '8px solid #F58220',
            padding: '3rem 2rem',
            boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
          }}
        >
          <div style={{ color: '#25256F', fontWeight: 900, fontSize: '1.8rem', letterSpacing: '2px' }}>
            FOSSFURY 26
          </div>
          <div style={{ color: '#F58220', fontWeight: 800, fontSize: '1.15rem', marginTop: '0.3rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
            ROUND {roundInfo?.roundNumber} — {roundInfo?.roundName}
          </div>

          {user?.competitorCode ? (
            <div style={{ marginTop: '1.25rem', padding: '0.6rem 1.25rem', background: '#F8FAFC', borderRadius: '8px', display: 'inline-block', border: '1px solid #E2E8F0' }}>
              <span style={{ fontWeight: 800, color: '#34349A', fontFamily: 'monospace', fontSize: '1rem' }}>[{user.competitorCode}]</span>{' '}
              <strong style={{ color: '#171717', fontSize: '1.05rem' }}>{user.playerName}</strong>
              <div style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '0.2rem' }}>{user.originalTeamName}</div>
            </div>
          ) : (
            <div style={{ marginTop: '1.25rem', padding: '0.6rem 1.25rem', background: '#F8FAFC', borderRadius: '8px', display: 'inline-block', border: '1px solid #E2E8F0' }}>
              <span style={{ fontWeight: 800, color: '#34349A' }}>TEAM:</span>{' '}
              <strong style={{ color: '#171717' }}>{user?.teamName}</strong>
            </div>
          )}

          <div style={{ margin: '2.5rem 0' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#25256F', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.5rem' }}>
              ROUND STARTING SOON
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.95rem', marginBottom: '1rem' }}>
              Quiz begins in:
            </p>
            <div
              style={{
                fontSize: '4.2rem',
                fontWeight: 900,
                color: '#25256F',
                fontFamily: 'monospace',
                letterSpacing: '3px',
                lineHeight: '1',
              }}
            >
              {preStartTimer.formattedTime}
            </div>
          </div>

          <div
            style={{
              background: '#E6F4EA',
              border: '1px solid #CEEAD6',
              borderRadius: '8px',
              padding: '0.9rem',
              color: '#137333',
              fontWeight: 700,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <span>✅</span> You are connected and ready.
          </div>

          <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '1.5rem', fontStyle: 'italic', lineHeight: '1.5' }}>
            Do not refresh / stay connected. Questions will become answerable automatically when the countdown reaches zero.
          </p>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div style={{ padding: '2rem', maxWidth: '600px', margin: '2rem auto' }} className="card">
        <h3 style={{ color: '#D93838' }}>Quiz Access Error</h3>
        <p style={{ marginTop: '0.5rem', color: '#555' }}>{error || 'No questions available.'}</p>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <AntiCheatGuard
      teamId={user?.teamId}
      competitorId={user?.competitorId}
      roundId={roundId}
      active={!isPreStart && !isDisqualified}
      onDisqualified={(reason) => {
        setIsDisqualified(true);
        setDisqualifiedReason(reason || 'Exceeded maximum anti-cheat violations');
      }}
    >
      <div style={{ padding: '1.5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Top Timer Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#FFFFFF',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            boxShadow: 'var(--shadow)',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#25256F', fontWeight: 800 }}>
              Question {currentIndex + 1} of {questions.length}
            </h2>
            <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
              {user?.competitorId ? (
                <>Player: <strong>{user.playerName}</strong> | Competitor: <strong>{user.competitorCode}</strong> | Original: <strong>{user.originalTeamName}</strong></>
              ) : (
                <>Team: <strong>{user?.teamName}</strong></>
              )}
              {' '}| Progress: {Object.keys(savedAnswers).length}/{questions.length} Answered
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Timer endTime={endTime} serverTime={serverTime} onTimeExpired={handleTimeExpired} />
            <button
              className="btn btn-primary"
              onClick={() => setShowConfirmModal(true)}
              disabled={isTimeExpired || submitting}
            >
              {submitting ? 'Submitting...' : isTimeExpired ? 'Time Expired' : 'Submit Quiz'}
            </button>
          </div>
        </div>

        {isTimeExpired && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            padding: '0.85rem 1.25rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            fontWeight: 700,
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          }}>
            ⏱ TIME HAS EXPIRED. Answers are locked. Submitting your quiz now...
          </div>
        )}

        {/* Main Grid Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
          {/* Question View Area */}
          <div className="card card-cream animate-fade-in" style={{ borderLeft: '6px solid #34349A' }}>
            <h3 style={{ fontSize: '1.15rem', color: '#171717', marginBottom: '1rem', lineHeight: '1.5' }}>
              {currentQ.questionText}
            </h3>

            {currentQ.codeSnippet && (
              <div className="code-snippet">{currentQ.codeSnippet}</div>
            )}

            <div style={{ marginTop: '1.5rem' }}>
              {currentQ.options.map((opt) => {
                const isSelected = savedAnswers[currentQ.id] === opt.id;
                return (
                  <div
                    key={opt.id}
                    className={`option-card ${isSelected ? 'selected' : ''} ${isTimeExpired ? 'disabled' : ''}`}
                    style={isTimeExpired ? { opacity: 0.6, cursor: 'not-allowed', pointerEvents: 'none' } : undefined}
                    onClick={() => !isTimeExpired && handleSelectOption(currentQ.id, opt.id)}
                  >
                    <div className="option-letter">{opt.optionLetter}</div>
                    <div style={{ fontSize: '0.95rem', color: '#171717' }}>{opt.optionText}</div>
                  </div>
                );
              })}
            </div>

            {/* Pagination controls */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '2rem',
                paddingTop: '1rem',
                borderTop: '1px solid #EBD5B7',
              }}
            >
              <button
                className="btn btn-outline"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => prev - 1)}
              >
                ← Previous Question
              </button>

              <button
                className="btn btn-indigo"
                disabled={currentIndex === questions.length - 1}
                onClick={() => setCurrentIndex((prev) => prev + 1)}
              >
                Next Question →
              </button>
            </div>
          </div>

          {/* Question Navigator Sidebar */}
          <div className="card" style={{ height: 'fit-content' }}>
            <h4 style={{ color: '#25256F', marginBottom: '1rem', fontSize: '1rem' }}>
              Question Palette
            </h4>

            <div className="nav-grid">
              {questions.map((q, idx) => {
                const isAnswered = !!savedAnswers[q.id];
                const isCurrent = idx === currentIndex;
                return (
                  <button
                    key={q.id}
                    className={`nav-item ${isAnswered ? 'answered' : ''} ${isCurrent ? 'active' : ''}`}
                    onClick={() => setCurrentIndex(idx)}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #EEE', fontSize: '0.8rem', color: '#64748B', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '12px', height: '12px', background: '#176B5B', borderRadius: '3px' }}></span>
                Answered ({Object.keys(savedAnswers).length})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '12px', height: '12px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '3px' }}></span>
                Unanswered ({questions.length - Object.keys(savedAnswers).length})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="anti-cheat-modal">
          <div className="anti-cheat-box" style={{ borderColor: '#34349A', animation: 'none' }}>
            <h3 style={{ color: '#25256F', marginBottom: '1rem' }}>Confirm Final Submission</h3>
            <p style={{ color: '#555', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              You have answered <strong>{Object.keys(savedAnswers).length}</strong> of <strong>{questions.length}</strong> questions.
              Once submitted, you cannot change your answers.
            </p>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowConfirmModal(false)}>
                Cancel & Continue Quiz
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleFinalSubmit} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Yes, Submit Final'}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </AntiCheatGuard>
  );
};
