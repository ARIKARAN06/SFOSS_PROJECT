import React, { useState, useEffect, useRef } from 'react';
import { fetchApi } from '../services/api';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rounds' | 'builder' | 'teams' | 'qualification' | 'anticheat' | 'results' | 'devroom'>('rounds');
  const [room, setRoom] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [antiCheatLogs, setAntiCheatLogs] = useState<any[]>([]);
  const [enableTestRoom, setEnableTestRoom] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // Selected Round — Persisted and protected from polling overwrites
  const [selectedRoundId, setSelectedRoundId] = useState<string>(() => {
    return sessionStorage.getItem('sfoss_admin_selected_round') || '';
  });
  const selectedRoundIdRef = useRef<string>(selectedRoundId);

  // Sync ref and session storage when selectedRoundId changes
  useEffect(() => {
    selectedRoundIdRef.current = selectedRoundId;
    if (selectedRoundId) {
      sessionStorage.setItem('sfoss_admin_selected_round', selectedRoundId);
    }
  }, [selectedRoundId]);

  // Tick timer for smooth countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --------------------------------------------------
  // CONFIGURATION STATE
  // --------------------------------------------------
  const [roomCodeInput, setRoomCodeInput] = useState<string>('');
  const [maxTeamsInput, setMaxTeamsInput] = useState<number>(40);
  const [roundDurationInput, setRoundDurationInput] = useState<number>(30);
  const [preStartDurationInput, setPreStartDurationInput] = useState<number>(0);

  // --------------------------------------------------
  // MANUAL QUESTION BUILDER STATE
  // --------------------------------------------------
  const [questions, setQuestions] = useState<any[]>([]);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qText, setQText] = useState('');
  const [qCode, setQCode] = useState('');
  const [qOptA, setQOptA] = useState('');
  const [qOptB, setQOptB] = useState('');
  const [qOptC, setQOptC] = useState('');
  const [qOptD, setQOptD] = useState('');
  const [qCorrect, setQCorrect] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [qExp, setQExp] = useState('');
  const [savingQ, setSavingQ] = useState(false);

  // --------------------------------------------------
  // ROUND 2 QUALIFICATION STATE
  // --------------------------------------------------
  const [qualificationData, setQualificationData] = useState<{ round1Id?: string; round2Id?: string; teams: any[]; competitors: any[] }>({ teams: [], competitors: [] });
  const [topNCount, setTopNCount] = useState<number>(10);
  const [playerDrafts, setPlayerDrafts] = useState<Record<string, { p1: string; p2: string; isQualified: boolean }>>({});
  const [qualifyingAction, setQualifyingAction] = useState(false);
  const [editNamesModal, setEditNamesModal] = useState<{ teamId: string; teamNumber: number; teamName: string; p1: string; p2: string } | null>(null);
  const [resetClaimModal, setResetClaimModal] = useState<{
    competitorId: string;
    competitorCode: string;
    playerName: string;
    teamNumber: number;
    teamName: string;
    teammateCode?: string;
    teammateName?: string;
  } | null>(null);
  const [resettingClaim, setResettingClaim] = useState(false);

  // --------------------------------------------------
  // ANTI-CHEAT FILTER & INDIVIDUAL DQ STATE
  // --------------------------------------------------
  const [acFilter, setAcFilter] = useState<'all' | 'round1' | 'round2'>('all');
  const [dqCompetitorModal, setDqCompetitorModal] = useState<{ competitorId: string; competitorCode: string; playerName: string; partnerCode: string } | null>(null);
  const [dqReasonInput, setDqReasonInput] = useState('Anti-cheat violation');
  const [resetCompetitorDqModal, setResetCompetitorDqModal] = useState<{ competitorId: string; competitorCode: string; playerName: string } | null>(null);

  // --------------------------------------------------
  // RESULTS & ANSWER PAPER STATE
  // --------------------------------------------------
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showConfirmCalc, setShowConfirmCalc] = useState(false);
  const [showConfirmResetTest, setShowConfirmResetTest] = useState(false);
  const [showConfirmResetAllDisqualified, setShowConfirmResetAllDisqualified] = useState(false);
  const [showConfirmResetStandings, setShowConfirmResetStandings] = useState(false);
  const [showConfirmPublishModal, setShowConfirmPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [startRoundConfirm, setStartRoundConfirm] = useState<{ roundId: string; roundNumber: number; roundName: string; claimedCount: number; totalCount: number } | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [inspectPaper, setInspectPaper] = useState<any>(null);

  const selectedRound = room?.rounds?.find((r: any) => r.id === selectedRoundId);
  const isRound2 = selectedRound?.roundNumber === 2;
  const isRoundStarted = selectedRound?.status === 'ROUND_ACTIVE' || selectedRound?.status === 'PRE_START';
  const isAnyRoundRunning = room?.status === 'ROUND_ACTIVE' ||
    room?.status === 'PRE_START' ||
    room?.rounds?.some((r: any) => r.status === 'ROUND_ACTIVE' || r.status === 'PRE_START');

  const formatCountdown = (scheduledTime: string | null) => {
    if (!scheduledTime) return '00:00';
    const diffSec = Math.max(0, Math.floor((new Date(scheduledTime).getTime() - now) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const loadData = async () => {
    setErrorMsg(null);

    // 0. Load Dev Info
    const devRes = await fetchApi('/rooms/dev-info');
    if (devRes.success) {
      setEnableTestRoom(!!devRes.enableTestRoom);
    }

    // 1. Load Room & Rounds
    const roomRes = await fetchApi('/rooms/init', { method: 'POST' });
    if (roomRes.success) {
      const sortedRounds = [...(roomRes.room.rounds || [])].sort((a: any, b: any) => (a.roundNumber || 0) - (b.roundNumber || 0));
      const sortedRoom = { ...roomRes.room, rounds: sortedRounds };
      setRoom(sortedRoom);
      setMaxTeamsInput(roomRes.room.maxTeams || 40);
      setRoomCodeInput((prev) => prev || (roomRes.room.roomCode || ''));

      // Only initialize selectedRoundId if not set or invalid
      const currentId = selectedRoundIdRef.current;
      const roundExists = sortedRounds.some((r: any) => r.id === currentId);
      if ((!currentId || !roundExists) && sortedRounds.length > 0) {
        const firstRound = sortedRounds[0];
        setSelectedRoundId(firstRound.id);
        setRoundDurationInput(firstRound.durationMinutes || 30);
        setPreStartDurationInput(firstRound.preStartDurationMinutes || 0);
      }
    }

    // 2. Load Teams
    const teamsRes = await fetchApi('/teams');
    if (teamsRes.success) {
      setTeams(teamsRes.teams || []);
    }

    // 3. Load Anti-Cheat Logs
    const acRes = await fetchApi('/anticheat/logs');
    if (acRes.success) {
      setAntiCheatLogs(acRes.logs || []);
    }

    setLoading(false);
  };

  const loadRoundQuestions = async (roundId: string) => {
    if (!roundId) return;
    const res = await fetchApi(`/questions/round/${roundId}`);
    if (res.success) {
      setQuestions(res.questions || []);
    }
  };

  const loadLeaderboard = async (roundId: string) => {
    if (!roundId) return;
    const res = await fetchApi(`/results/leaderboard/${roundId}`);
    if (res.success) {
      setLeaderboard(res.results || []);
    }
  };

  const loadQualification = async (roundId?: string) => {
    const targetRoundId = roundId || selectedRoundId;
    const res = await fetchApi(`/qualification/${targetRoundId || 'default'}`);
    if (res.success) {
      setQualificationData({
        round1Id: res.round1Id,
        round2Id: res.round2Id,
        teams: res.teams || [],
        competitors: res.competitors || [],
      });

      // Initialize draft inputs with auto-carried names from Round 1
      const drafts: Record<string, { p1: string; p2: string; isQualified: boolean }> = {};
      (res.teams || []).forEach((t: any) => {
        const p1Comp = t.competitors?.find((c: any) => c.playerPosition === 'A' || c.playerPosition === '1');
        const p2Comp = t.competitors?.find((c: any) => c.playerPosition === 'B' || c.playerPosition === '2');
        drafts[t.id] = {
          p1: t.player1Name || p1Comp?.playerName || '',
          p2: t.player2Name || p2Comp?.playerName || '',
          isQualified: !!t.isQualifiedForRound2,
        };
      });
      setPlayerDrafts(drafts);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedRoundId) {
      loadRoundQuestions(selectedRoundId);
      loadLeaderboard(selectedRoundId);
      loadQualification(selectedRoundId);
      const selectedR = room?.rounds?.find((r: any) => r.id === selectedRoundId);
      if (selectedR) {
        setRoundDurationInput(selectedR.durationMinutes);
        setPreStartDurationInput(selectedR.preStartDurationMinutes || 0);
      }
    }
  }, [selectedRoundId]);

  // --------------------------------------------------
  // HANDLERS: CONFIGURATION & ROOM CODE
  // --------------------------------------------------
  const handleSaveRoomCode = async () => {
    setMessage(null);
    setErrorMsg(null);

    const cleanCode = roomCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Room code cannot be blank.');
      return;
    }
    if (!/^[A-Z0-9]{4,12}$/.test(cleanCode)) {
      setErrorMsg('Room code must be 4 to 12 alphanumeric characters (A-Z, 0-9).');
      return;
    }
    if (isAnyRoundRunning) {
      setErrorMsg('Room code cannot be changed while a round is in progress.');
      return;
    }

    const res = await fetchApi(`/rooms/${room?.id || 'main'}/update-code`, {
      method: 'POST',
      body: JSON.stringify({ roomCode: cleanCode }),
    });

    if (res.success) {
      setMessage('Room code updated successfully.');
      setRoom((prev: any) => ({ ...prev, roomCode: cleanCode }));
      setRoomCodeInput(cleanCode);
    } else {
      setErrorMsg(res.error || 'Failed to update room code.');
    }
  };

  const handleGenerateRoomCode = () => {
    if (isAnyRoundRunning) return;
    const prefixes = ['FURY', 'FOSS', 'SFOSS', 'CODE', 'TECH'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(10 + Math.random() * 89);
    setRoomCodeInput(`${prefix}${num}`);
  };

  const handleSaveConfiguration = async () => {
    setMessage(null);
    setErrorMsg(null);

    const teamRes = await fetchApi('/teams/count', {
      method: 'POST',
      body: JSON.stringify({ maxTeams: maxTeamsInput }),
    });

    if (!teamRes.success) {
      setErrorMsg(teamRes.error || 'Failed to update team count.');
      return;
    }

    if (selectedRoundId) {
      const durRes = await fetchApi(`/rooms/rounds/${selectedRoundId}/config`, {
        method: 'PATCH',
        body: JSON.stringify({
          durationMinutes: roundDurationInput,
          preStartDurationMinutes: preStartDurationInput,
        }),
      });

      if (!durRes.success) {
        setErrorMsg(durRes.error || 'Quiz duration cannot be changed after the round has started.');
        return;
      }
    }

    setMessage('✅ Configuration saved successfully!');
    loadData();
  };

  // Check attendance before starting round
  const handleCheckStartRound = (r: any) => {
    if (r.roundNumber === 1) {
      const claimedCount = teams.filter((t) => t.isActiveSlot && t.isClaimed).length;
      const totalCount = room?.maxTeams || 40;
      if (claimedCount < totalCount) {
        setStartRoundConfirm({
          roundId: r.id,
          roundNumber: 1,
          roundName: r.roundName,
          claimedCount,
          totalCount,
        });
        return;
      }
    } else {
      const totalCompetitors = qualificationData.competitors.length;
      const claimedCompetitors = qualificationData.competitors.filter((c) => c.isClaimed).length;
      if (claimedCompetitors < totalCompetitors || totalCompetitors === 0) {
        setStartRoundConfirm({
          roundId: r.id,
          roundNumber: 2,
          roundName: r.roundName,
          claimedCount: claimedCompetitors,
          totalCount: totalCompetitors,
        });
        return;
      }
    }
    executeStartRound(r.id);
  };

  const executeStartRound = async (roundId: string) => {
    setStartRoundConfirm(null);
    setMessage(null);
    const res = await fetchApi(`/rooms/rounds/${roundId}/start`, { method: 'POST' });
    if (res.success) {
      setMessage('▶ Round started successfully!');
      loadData();
    } else {
      setErrorMsg(res.error || 'Failed to start round.');
    }
  };

  const handleEndRound = async (roundId: string) => {
    setMessage(null);
    const res = await fetchApi(`/rooms/rounds/${roundId}/end`, { method: 'POST' });
    if (res.success) {
      setMessage('⏹ Round ended.');
      loadData();
    }
  };

  // --------------------------------------------------
  // HANDLERS: MANUAL QUESTION BUILDER
  // --------------------------------------------------
  const handleClearQForm = () => {
    setEditingQuestionId(null);
    setQText('');
    setQCode('');
    setQOptA('');
    setQOptB('');
    setQOptC('');
    setQOptD('');
    setQCorrect('A');
    setQExp('');
  };

  const handleSaveQuestion = async (andAddNext = false) => {
    if (!selectedRoundId) return;
    setSavingQ(true);
    setErrorMsg(null);

    const payload = {
      roundId: selectedRoundId,
      questionText: qText,
      codeSnippet: qCode,
      explanation: qExp,
      options: [
        { optionLetter: 'A', optionText: qOptA, isCorrect: qCorrect === 'A' },
        { optionLetter: 'B', optionText: qOptB, isCorrect: qCorrect === 'B' },
        { optionLetter: 'C', optionText: qOptC, isCorrect: qCorrect === 'C' },
        { optionLetter: 'D', optionText: qOptD, isCorrect: qCorrect === 'D' },
      ],
    };

    let res;
    if (editingQuestionId) {
      res = await fetchApi(`/questions/manual/${editingQuestionId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetchApi('/questions/manual', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    setSavingQ(false);

    if (res.success) {
      setMessage(`✅ Question ${editingQuestionId ? 'updated' : 'saved'} successfully!`);
      loadRoundQuestions(selectedRoundId);
      if (andAddNext) {
        handleClearQForm();
      } else if (!editingQuestionId) {
        handleClearQForm();
      }
    } else {
      setErrorMsg(res.error || 'Failed to save question.');
    }
  };

  const handleEditQuestionClick = (q: any) => {
    setEditingQuestionId(q.id);
    setQText(q.questionText || '');
    setQCode(q.codeSnippet || '');
    setQExp(q.explanation || '');

    const optA = q.options?.find((o: any) => o.optionLetter === 'A');
    const optB = q.options?.find((o: any) => o.optionLetter === 'B');
    const optC = q.options?.find((o: any) => o.optionLetter === 'C');
    const optD = q.options?.find((o: any) => o.optionLetter === 'D');

    setQOptA(optA?.optionText || '');
    setQOptB(optB?.optionText || '');
    setQOptC(optC?.optionText || '');
    setQOptD(optD?.optionText || '');

    const correctOpt = q.options?.find((o: any) => o.isCorrect);
    if (correctOpt) {
      setQCorrect(correctOpt.optionLetter as any);
    }
  };

  const handleDeleteQuestionClick = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    const res = await fetchApi(`/questions/manual/${questionId}`, { method: 'DELETE' });
    if (res.success) {
      setMessage('Question deleted.');
      loadRoundQuestions(selectedRoundId);
    }
  };

  const handleMoveQuestion = async (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;

    const temp = newQuestions[index];
    newQuestions[index] = newQuestions[targetIndex];
    newQuestions[targetIndex] = temp;

    setQuestions(newQuestions);
    const orderedIds = newQuestions.map((q) => q.id);

    await fetchApi(`/questions/reorder/${selectedRoundId}`, {
      method: 'POST',
      body: JSON.stringify({ orderedQuestionIds: orderedIds }),
    });
  };

  // --------------------------------------------------
  // HANDLERS: TEAMS & SESSION RESET
  // --------------------------------------------------
  const handleResetSession = async (teamId: string, teamNumber: number) => {
    if (!confirm(`Reset device session for Team ${String(teamNumber).padStart(2, '0')}? This will allow authorized team recovery.`)) return;
    const res = await fetchApi(`/teams/${teamId}/reset-session`, { method: 'POST' });
    if (res.success) {
      setMessage(`Device session reset for Team ${String(teamNumber).padStart(2, '0')}.`);
      loadData();
    }
  };

  const handleDisqualify = async (teamId: string) => {
    if (!confirm('Are you sure you want to disqualify this team?')) return;
    const res = await fetchApi(`/teams/${teamId}/disqualify`, { method: 'POST' });
    if (res.success) {
      setMessage('Team disqualified.');
      loadData();
    }
  };

  const handleResetTeamDisqualification = async (teamId: string, teamNumber: number) => {
    if (!confirm(`Reset disqualification for Team ${String(teamNumber).padStart(2, '0')}?`)) return;
    const res = await fetchApi(`/teams/${teamId}/reset-disqualification`, { method: 'POST' });
    if (res.success) {
      setMessage(`Disqualification reset for Team ${String(teamNumber).padStart(2, '0')}.`);
      loadData();
    }
  };

  const handleExecuteResetAllDisqualified = async () => {
    setShowConfirmResetAllDisqualified(false);
    const res = await fetchApi('/teams/reset-disqualified', { method: 'POST' });
    if (res.success) {
      setMessage(`✅ ${res.message || `${res.resetCount || 0} disqualified teams reset.`}`);
      loadData();
    } else {
      setErrorMsg(res.error || 'Failed to reset disqualified teams.');
    }
  };

  const handleExecuteResetStandings = async () => {
    if (!selectedRoundId) return;
    setShowConfirmResetStandings(false);
    const res = await fetchApi(`/results/reset-standings/${selectedRoundId}`, { method: 'POST' });
    if (res.success) {
      setMessage('🔄 Official standings reset for this round. Participant results are hidden until recalculated.');
      setLeaderboard([]);
      loadData();
    } else {
      setErrorMsg(res.error || 'Failed to reset official standings.');
    }
  };

  // --------------------------------------------------
  // HANDLERS: ROUND 2 QUALIFICATION & PLAYER NAMES
  // --------------------------------------------------
  const handleQualifyTopN = async () => {
    setQualifyingAction(true);
    setMessage(null);
    setErrorMsg(null);
    const res = await fetchApi('/qualification/qualify-top-n', {
      method: 'POST',
      body: JSON.stringify({
        roundId: selectedRoundId,
        round1Id: qualificationData.round1Id,
        round2Id: qualificationData.round2Id,
        count: topNCount,
      }),
    });
    setQualifyingAction(false);
    if (res.success) {
      setMessage(`✅ ${res.message}`);
      loadQualification();
      loadData();
    } else {
      setErrorMsg(res.error || 'Failed to qualify top teams.');
    }
  };

  const handleToggleQualifyCheckbox = async (team: any) => {
    setMessage(null);
    setErrorMsg(null);
    const isCurrentlyQualified = !!team.isQualifiedForRound2;

    if (!isCurrentlyQualified) {
      // Auto-carry names from Round 1 registration directly into 07-A and 07-B
      const p1 = team.player1Name?.trim() || `Player 1 (${team.teamName})`;
      const p2 = team.player2Name?.trim() || `Player 2 (${team.teamName})`;
      const res = await fetchApi('/qualification/qualify', {
        method: 'POST',
        body: JSON.stringify({
          teamId: team.id,
          round2Id: qualificationData.round2Id,
          roundId: selectedRoundId,
          player1Name: p1,
          player2Name: p2,
        }),
      });
      if (res.success) {
        setMessage(`Team ${String(team.teamNumber).padStart(2, '0')} qualified! Competitors 0${team.teamNumber}-A (${p1}) and 0${team.teamNumber}-B (${p2}) provisioned.`);
        loadQualification();
        loadData();
      } else {
        setErrorMsg(res.error || 'Failed to qualify team.');
      }
    } else {
      const res = await fetchApi('/qualification/unqualify', {
        method: 'POST',
        body: JSON.stringify({
          teamId: team.id,
          round2Id: qualificationData.round2Id,
          roundId: selectedRoundId,
        }),
      });
      if (res.success) {
        setMessage(`Team ${team.teamNumber} qualification removed.`);
        loadQualification();
        loadData();
      } else {
        setErrorMsg(res.error || 'Cannot remove qualification because Round 2 participation data already exists.');
      }
    }
  };

  const handleSaveEditedNames = async () => {
    if (!editNamesModal) return;
    if (!editNamesModal.p1.trim() || !editNamesModal.p2.trim()) {
      setErrorMsg('Both player names are required.');
      return;
    }
    const res = await fetchApi('/qualification/update-player-names', {
      method: 'PATCH',
      body: JSON.stringify({
        teamId: editNamesModal.teamId,
        round2Id: qualificationData.round2Id,
        player1Name: editNamesModal.p1.trim(),
        player2Name: editNamesModal.p2.trim(),
      }),
    });
    if (res.success) {
      setMessage(`Player names updated for Team ${String(editNamesModal.teamNumber).padStart(2, '0')}.`);
      setEditNamesModal(null);
      loadQualification();
      loadData();
    } else {
      setErrorMsg(res.error || 'Failed to update player names.');
    }
  };

  // --------------------------------------------------
  // HANDLERS: INDIVIDUAL COMPETITOR ANTI-CHEAT & DQ
  // --------------------------------------------------
  const handleDisqualifyCompetitor = async () => {
    if (!dqCompetitorModal) return;
    const res = await fetchApi(`/anticheat/competitors/${dqCompetitorModal.competitorId}/disqualify`, {
      method: 'POST',
      body: JSON.stringify({ reason: dqReasonInput }),
    });
    setDqCompetitorModal(null);
    if (res.success) {
      setMessage(`Competitor ${dqCompetitorModal.playerName} (${dqCompetitorModal.competitorCode}) disqualified from Round 2.`);
      loadData();
      if (selectedRoundId) loadLeaderboard(selectedRoundId);
      loadQualification();
    } else {
      setErrorMsg(res.error || 'Failed to disqualify competitor.');
    }
  };

  const handleResetCompetitorDisqualification = async () => {
    if (!resetCompetitorDqModal) return;
    const res = await fetchApi(`/anticheat/competitors/${resetCompetitorDqModal.competitorId}/reset-disqualification`, {
      method: 'POST',
    });
    setResetCompetitorDqModal(null);
    if (res.success) {
      setMessage(`Disqualification reset for ${resetCompetitorDqModal.playerName} (${resetCompetitorDqModal.competitorCode}).`);
      loadData();
      if (selectedRoundId) loadLeaderboard(selectedRoundId);
      loadQualification();
    } else {
      setErrorMsg(res.error || 'Failed to reset competitor disqualification.');
    }
  };

  const handleResetCompetitorClaim = async () => {
    if (!resetClaimModal) return;
    setResettingClaim(true);
    const res = await fetchApi(`/qualification/competitors/${resetClaimModal.competitorId}/reset-claim`, {
      method: 'POST',
    });
    setResettingClaim(false);
    if (res.success) {
      setMessage(res.message || `Round 2 claim reset successfully for ${resetClaimModal.competitorCode} (${resetClaimModal.playerName}). Slot is now AVAILABLE.`);
      setResetClaimModal(null);
      loadQualification();
    } else {
      setErrorMsg(res.error || 'Failed to reset competitor claim.');
      setResetClaimModal(null);
    }
  };

  // --------------------------------------------------
  // HANDLERS: RESULTS & ANSWER PAPER
  // --------------------------------------------------
  const handleExecuteCalculateResults = async () => {
    if (!selectedRoundId) return;
    setCalculating(true);
    setShowConfirmCalc(false);

    const res = await fetchApi(`/results/calculate/${selectedRoundId}`, { method: 'POST' });
    setCalculating(false);

    if (res.success) {
      setMessage('🏆 Results calculated and ranked by score DESC then submission time ASC!');
      loadLeaderboard(selectedRoundId);
      loadData();
    } else {
      setErrorMsg(res.error || 'Failed to calculate results.');
    }
  };

  const handleViewAnswerPaper = async (entityId: string) => {
    if (!selectedRoundId) return;
    const res = await fetchApi(`/results/answer-paper/${selectedRoundId}/${entityId}`);
    if (res.success) {
      setInspectPaper(res);
    } else {
      alert(res.error || 'Failed to fetch answer paper.');
    }
  };

  const handleOpenPublishModal = () => {
    setMessage(null);
    setErrorMsg(null);
    if (!selectedRoundId) return;
    if (isRound2) {
      setErrorMsg('Result publication is only available for Round 1.');
      return;
    }
    if (qualifiedTeamsCount === 0) {
      setErrorMsg('Complete Round 2 qualification before publishing Round 1 results.');
      return;
    }
    setShowConfirmPublishModal(true);
  };

  const handleExecutePublishResults = async () => {
    if (!selectedRoundId) return;
    if (qualifiedTeamsCount === 0) {
      setShowConfirmPublishModal(false);
      setErrorMsg('Complete Round 2 qualification before publishing Round 1 results.');
      return;
    }
    setPublishing(true);
    const res = await fetchApi(`/results/publish/${selectedRoundId}`, { method: 'POST' });
    setPublishing(false);
    setShowConfirmPublishModal(false);
    if (res.success) {
      setMessage('Round 1 qualification results published successfully.');
      loadData();
    } else {
      setErrorMsg(res.error || 'Failed to publish results.');
    }
  };

  // --------------------------------------------------
  // HANDLERS: DEV TEST ROOM RESET
  // --------------------------------------------------
  const handleExecuteResetTestRoom = async () => {
    setShowConfirmResetTest(false);
    const res = await fetchApi('/rooms/test-room/reset', { method: 'POST' });
    if (res.success) {
      setMessage('🛠️ TEST26 room reset cleanly. Test answers, scores, and claims cleared.');
      loadData();
    } else {
      setErrorMsg(res.error || 'Failed to reset test room.');
    }
  };

  if (loading) return <div style={{ color: '#FFF', textAlign: 'center', padding: '4rem' }}>Loading Admin Command Center...</div>;

  const qualifiedTeamsCount = qualificationData.teams.filter((t) => t.isQualifiedForRound2).length;
  const competitorSlotsCount = qualificationData.competitors.length;
  const claimedCompetitorsCount = qualificationData.competitors.filter((c) => c.isClaimed).length;

  const renderClaimStatusBadge = (comp: any) => {
    if (!comp) return <span style={{ color: '#94A3B8' }}>—</span>;
    const status = comp.claimStatus || (comp.isDisqualified ? 'DISQUALIFIED' : comp.hasSubmitted ? 'SUBMITTED' : comp.hasStarted ? 'ACTIVE' : comp.isClaimed ? 'CLAIMED' : 'AVAILABLE');

    let bg = '#F1F5F9';
    let color = '#475569';
    let border = '#CBD5E1';

    if (status === 'AVAILABLE') {
      bg = '#E6F4EA';
      color = '#137333';
      border = '#CEEAD6';
    } else if (status === 'CLAIMED') {
      bg = '#FEF7E0';
      color = '#B06000';
      border = '#FEEFC3';
    } else if (status === 'ACTIVE') {
      bg = '#E8F0FE';
      color = '#1A73E8';
      border = '#D2E3FC';
    } else if (status === 'SUBMITTED') {
      bg = '#F3E8FD';
      color = '#7627BB';
      border = '#E9D5FF';
    } else if (status === 'DISQUALIFIED') {
      bg = '#FCE8E6';
      color = '#C5221F';
      border = '#FAD2CF';
    }

    return (
      <span style={{
        display: 'inline-block',
        padding: '0.15rem 0.45rem',
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.5px',
        background: bg,
        color: color,
        border: `1px solid ${border}`,
      }}>
        {status}
      </span>
    );
  };

  // Anti-cheat logs filtered by selected view
  const filteredLogs = antiCheatLogs.filter((log) => {
    if (acFilter === 'round1') return !log.competitorId;
    if (acFilter === 'round2') return !!log.competitorId;
    return true;
  });

  // Results partition for Round 2
  const activeLeaderboard = isRound2 ? leaderboard.filter((item) => !item.isDisqualified) : leaderboard;
  const dqCompetitors = isRound2 ? leaderboard.filter((item) => item.isDisqualified) : [];

  return (
    <div style={{ padding: '2rem', maxWidth: '1300px', margin: '0 auto', color: '#FFFFFF' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ color: '#FFF1DC', fontSize: '1.8rem', fontWeight: 800 }}>ADMIN COMMAND CENTER</h1>
          <p style={{ color: '#A0A0C0', fontSize: '0.9rem' }}>FOSSFURY 26 — SFOSS Technical Quiz Platform</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ background: '#34349A', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem' }}>
            Active Round: <strong>Round {selectedRound?.roundNumber || 1} ({selectedRound?.roundName || 'Round 1'})</strong>
          </div>
          <div style={{ background: '#25256F', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem' }}>
            Teams: <strong>{teams.filter((t) => t.isActiveSlot && t.isClaimed).length}/{room?.maxTeams || 40} Claimed</strong>
          </div>
        </div>
      </div>

      {message && (
        <div style={{ background: '#E6F6F3', border: '1px solid #176B5B', color: '#176B5B', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.5rem', fontWeight: 600 }}>
          {message}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: '#FDF2F2', border: '1px solid #D93838', color: '#D93838', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.5rem', fontWeight: 600 }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button className={`btn ${activeTab === 'rounds' ? 'btn-primary' : 'btn-outline'}`} style={{ color: '#FFF' }} onClick={() => setActiveTab('rounds')}>
          ⚙️ Rooms & Configuration
        </button>
        <button className={`btn ${activeTab === 'builder' ? 'btn-primary' : 'btn-outline'}`} style={{ color: '#FFF' }} onClick={() => setActiveTab('builder')}>
          📝 Question Builder ({questions.length})
        </button>
        <button className={`btn ${activeTab === 'teams' ? 'btn-primary' : 'btn-outline'}`} style={{ color: '#FFF' }} onClick={() => setActiveTab('teams')}>
          👥 Round 1 Teams ({teams.filter((t) => t.isActiveSlot).length})
        </button>
        <button className={`btn ${activeTab === 'qualification' ? 'btn-primary' : 'btn-outline'}`} style={{ color: '#FFF' }} onClick={() => { setActiveTab('qualification'); loadQualification(); }}>
          ⚡ Round 2 Qualification ({qualifiedTeamsCount})
        </button>
        <button className={`btn ${activeTab === 'anticheat' ? 'btn-primary' : 'btn-outline'}`} style={{ color: '#FFF' }} onClick={() => setActiveTab('anticheat')}>
          🛡️ Anti-Cheat ({antiCheatLogs.length})
        </button>
        <button className={`btn ${activeTab === 'results' ? 'btn-primary' : 'btn-outline'}`} style={{ color: '#FFF' }} onClick={() => setActiveTab('results')}>
          🏆 Standings & Results
        </button>

        {enableTestRoom && (
          <button className={`btn ${activeTab === 'devroom' ? 'btn-danger' : 'btn-outline'}`} style={{ color: '#FFF', borderColor: '#F58220' }} onClick={() => setActiveTab('devroom')}>
            🛠️ Dev Test Room (TEST26)
          </button>
        )}
      </div>

      {/* TAB 1: ROOMS & CONFIGURATION */}
      {activeTab === 'rounds' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* COMPETITION ROOM CODE */}
          <div className="card animate-fade-in" style={{ borderLeft: '6px solid #F58220' }}>
            <h2 style={{ color: '#25256F', marginBottom: '0.4rem', fontSize: '1.3rem', fontWeight: 800 }}>
              COMPETITION ROOM CODE
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              This is the code participants must enter to join the competition.
            </p>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
              <div className="form-group" style={{ margin: 0, minWidth: '240px' }}>
                <label className="form-label" style={{ color: '#25256F', fontWeight: 700 }}>
                  Current Room Code
                </label>
                <input
                  type="text"
                  className="form-control"
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    color: '#34349A',
                    background: isAnyRoundRunning ? '#F1F5F9' : '#FFFFFF',
                  }}
                  value={roomCodeInput}
                  disabled={isAnyRoundRunning}
                  onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="e.g. FURY26"
                  maxLength={12}
                />
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveRoomCode}
                disabled={isAnyRoundRunning}
              >
                SAVE ROOM CODE
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={handleGenerateRoomCode}
                disabled={isAnyRoundRunning}
              >
                GENERATE NEW CODE
              </button>
            </div>

            {isAnyRoundRunning && (
              <div style={{ marginTop: '0.75rem', color: '#D93838', fontSize: '0.85rem', fontWeight: 600 }}>
                ⚠️ Room code cannot be changed while a round is in progress.
              </div>
            )}
          </div>

          <div className="card animate-fade-in">
            <h2 style={{ color: '#25256F', marginBottom: '1rem', fontSize: '1.3rem' }}>
              Global Room Configuration
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ color: '#25256F', fontWeight: 700 }}>Team Slots Count (10 – 60)</label>
                <input
                  type="number"
                  min={10}
                  max={60}
                  className="form-control"
                  value={maxTeamsInput}
                  onChange={(e) => setMaxTeamsInput(parseInt(e.target.value, 10) || 10)}
                />
                <span style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.3rem', display: 'block' }}>
                  Configured: {maxTeamsInput} | Claimed: {teams.filter((t) => t.isActiveSlot && t.isClaimed).length}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#25256F', fontWeight: 700 }}>Active Round Duration (Minutes)</label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  className="form-control"
                  value={roundDurationInput}
                  disabled={isRoundStarted}
                  onChange={(e) => setRoundDurationInput(parseInt(e.target.value, 10) || 30)}
                />
                <span style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.3rem', display: 'block' }}>
                  Duration cannot be changed after round starts.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#25256F', fontWeight: 700 }}>Pre-Start Countdown (Minutes, 0–30)</label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  className="form-control"
                  value={preStartDurationInput}
                  disabled={isRoundStarted}
                  onChange={(e) => setPreStartDurationInput(Math.min(30, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                />
                <span style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.3rem', display: 'block' }}>
                  0 = start immediately. &gt;0 = waiting screen before questions.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn btn-indigo" onClick={handleSaveConfiguration} disabled={isRoundStarted}>
                SAVE CONFIGURATION
              </button>
              {isRoundStarted && (
                <span style={{ color: '#D93838', fontSize: '0.85rem', fontWeight: 600 }}>
                  ⚠️ Configuration locked while round is ACTIVE or PRE-START.
                </span>
              )}
            </div>
          </div>

          <div className="card animate-fade-in">
            <h2 style={{ color: '#25256F', marginBottom: '1rem', fontSize: '1.3rem' }}>
              Competition Round Lifecycle Controller
            </h2>
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              {[...(room?.rounds || [])].sort((a: any, b: any) => (a.roundNumber || 0) - (b.roundNumber || 0)).map((r: any) => {
                const isCurrentActive = r.id === selectedRoundId;
                const isCurrentRoundStarted = r.status === 'ROUND_ACTIVE' || r.status === 'PRE_START';

                return (
                  <div key={r.id} style={{ background: isCurrentActive ? '#FFF1DC' : '#F8FAFC', border: isCurrentActive ? '2px solid #F58220' : '1px solid #E2E8F0', padding: '1.25rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{ color: '#25256F', fontSize: '1.2rem', margin: 0 }}>
                          Round {r.roundNumber}: {r.roundName}
                        </h3>
                        {isCurrentActive && (
                          <span style={{ background: '#F58220', color: '#FFF', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 800 }}>
                            SELECTED
                          </span>
                        )}
                      </div>
                      <p style={{ color: '#64748B', fontSize: '0.85rem', marginTop: '0.3rem' }}>
                        Status: <strong style={{ color: r.status === 'ROUND_ACTIVE' ? '#176B5B' : r.status === 'PRE_START' ? '#F58220' : '#25256F' }}>{r.status}</strong> | Duration: {r.durationMinutes} mins | Pre-Start: {r.preStartDurationMinutes || 0} mins | Scheme: +1 / -1 / 0
                      </p>

                      {r.status === 'PRE_START' && (
                        <div style={{ background: '#FFF1DC', border: '1px solid #F58220', padding: '0.5rem 0.8rem', borderRadius: '6px', marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span className="status-pill status-pending" style={{ background: '#F58220', color: '#FFF', fontSize: '0.75rem' }}>
                            ROUND STATUS: PRE-START (COUNTDOWN ACTIVE)
                          </span>
                          <span style={{ color: '#25256F', fontWeight: 800, fontSize: '0.9rem' }}>
                            ANSWERING STARTS IN: {formatCountdown(r.scheduledAnswerStartAt)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button className="btn btn-outline" onClick={() => { setSelectedRoundId(r.id); setActiveTab('builder'); }}>
                        EDIT QUESTIONS
                      </button>

                      {isCurrentRoundStarted ? (
                        <button className="btn btn-danger" onClick={() => handleEndRound(r.id)}>
                          END ROUND / ABORT
                        </button>
                      ) : (
                        <button className="btn btn-teal" onClick={() => handleCheckStartRound(r)}>
                          START ROUND
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MANUAL QUESTION BUILDER */}
      {activeTab === 'builder' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Left Column: Question Form Editor */}
          <div className="card card-cream animate-fade-in" style={{ borderLeft: '6px solid #F58220', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ color: '#25256F', fontSize: '1.3rem' }}>
                {editingQuestionId ? 'Edit Question' : 'Add New Question'}
              </h2>
              <select
                className="form-control"
                style={{ width: '180px', padding: '0.4rem 0.6rem' }}
                value={selectedRoundId}
                onChange={(e) => setSelectedRoundId(e.target.value)}
              >
                {[...(room?.rounds || [])].sort((a: any, b: any) => (a.roundNumber || 0) - (b.roundNumber || 0)).map((r: any) => (
                  <option key={r.id} value={r.id}>
                    Round {r.roundNumber}: {r.roundName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#25256F', fontWeight: 700 }}>Question Text</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="What is the output of the following code?"
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#25256F', fontWeight: 700 }}>Code Block (Optional)</label>
              <textarea
                className="form-control"
                rows={3}
                style={{ fontFamily: 'monospace', fontSize: '0.85rem', background: '#1E1E38', color: '#82AAFF' }}
                placeholder="int x = 10; printf(&quot;%d&quot;, x);"
                value={qCode}
                onChange={(e) => setQCode(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ color: '#25256F', fontWeight: 700 }}>Option A</label>
                <input type="text" className="form-control" value={qOptA} onChange={(e) => setQOptA(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: '#25256F', fontWeight: 700 }}>Option B</label>
                <input type="text" className="form-control" value={qOptB} onChange={(e) => setQOptB(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: '#25256F', fontWeight: 700 }}>Option C</label>
                <input type="text" className="form-control" value={qOptC} onChange={(e) => setQOptC(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ color: '#25256F', fontWeight: 700 }}>Option D</label>
                <input type="text" className="form-control" value={qOptD} onChange={(e) => setQOptD(e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#F58220', fontWeight: 800 }}>Correct Answer Choice</label>
              <div style={{ display: 'flex', gap: '1.5rem', background: '#FFFFFF', padding: '0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}>
                {(['A', 'B', 'C', 'D'] as const).map((letter) => (
                  <label key={letter} style={{ cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#171717' }}>
                    <input
                      type="radio"
                      name="correctChoice"
                      checked={qCorrect === letter}
                      onChange={() => setQCorrect(letter)}
                    />
                    Option {letter}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#25256F', fontWeight: 700 }}>Explanation (Optional)</label>
              <input type="text" className="form-control" placeholder="Brief explanation for correct answer" value={qExp} onChange={(e) => setQExp(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleSaveQuestion(false)} disabled={savingQ}>
                SAVE QUESTION
              </button>
              <button className="btn btn-teal" style={{ flex: 1 }} onClick={() => handleSaveQuestion(true)} disabled={savingQ}>
                SAVE & ADD NEXT
              </button>
              {editingQuestionId && (
                <button className="btn btn-outline" onClick={handleClearQForm}>
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Question Bank List */}
          <div className="card animate-fade-in" style={{ maxHeight: '750px', overflowY: 'auto' }}>
            <h2 style={{ color: '#25256F', fontSize: '1.3rem', marginBottom: '1rem' }}>
              Question Set ({questions.length})
            </h2>

            {questions.length === 0 ? (
              <p style={{ color: '#64748B', fontStyle: 'italic' }}>No questions created yet for this round.</p>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {questions.map((q: any, idx: number) => {
                  const correctOpt = q.options?.find((o: any) => o.isCorrect);
                  return (
                    <div key={q.id} style={{ background: '#FFF1DC', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #34349A' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 800, color: '#25256F' }}>Q{idx + 1}</span>
                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                          <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} disabled={idx === 0} onClick={() => handleMoveQuestion(idx, 'up')}>↑</button>
                          <button className="btn btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} disabled={idx === questions.length - 1} onClick={() => handleMoveQuestion(idx, 'down')}>↓</button>
                          <button className="btn btn-indigo" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleEditQuestionClick(q)}>EDIT</button>
                          <button className="btn btn-danger" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDeleteQuestionClick(q.id)}>DELETE</button>
                        </div>
                      </div>

                      <p style={{ fontWeight: 600, color: '#171717', marginBottom: '0.5rem' }}>{q.questionText}</p>
                      {q.codeSnippet && <pre className="code-snippet" style={{ fontSize: '0.8rem', padding: '0.5rem' }}>{q.codeSnippet}</pre>}

                      <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '0.5rem' }}>
                        Correct Answer: <span className="status-pill status-active" style={{ fontSize: '0.75rem' }}>Option {correctOpt?.optionLetter}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TEAM ROSTER & SESSION RESET (ROUND 1) */}
      {activeTab === 'teams' && (
        <div className="card animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ color: '#25256F', fontSize: '1.3rem', margin: 0 }}>
              Pre-Created Competition Team Slots ({teams.filter((t) => t.isActiveSlot).length} Active)
            </h2>
            <button className="btn btn-danger" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }} onClick={() => setShowConfirmResetAllDisqualified(true)}>
              RESET ALL DISQUALIFIED
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#25256F', color: '#FFFFFF', textAlign: 'left', fontWeight: 700 }}>
                <th style={{ padding: '0.75rem 1rem' }}>Slot #</th>
                <th style={{ padding: '0.75rem 1rem' }}>Team Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Player 1</th>
                <th style={{ padding: '0.75rem 1rem' }}>Player 2</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Round 2 Qualified</th>
                <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.filter((t) => t.isActiveSlot).map((t, idx) => {
                const paddedNum = String(t.teamNumber).padStart(2, '0');
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#34349A' }}>
                      Team {paddedNum}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#171717' }}>
                      {t.teamName} {t.isDisqualified && <span style={{ color: '#D93838', fontWeight: 700 }}>(DQ)</span>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#171717' }}>
                      {t.player1Name || <span style={{ color: '#94A3B8' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#171717' }}>
                      {t.player2Name || <span style={{ color: '#94A3B8' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {t.isDisqualified ? (
                        <span className="status-pill status-ended">DISQUALIFIED</span>
                      ) : t.isClaimed ? (
                        <span className="status-pill status-active">REGISTERED</span>
                      ) : (
                        <span className="status-pill status-pending">AVAILABLE</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {t.isQualifiedForRound2 ? (
                        <span style={{ color: '#176B5B', fontWeight: 700 }}>✅ QUALIFIED</span>
                      ) : (
                        <span style={{ color: '#94A3B8' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {t.isClaimed && (
                          <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleResetSession(t.id, t.teamNumber)}>
                            RESET SESSION
                          </button>
                        )}
                        {!t.isDisqualified ? (
                          <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleDisqualify(t.id)}>
                            DISQUALIFY
                          </button>
                        ) : (
                          <button className="btn btn-teal" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleResetTeamDisqualification(t.id, t.teamNumber)}>
                            RESET DQ
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: ROUND 2 QUALIFICATION & SPLIT SETUP */}
      {activeTab === 'qualification' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div className="card animate-fade-in">
            <h2 style={{ color: '#25256F', fontSize: '1.4rem', marginBottom: '0.5rem' }}>
              ⚡ Round 2 Qualification & Competitor Split Manager
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Qualifying a team automatically carries forward <strong>Player 1</strong> and <strong>Player 2</strong> names from Round 1 registration into individual competitor codes (e.g. <code>07-A</code> and <code>07-B</code>). No manual retyping required.
            </p>

            {/* Quick Batch Qualify & Actions Header */}
            <div style={{ background: '#FFF1DC', padding: '1.25rem', borderRadius: '8px', borderLeft: '5px solid #F58220', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ color: '#25256F', margin: 0, fontSize: '1.1rem' }}>Auto-Qualify Top Performers from Round 1</h3>
                <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
                  Selects top ranked teams from Round 1 standings and provisions individual competitors with auto-carried names.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: '#25256F', fontSize: '0.9rem' }}>Top Teams:</span>
                <input
                  type="number"
                  min={1}
                  max={60}
                  className="form-control"
                  style={{ width: '80px', padding: '0.4rem', color: '#171717', fontWeight: 700 }}
                  value={topNCount}
                  onChange={(e) => setTopNCount(parseInt(e.target.value, 10) || 10)}
                />
                <button className="btn btn-primary" onClick={handleQualifyTopN} disabled={qualifyingAction}>
                  {qualifyingAction ? 'Qualifying...' : `QUALIFY TOP ${topNCount}`}
                </button>
              </div>
            </div>
          </div>

          {/* Qualified Teams Table */}
          <div className="card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ color: '#25256F', fontSize: '1.2rem', margin: 0 }}>
                Teams & Individual Competitor Provisioning
              </h3>
              <span style={{ fontSize: '0.9rem', color: '#171717', fontWeight: 600 }}>
                <strong style={{ color: '#176B5B' }}>{qualifiedTeamsCount}</strong> Teams Qualified | <strong style={{ color: '#34349A' }}>{competitorSlotsCount}</strong> Competitor Slots (<strong style={{ color: '#F58220' }}>{claimedCompetitorsCount}</strong> Claimed)
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#25256F', color: '#FFFFFF', textAlign: 'left', fontWeight: 700 }}>
                  <th style={{ padding: '0.75rem 1rem' }}>TEAM #</th>
                  <th style={{ padding: '0.75rem 1rem' }}>TEAM NAME</th>
                  <th style={{ padding: '0.75rem 1rem' }}>PLAYER 1</th>
                  <th style={{ padding: '0.75rem 1rem' }}>PLAYER 2</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>QUALIFIED?</th>
                  <th style={{ padding: '0.75rem 1rem' }}>ROUND 2 COMPETITORS</th>
                  <th style={{ padding: '0.75rem 1rem' }}>STATUS</th>
                  <th style={{ padding: '0.75rem 1rem' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {qualificationData.teams.map((t, idx) => {
                  const paddedNum = String(t.teamNumber).padStart(2, '0');
                  const p1Comp = t.competitors?.find((c: any) => c.playerPosition === 'A' || c.playerPosition === '1');
                  const p2Comp = t.competitors?.find((c: any) => c.playerPosition === 'B' || c.playerPosition === '2');
                  const p1Name = p1Comp?.playerName || t.player1Name || '—';
                  const p2Name = p2Comp?.playerName || t.player2Name || '—';
                  const isQualified = !!t.isQualifiedForRound2;

                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid #E2E8F0', background: isQualified ? (idx % 2 === 0 ? '#FFFFFF' : '#FFFDF9') : '#F8FAFC' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#34349A' }}>
                        Team {paddedNum}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#171717' }}>
                        {t.teamName}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#171717' }}>
                        {t.player1Name || '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#171717' }}>
                        {t.player2Name || '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isQualified}
                          onChange={() => handleToggleQualifyCheckbox(t)}
                          style={{ cursor: 'pointer', transform: 'scale(1.3)' }}
                        />
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isQualified ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.85rem' }}>
                            <span><strong style={{ color: '#34349A', fontFamily: 'monospace' }}>[{paddedNum}-A]</strong> {p1Name}</span>
                            <span><strong style={{ color: '#34349A', fontFamily: 'monospace' }}>[{paddedNum}-B]</strong> {p2Name}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Not Qualified</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isQualified ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <strong style={{ fontFamily: 'monospace', color: '#34349A' }}>A:</strong>
                              {renderClaimStatusBadge(p1Comp)}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <strong style={{ fontFamily: 'monospace', color: '#34349A' }}>B:</strong>
                              {renderClaimStatusBadge(p2Comp)}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isQualified && (
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button
                              className="btn btn-outline"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => setEditNamesModal({
                                teamId: t.id,
                                teamNumber: t.teamNumber,
                                teamName: t.teamName,
                                p1: p1Comp?.playerName || t.player1Name || '',
                                p2: p2Comp?.playerName || t.player2Name || '',
                              })}
                            >
                              EDIT NAMES
                            </button>
                            {p1Comp?.isClaimed && (
                              <button
                                className="btn btn-outline"
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.75rem',
                                  borderColor: p1Comp.hasStarted ? '#CBD5E1' : '#D93838',
                                  color: p1Comp.hasStarted ? '#94A3B8' : '#D93838',
                                  background: '#FFF',
                                }}
                                disabled={p1Comp.hasStarted}
                                title={p1Comp.hasStarted ? 'Cannot reset claim because this competitor has already started Round 2.' : 'Reset claim for Player A (restore to AVAILABLE)'}
                                onClick={() => setResetClaimModal({
                                  competitorId: p1Comp.id,
                                  competitorCode: p1Comp.competitorCode,
                                  playerName: p1Comp.playerName,
                                  teamNumber: t.teamNumber,
                                  teamName: t.teamName,
                                  teammateCode: p2Comp?.competitorCode,
                                  teammateName: p2Comp?.playerName,
                                })}
                              >
                                RESET A
                              </button>
                            )}
                            {p2Comp?.isClaimed && (
                              <button
                                className="btn btn-outline"
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.75rem',
                                  borderColor: p2Comp.hasStarted ? '#CBD5E1' : '#D93838',
                                  color: p2Comp.hasStarted ? '#94A3B8' : '#D93838',
                                  background: '#FFF',
                                }}
                                disabled={p2Comp.hasStarted}
                                title={p2Comp.hasStarted ? 'Cannot reset claim because this competitor has already started Round 2.' : 'Reset claim for Player B (restore to AVAILABLE)'}
                                onClick={() => setResetClaimModal({
                                  competitorId: p2Comp.id,
                                  competitorCode: p2Comp.competitorCode,
                                  playerName: p2Comp.playerName,
                                  teamNumber: t.teamNumber,
                                  teamName: t.teamName,
                                  teammateCode: p1Comp?.competitorCode,
                                  teammateName: p1Comp?.playerName,
                                })}
                              >
                                RESET B
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ROUND 2 INDIVIDUAL COMPETITOR SLOTS DIRECT MANAGER */}
          {qualificationData.competitors.length > 0 && (
            <div style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '2px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ color: '#25256F', fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>
                  👤 Round 2 Individual Competitor Slots ({qualificationData.competitors.length})
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
                  {claimedCompetitorsCount} of {competitorSlotsCount} slots claimed
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: '#34349A', color: '#FFFFFF', textAlign: 'left', fontWeight: 700 }}>
                      <th style={{ padding: '0.6rem 1rem' }}>CODE</th>
                      <th style={{ padding: '0.6rem 1rem' }}>PLAYER NAME</th>
                      <th style={{ padding: '0.6rem 1rem' }}>ORIGINAL TEAM</th>
                      <th style={{ padding: '0.6rem 1rem' }}>CLAIM STATUS</th>
                      <th style={{ padding: '0.6rem 1rem' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qualificationData.competitors.map((comp: any, cIdx: number) => {
                      const partner = qualificationData.competitors.find(
                        (o: any) => o.originalTeamId === comp.originalTeamId && o.id !== comp.id
                      );
                      return (
                        <tr key={comp.id} style={{ borderBottom: '1px solid #E2E8F0', background: cIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC' }}>
                          <td style={{ padding: '0.6rem 1rem', fontFamily: 'monospace', fontWeight: 800, color: '#34349A', fontSize: '0.95rem' }}>
                            [{comp.competitorCode}]
                          </td>
                          <td style={{ padding: '0.6rem 1rem', fontWeight: 700, color: '#171717' }}>
                            {comp.playerName}
                          </td>
                          <td style={{ padding: '0.6rem 1rem', color: '#475569' }}>
                            Team {String(comp.originalTeam?.teamNumber || 0).padStart(2, '0')} ({comp.originalTeam?.teamName || `Team ${comp.originalTeam?.teamNumber}`})
                          </td>
                          <td style={{ padding: '0.6rem 1rem' }}>
                            {renderClaimStatusBadge(comp)}
                          </td>
                          <td style={{ padding: '0.6rem 1rem' }}>
                            {comp.isClaimed ? (
                              <button
                                className="btn btn-outline"
                                style={{
                                  padding: '0.25rem 0.6rem',
                                  fontSize: '0.75rem',
                                  borderColor: comp.hasStarted ? '#CBD5E1' : '#D93838',
                                  color: comp.hasStarted ? '#94A3B8' : '#D93838',
                                  background: '#FFF',
                                }}
                                disabled={comp.hasStarted}
                                title={comp.hasStarted ? 'Cannot reset claim because this competitor has already started Round 2.' : 'Release claim on this slot and return to AVAILABLE'}
                                onClick={() => setResetClaimModal({
                                  competitorId: comp.id,
                                  competitorCode: comp.competitorCode,
                                  playerName: comp.playerName,
                                  teamNumber: comp.originalTeam?.teamNumber || 0,
                                  teamName: comp.originalTeam?.teamName || '',
                                  teammateCode: partner?.competitorCode,
                                  teammateName: partner?.playerName,
                                })}
                              >
                                RESET CLAIM
                              </button>
                            ) : (
                              <span style={{ color: '#16A34A', fontSize: '0.75rem', fontWeight: 600 }}>
                                Available
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ANTI-CHEAT LOGS & INDIVIDUAL COMPETITOR CONTROLS */}
      {activeTab === 'anticheat' && (
        <div className="card animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ color: '#D93838', margin: 0, fontSize: '1.3rem' }}>
              Live Anti-Cheat Feed & Violations
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={`btn ${acFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}
                onClick={() => setAcFilter('all')}
              >
                ALL ({antiCheatLogs.length})
              </button>
              <button
                className={`btn ${acFilter === 'round1' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}
                onClick={() => setAcFilter('round1')}
              >
                ROUND 1 ({antiCheatLogs.filter((l) => !l.competitorId).length})
              </button>
              <button
                className={`btn ${acFilter === 'round2' ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}
                onClick={() => setAcFilter('round2')}
              >
                ROUND 2 ({antiCheatLogs.filter((l) => !!l.competitorId).length})
              </button>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#25256F', color: '#FFFFFF', textAlign: 'left', fontWeight: 700 }}>
                <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                <th style={{ padding: '0.75rem 1rem' }}>Player / Team</th>
                <th style={{ padding: '0.75rem 1rem' }}>Code</th>
                <th style={{ padding: '0.75rem 1rem' }}>Original Team</th>
                <th style={{ padding: '0.75rem 1rem' }}>Violation Type</th>
                <th style={{ padding: '0.75rem 1rem' }}>Details</th>
                <th style={{ padding: '0.75rem 1rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748B', fontStyle: 'italic' }}>
                    No anti-cheat violations logged for this view.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => {
                  const isR2 = !!log.competitor;
                  const playerName = log.competitor?.playerName || '—';
                  const compCode = log.competitor?.competitorCode || '—';
                  const origTeamNumber = log.competitor?.originalTeam?.teamNumber || log.team?.teamNumber;
                  const origTeamName = log.competitor?.originalTeam?.teamName || log.team?.teamName || '—';
                  const isCompetitorDq = log.competitor?.isDisqualified;
                  const isTeamDq = log.team?.isDisqualified;

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFFFFF' : '#FFF5F5' }}>
                      <td style={{ padding: '0.75rem 1rem', color: '#171717', fontWeight: 600 }}>{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#D93838' }}>
                        {isR2 ? playerName : (log.team?.teamName || 'Team')}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#34349A' }}>
                        {isR2 ? compCode : (origTeamNumber ? `Team ${String(origTeamNumber).padStart(2, '0')}` : '—')}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#171717', fontWeight: 600 }}>
                        Team {String(origTeamNumber || 0).padStart(2, '0')}: {origTeamName}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#171717' }}>{log.violationType}</td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#34349A', fontSize: '0.75rem' }}>{JSON.stringify(log.metadata)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {isR2 ? (
                          isCompetitorDq ? (
                            <button
                              className="btn btn-teal"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => setResetCompetitorDqModal({
                                competitorId: log.competitor.id,
                                competitorCode: log.competitor.competitorCode,
                                playerName: log.competitor.playerName,
                              })}
                            >
                              RESET DQ
                            </button>
                          ) : (
                            <button
                              className="btn btn-danger"
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              onClick={() => {
                                const code = log.competitor.competitorCode;
                                const partner = code.endsWith('-A') ? code.replace('-A', '-B') : code.replace('-B', '-A');
                                setDqCompetitorModal({
                                  competitorId: log.competitor.id,
                                  competitorCode: code,
                                  playerName: log.competitor.playerName,
                                  partnerCode: partner,
                                });
                              }}
                            >
                              DISQUALIFY
                            </button>
                          )
                        ) : (
                          log.team && (
                            isTeamDq ? (
                              <button
                                className="btn btn-teal"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => handleResetTeamDisqualification(log.team.id, log.team.teamNumber)}
                              >
                                RESET DQ
                              </button>
                            ) : (
                              <button
                                className="btn btn-danger"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                onClick={() => handleDisqualify(log.team.id)}
                              >
                                DISQUALIFY
                              </button>
                            )
                          )
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 6: SCORING & RESULTS (HIGH CONTRAST THEME) */}
      {activeTab === 'results' && (
        <div>
          <div className="card animate-fade-in" style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ color: '#25256F', fontSize: '1.4rem' }}>
                  Server-Side Standings & Leaderboard ({isRound2 ? 'Round 2: Individual Competitors' : 'Round 1: Team Standings'})
                </h2>
                <p style={{ color: '#64748B', fontSize: '0.85rem' }}>
                  Official Ranking Rule: Score DESC → Submission Time ASC → ID ASC.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  className="form-control"
                  style={{ width: '180px', color: '#171717', fontWeight: 700 }}
                  value={selectedRoundId}
                  onChange={(e) => setSelectedRoundId(e.target.value)}
                >
                  {[...(room?.rounds || [])].sort((a: any, b: any) => (a.roundNumber || 0) - (b.roundNumber || 0)).map((r: any) => (
                    <option key={r.id} value={r.id}>
                      Round {r.roundNumber}: {r.roundName}
                    </option>
                  ))}
                </select>

                <button className="btn btn-primary" onClick={() => setShowConfirmCalc(true)} disabled={calculating}>
                  {calculating ? 'Calculating...' : 'CALCULATE RESULTS'}
                </button>

                {/* REQUIREMENT 1: PUBLISH RESULTS is ONLY available for Round 1 (SYNTRACE) */}
                {!isRound2 && (
                  <button
                    className="btn btn-teal"
                    onClick={handleOpenPublishModal}
                    title={qualifiedTeamsCount === 0 ? 'Complete Round 2 qualification before publishing Round 1 results.' : 'Publish qualification results to participants'}
                    disabled={qualifiedTeamsCount === 0}
                    style={{
                      opacity: qualifiedTeamsCount === 0 ? 0.6 : 1,
                      cursor: qualifiedTeamsCount === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    PUBLISH RESULTS
                  </button>
                )}

                <button className="btn btn-danger" onClick={() => setShowConfirmResetStandings(true)}>
                  RESET STANDINGS
                </button>
              </div>
            </div>
          </div>

          <div className="card animate-fade-in">
            <h3 style={{ color: '#25256F', marginBottom: '1rem' }}>
              {isRound2 ? 'Round 2 Individual Competitor Standings' : 'Round 1 Team Official Standings'}
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#25256F', color: '#FFFFFF', textAlign: 'left', fontWeight: 700 }}>
                  <th style={{ padding: '0.75rem 1rem' }}>RANK</th>
                  {isRound2 ? (
                    <>
                      <th style={{ padding: '0.75rem 1rem' }}>PLAYER NAME</th>
                      <th style={{ padding: '0.75rem 1rem' }}>COMPETITOR CODE</th>
                      <th style={{ padding: '0.75rem 1rem' }}>ORIGINAL TEAM #</th>
                      <th style={{ padding: '0.75rem 1rem' }}>ORIGINAL TEAM NAME</th>
                    </>
                  ) : (
                    <>
                      <th style={{ padding: '0.75rem 1rem' }}>TEAM #</th>
                      <th style={{ padding: '0.75rem 1rem' }}>TEAM NAME</th>
                    </>
                  )}
                  <th style={{ padding: '0.75rem 1rem' }}>SCORE</th>
                  <th style={{ padding: '0.75rem 1rem' }}>CORRECT</th>
                  <th style={{ padding: '0.75rem 1rem' }}>WRONG</th>
                  <th style={{ padding: '0.75rem 1rem' }}>UNANSWERED</th>
                  <th style={{ padding: '0.75rem 1rem' }}>SUBMISSION TIME</th>
                  {isRound2 && <th style={{ padding: '0.75rem 1rem' }}>STATUS</th>}
                  <th style={{ padding: '0.75rem 1rem' }}>VIEW PAPER</th>
                </tr>
              </thead>
              <tbody>
                {activeLeaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={isRound2 ? 12 : 9} style={{ padding: '2rem', textAlign: 'center', color: '#64748B', fontStyle: 'italic' }}>
                      No results calculated yet for this round. Click "CALCULATE RESULTS" once participants have submitted.
                    </td>
                  </tr>
                ) : (
                  activeLeaderboard.map((item) => {
                    const entityId = item.competitorId || item.teamId;
                    const playerName = item.playerName || item.competitor?.playerName || 'Individual Competitor';
                    const competitorCode = item.competitorCode || item.competitor?.competitorCode || '—';
                    const originalTeamNum = item.originalTeamNumber || item.competitor?.originalTeam?.teamNumber;
                    const originalTeamName = item.originalTeamName || item.competitor?.originalTeam?.teamName || (originalTeamNum ? `Team ${String(originalTeamNum).padStart(2, '0')}` : '—');
                    const teamNum = item.teamNumber || item.team?.teamNumber;
                    const teamName = item.teamName || item.team?.teamName || (teamNum ? `Team ${String(teamNum).padStart(2, '0')}` : '—');

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #E2E8F0', background: '#FFFFFF' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#F58220' }}>
                          #{item.rank}
                        </td>

                        {isRound2 ? (
                          <>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#171717' }}>
                              {playerName}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#34349A' }}>
                              {competitorCode}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#34349A' }}>
                              Team {String(originalTeamNum || 0).padStart(2, '0')}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#171717' }}>
                              {originalTeamName}
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#34349A' }}>
                              Team {String(teamNum || 0).padStart(2, '0')}
                            </td>
                            <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#171717' }}>
                              {teamName}
                            </td>
                          </>
                        )}

                        <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#25256F', fontSize: '1.05rem' }}>
                          {item.score} pts
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#176B5B', fontWeight: 700 }}>+{item.correctCount ?? item.totalCorrect}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#D93838', fontWeight: 700 }}>-{item.wrongCount ?? item.totalWrong}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#64748B', fontWeight: 600 }}>{item.unansweredCount ?? item.totalUnanswered}</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#171717', fontWeight: 600 }}>
                          {item.formattedTime || (item.submittedAt ? new Date(item.submittedAt).toLocaleTimeString() : '—')}
                        </td>
                        {isRound2 && (
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span className="status-pill status-active" style={{ fontSize: '0.75rem' }}>
                              {item.status || 'SUBMITTED'}
                            </span>
                          </td>
                        )}
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <button className="btn btn-outline" style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleViewAnswerPaper(entityId)}>
                            VIEW PAPER
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* DISQUALIFIED COMPETITORS TABLE (ROUND 2) */}
          {isRound2 && dqCompetitors.length > 0 && (
            <div className="card animate-fade-in" style={{ marginTop: '1.5rem', borderTop: '4px solid #D93838' }}>
              <h3 style={{ color: '#D93838', marginBottom: '0.5rem' }}>
                DISQUALIFIED COMPETITORS ({dqCompetitors.length})
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '1rem' }}>
                These competitors were disqualified individually. They are excluded from ranking, but their submitted answers and anti-cheat logs are preserved for inspection.
              </p>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#7F1D1D', color: '#FFFFFF', textAlign: 'left', fontWeight: 700 }}>
                    <th style={{ padding: '0.75rem 1rem' }}>PLAYER NAME</th>
                    <th style={{ padding: '0.75rem 1rem' }}>COMPETITOR CODE</th>
                    <th style={{ padding: '0.75rem 1rem' }}>ORIGINAL TEAM #</th>
                    <th style={{ padding: '0.75rem 1rem' }}>ORIGINAL TEAM NAME</th>
                    <th style={{ padding: '0.75rem 1rem' }}>REASON</th>
                    <th style={{ padding: '0.75rem 1rem' }}>VIOLATIONS</th>
                    <th style={{ padding: '0.75rem 1rem' }}>SCORE AT DQ</th>
                    <th style={{ padding: '0.75rem 1rem' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {dqCompetitors.map((item, idx) => {
                    const entityId = item.competitorId || item.id;
                    const playerName = item.playerName || item.competitor?.playerName || 'Individual Competitor';
                    const compCode = item.competitorCode || item.competitor?.competitorCode || '—';
                    const origTeamNum = item.originalTeamNumber || item.competitor?.originalTeam?.teamNumber;
                    const origTeamName = item.originalTeamName || item.competitor?.originalTeam?.teamName || '—';

                    return (
                      <tr key={entityId || idx} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#FFF5F5' : '#FEF2F2' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#D93838' }}>{playerName}</td>
                        <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: '#34349A' }}>{compCode}</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#34349A' }}>Team {String(origTeamNum || 0).padStart(2, '0')}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#171717', fontWeight: 600 }}>{origTeamName}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#D93838', fontWeight: 600, fontSize: '0.85rem' }}>{item.disqualifiedReason || 'Anti-cheat violation'}</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#D93838' }}>{item.antiCheatViolationCount ?? '—'}</td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 800, color: '#25256F' }}>{item.score} pts</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-outline"
                              style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                              onClick={() => handleViewAnswerPaper(entityId)}
                            >
                              VIEW PAPER
                            </button>
                            <button
                              className="btn btn-teal"
                              style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                              onClick={() => setResetCompetitorDqModal({
                                competitorId: entityId,
                                competitorCode: compCode,
                                playerName: playerName,
                              })}
                            >
                              RESET DQ
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: DEV / TEST ROOM CONTROLS */}
      {activeTab === 'devroom' && enableTestRoom && (
        <div className="card animate-fade-in card-dark" style={{ borderTop: '6px solid #F58220' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ color: '#FFF1DC', fontSize: '1.4rem' }}>🛠️ Hidden Development & Test Room (TEST26)</h2>
              <p style={{ color: '#A0A0C0', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                Internal testing room enabled via ENABLE_TEST_ROOM=true. Hidden from production users.
              </p>
            </div>

            <button className="btn btn-danger" onClick={() => setShowConfirmResetTest(true)}>
              RESET TEST ROOM
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#1E1E38', padding: '1rem', borderRadius: '8px', border: '1px solid #34349A' }}>
              <span style={{ fontSize: '0.8rem', color: '#82AAFF' }}>TEST ROOM CODE</span>
              <h3 style={{ fontSize: '1.5rem', color: '#FFF1DC', marginTop: '0.2rem' }}>TEST26</h3>
            </div>

            <div style={{ background: '#1E1E38', padding: '1rem', borderRadius: '8px', border: '1px solid #34349A' }}>
              <span style={{ fontSize: '0.8rem', color: '#82AAFF' }}>TEST DURATION</span>
              <h3 style={{ fontSize: '1.5rem', color: '#FFF1DC', marginTop: '0.2rem' }}>5 Minutes</h3>
            </div>

            <div style={{ background: '#1E1E38', padding: '1rem', borderRadius: '8px', border: '1px solid #34349A' }}>
              <span style={{ fontSize: '0.8rem', color: '#82AAFF' }}>SAMPLE QUESTIONS</span>
              <h3 style={{ fontSize: '1.5rem', color: '#FFF1DC', marginTop: '0.2rem' }}>3 Pre-Seeded</h3>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', border: '1px dashed #F58220', fontSize: '0.85rem', color: '#FFF1DC' }}>
            📌 <strong>Tester Instructions:</strong>
            <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', lineHeight: '1.6' }}>
              <li>Open participant homepage in an incognito window or second browser.</li>
              <li>Manually type <code>TEST26</code> in the Room Code input field.</li>
              <li>Claim a team slot, complete the 3 test questions, and submit.</li>
              <li>Use <strong>"RESET TEST ROOM"</strong> to clear test submissions and restart test cycles.</li>
            </ul>
          </div>
        </div>
      )}

      {/* EDIT PLAYER NAMES MODAL (ROUND 2 QUALIFICATION) */}
      {editNamesModal && (
        <div className="anti-cheat-modal">
          <div className="anti-cheat-box" style={{ borderColor: '#34349A', animation: 'none', maxWidth: '500px' }}>
            <h3 style={{ color: '#25256F', marginBottom: '1rem' }}>
              Edit Player Names — Team {String(editNamesModal.teamNumber).padStart(2, '0')}: {editNamesModal.teamName}
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '1.2rem' }}>
              Correct spelling or participant names before Round 2 starts. These will update competitor records and participant login cards.
            </p>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ color: '#25256F', fontWeight: 700 }}>
                Player 1 Name (Code: {String(editNamesModal.teamNumber).padStart(2, '0')}-A)
              </label>
              <input
                type="text"
                className="form-control"
                value={editNamesModal.p1}
                onChange={(e) => setEditNamesModal({ ...editNamesModal, p1: e.target.value })}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ color: '#25256F', fontWeight: 700 }}>
                Player 2 Name (Code: {String(editNamesModal.teamNumber).padStart(2, '0')}-B)
              </label>
              <input
                type="text"
                className="form-control"
                value={editNamesModal.p2}
                onChange={(e) => setEditNamesModal({ ...editNamesModal, p2: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setEditNamesModal(null)}>
                CANCEL
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveEditedNames}>
                SAVE PLAYER NAMES
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISQUALIFY INDIVIDUAL COMPETITOR CONFIRMATION MODAL */}
      {dqCompetitorModal && (
        <div className="anti-cheat-modal">
          <div className="anti-cheat-box" style={{ borderColor: '#D93838', animation: 'none', maxWidth: '520px' }}>
            <h3 style={{ color: '#D93838', marginBottom: '1rem' }}>
              Disqualify Competitor from Round 2?
            </h3>
            <p style={{ color: '#171717', marginBottom: '1rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Disqualify <strong>{dqCompetitorModal.playerName} ({dqCompetitorModal.competitorCode})</strong> from Round 2?
            </p>
            <div style={{ background: '#FFF1DC', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.2rem', color: '#25256F', fontSize: '0.85rem' }}>
              ⚠️ This will freeze their answer sheet and exclude them from ranking.
              <br />
              Their partner <strong>({dqCompetitorModal.partnerCode})</strong> and original team will <strong>NOT</strong> be affected.
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ color: '#25256F', fontWeight: 700 }}>Disqualification Reason</label>
              <input
                type="text"
                className="form-control"
                value={dqReasonInput}
                onChange={(e) => setDqReasonInput(e.target.value)}
                placeholder="e.g. Tab switch violation, Phone usage"
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDqCompetitorModal(null)}>
                CANCEL
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleDisqualifyCompetitor}>
                DISQUALIFY COMPETITOR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET INDIVIDUAL COMPETITOR DISQUALIFICATION CONFIRMATION MODAL */}
      {resetCompetitorDqModal && (
        <div className="anti-cheat-modal">
          <div className="anti-cheat-box" style={{ borderColor: '#176B5B', animation: 'none', maxWidth: '480px' }}>
            <h3 style={{ color: '#176B5B', marginBottom: '1rem' }}>
              Reset Disqualification?
            </h3>
            <p style={{ color: '#171717', marginBottom: '1.2rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Reset disqualification for <strong>{resetCompetitorDqModal.playerName} ({resetCompetitorDqModal.competitorCode})</strong>?
              This will restore their eligibility and include them in official standings calculation.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setResetCompetitorDqModal(null)}>
                CANCEL
              </button>
              <button className="btn btn-teal" style={{ flex: 1 }} onClick={handleResetCompetitorDisqualification}>
                RESET DISQUALIFICATION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PARTIAL ATTENDANCE START CONFIRMATION MODAL */}
      {startRoundConfirm && (
        <div className="anti-cheat-modal">
          <div className="anti-cheat-box" style={{ borderColor: '#F58220', animation: 'none' }}>
            <h3 style={{ color: '#25256F', marginBottom: '1rem' }}>
              Confirm Round Start — Partial Attendance
            </h3>
            <p style={{ color: '#555', marginBottom: '1.2rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
              You are starting <strong>Round {startRoundConfirm.roundNumber}: {startRoundConfirm.roundName}</strong>.
            </p>
            <div style={{ background: '#FFF1DC', padding: '0.8rem', borderRadius: '6px', marginBottom: '1.5rem', color: '#25256F', fontWeight: 600 }}>
              ⚠️ Only <strong>{startRoundConfirm.claimedCount}</strong> of <strong>{startRoundConfirm.totalCount}</strong> participants/teams have registered.
              <br />
              Do you want to start the round anyway?
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setStartRoundConfirm(null)}>
                CANCEL
              </button>
              <button className="btn btn-teal" style={{ flex: 1 }} onClick={() => executeStartRound(startRoundConfirm.roundId)}>
                START ANYWAY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CALCULATE RESULTS CONFIRMATION MODAL */}
      {showConfirmCalc && (
        <div className="anti-cheat-modal">
          <div className="anti-cheat-box" style={{ borderColor: '#34349A', animation: 'none' }}>
            <h3 style={{ color: '#25256F', marginBottom: '1rem' }}>Calculate Results Confirmation</h3>
            <p style={{ color: '#555', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Calculate official scores and generate ranks for this round? This will compare all submissions against master correct answers using score DESC, submission time ASC, and team/competitor code ASC.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowConfirmCalc(false)}>
                CANCEL
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleExecuteCalculateResults}>
                CALCULATE NOW
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET TEST ROOM CONFIRMATION MODAL */}
      {showConfirmResetTest && (
        <div className="anti-cheat-modal">
          <div className="anti-cheat-box" style={{ borderColor: '#D93838', animation: 'none' }}>
            <h3 style={{ color: '#D93838', marginBottom: '1rem' }}>Reset TEST26 Dev Room?</h3>
            <p style={{ color: '#555', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              This will clear test participant sessions, answers, scores, and anti-cheat logs for the TEST26 room while preserving sample test questions.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowConfirmResetTest(false)}>
                CANCEL
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleExecuteResetTestRoom}>
                RESET TEST ROOM
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET ALL DISQUALIFIED CONFIRMATION MODAL */}
      {showConfirmResetAllDisqualified && (
        <div className="anti-cheat-modal">
          <div className="anti-cheat-box" style={{ borderColor: '#D93838', animation: 'none' }}>
            <h3 style={{ color: '#D93838', marginBottom: '1rem' }}>Reset All Disqualified Teams?</h3>
            <p style={{ color: '#555', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Reset all disqualified teams in {room?.roomCode || 'the competition room'}? This will restore team eligibility while preserving submitted answers, scores, and anti-cheat history.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowConfirmResetAllDisqualified(false)}>
                CANCEL
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleExecuteResetAllDisqualified}>
                RESET TEAMS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET OFFICIAL STANDINGS CONFIRMATION MODAL */}
      {showConfirmResetStandings && (
        <div className="anti-cheat-modal">
          <div className="anti-cheat-box" style={{ borderColor: '#D93838', animation: 'none' }}>
            <h3 style={{ color: '#D93838', marginBottom: '1rem' }}>Reset Official Standings?</h3>
            <p style={{ color: '#555', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Reset Official Standings for this round? This will clear calculated scores/rankings/results publication state. Team registrations and submitted answers will be preserved for fresh recalculation.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowConfirmResetStandings(false)}>
                CANCEL
              </button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleExecuteResetStandings}>
                RESET STANDINGS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PUBLISH ROUND 1 QUALIFICATION RESULTS CONFIRMATION MODAL */}
      {showConfirmPublishModal && (
        <div className="modal-overlay animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget && !publishing) setShowConfirmPublishModal(false); }}>
          <div className="modal-card" style={{ maxWidth: '560px', borderTop: '6px solid #176B5B' }}>
            <h3 style={{ color: '#25256F', fontSize: '1.4rem', fontWeight: 800, marginBottom: '1rem' }}>
              PUBLISH ROUND 1 RESULTS?
            </h3>
            <p style={{ color: '#171717', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '0.75rem' }}>
              Participants will be able to see whether they <strong>QUALIFIED</strong> or <strong>DID NOT QUALIFY</strong> for Round 2.
            </p>
            <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
              Scores, rankings and answer papers will remain hidden from participants.
            </p>
            <div style={{ background: '#E6F6F3', padding: '0.85rem 1rem', borderRadius: '8px', borderLeft: '4px solid #176B5B', marginBottom: '1.5rem', color: '#176B5B', fontSize: '0.875rem', fontWeight: 600 }}>
              This action will publish qualification decisions to all Round 1 participants.
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} disabled={publishing} onClick={() => setShowConfirmPublishModal(false)}>
                CANCEL
              </button>
              <button className="btn btn-primary" style={{ flex: 1, background: '#176B5B', borderColor: '#176B5B' }} disabled={publishing} onClick={handleExecutePublishResults}>
                {publishing ? 'PUBLISHING...' : 'PUBLISH RESULTS'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ANSWER PAPER INSPECTION MODAL */}
      {inspectPaper && (
        <div className="anti-cheat-modal">
          <div className="anti-cheat-box" style={{ maxWidth: '850px', textAlign: 'left', maxHeight: '85vh', overflowY: 'auto' }}>
            {inspectPaper.isRound2 ? (
              <div style={{ marginBottom: '1rem', borderBottom: '2px solid #E2E8F0', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ color: '#25256F', fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                      ROUND 2 ANSWER PAPER — {inspectPaper.playerName || inspectPaper.competitor?.playerName}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '0.5rem 1.5rem', marginTop: '0.75rem', fontSize: '0.9rem' }}>
                      <div><span style={{ color: '#64748B' }}>PLAYER NAME:</span> <strong style={{ color: '#171717' }}>{inspectPaper.playerName || inspectPaper.competitor?.playerName}</strong></div>
                      <div><span style={{ color: '#64748B' }}>COMPETITOR CODE:</span> <strong style={{ color: '#34349A', fontFamily: 'monospace' }}>{inspectPaper.competitorCode || inspectPaper.competitor?.competitorCode}</strong></div>
                      <div><span style={{ color: '#64748B' }}>ORIGINAL TEAM #:</span> <strong style={{ color: '#34349A' }}>Team {String(inspectPaper.originalTeamNumber || inspectPaper.competitor?.originalTeamNumber).padStart(2, '0')}</strong></div>
                      <div><span style={{ color: '#64748B' }}>ORIGINAL TEAM NAME:</span> <strong style={{ color: '#171717' }}>{inspectPaper.originalTeamName || inspectPaper.competitor?.originalTeamName}</strong></div>
                      <div><span style={{ color: '#64748B' }}>ROUND:</span> <strong style={{ color: '#25256F' }}>{inspectPaper.roundName || 'DEBUGNOVA'}</strong></div>
                      <div><span style={{ color: '#64748B' }}>SCORE:</span> <strong style={{ color: '#25256F', fontSize: '1.05rem' }}>{inspectPaper.score} pts</strong> ({inspectPaper.rank ? `Rank #${inspectPaper.rank}` : 'Unranked / DQ'})</div>
                      <div><span style={{ color: '#64748B' }}>SUBMITTED AT:</span> <strong style={{ color: '#171717' }}>{inspectPaper.submittedAt ? new Date(inspectPaper.submittedAt).toLocaleTimeString() : 'N/A'}</strong></div>
                      <div><span style={{ color: '#64748B' }}>STATUS:</span> <strong style={{ color: inspectPaper.isDisqualified ? '#D93838' : '#176B5B' }}>{inspectPaper.isDisqualified ? `DISQUALIFIED (${inspectPaper.disqualifiedReason || 'Rule violation'})` : 'ELIGIBLE'}</strong></div>
                      <div><span style={{ color: '#64748B' }}>ANTI-CHEAT VIOLATIONS:</span> <strong style={{ color: (inspectPaper.antiCheatViolationCount || 0) > 0 ? '#D93838' : '#176B5B' }}>{inspectPaper.antiCheatViolationCount ?? 0} logged</strong></div>
                    </div>
                  </div>
                  <button className="btn btn-outline" onClick={() => setInspectPaper(null)}>✕ Close</button>
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: '1rem', borderBottom: '2px solid #E2E8F0', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ color: '#25256F', fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>
                      ROUND 1 ANSWER PAPER — Team {String(inspectPaper.team?.teamNumber || 0).padStart(2, '0')}: {inspectPaper.team?.teamName}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '0.5rem 1.5rem', marginTop: '0.75rem', fontSize: '0.9rem' }}>
                      <div><span style={{ color: '#64748B' }}>TEAM #:</span> <strong style={{ color: '#34349A' }}>Team {String(inspectPaper.team?.teamNumber || 0).padStart(2, '0')}</strong></div>
                      <div><span style={{ color: '#64748B' }}>TEAM NAME:</span> <strong style={{ color: '#171717' }}>{inspectPaper.team?.teamName}</strong></div>
                      <div><span style={{ color: '#64748B' }}>ROUND:</span> <strong style={{ color: '#25256F' }}>{inspectPaper.roundName || 'SYNTRACE'}</strong></div>
                      <div><span style={{ color: '#64748B' }}>SCORE:</span> <strong style={{ color: '#25256F', fontSize: '1.05rem' }}>{inspectPaper.score} pts</strong> ({inspectPaper.rank ? `Rank #${inspectPaper.rank}` : 'Unranked'})</div>
                      <div><span style={{ color: '#64748B' }}>SUBMITTED AT:</span> <strong style={{ color: '#171717' }}>{inspectPaper.submittedAt ? new Date(inspectPaper.submittedAt).toLocaleTimeString() : 'N/A'}</strong></div>
                    </div>
                  </div>
                  <button className="btn btn-outline" onClick={() => setInspectPaper(null)}>✕ Close</button>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gap: '1rem' }}>
              {inspectPaper.answerPaper?.map((item: any) => (
                <div key={item.questionNumber} style={{ padding: '1rem', borderRadius: '8px', background: item.status === 'CORRECT' ? '#E6F6F3' : item.status === 'WRONG' ? '#FDF2F2' : '#F1F5F9', borderLeft: `5px solid ${item.status === 'CORRECT' ? '#176B5B' : item.status === 'WRONG' ? '#D93838' : '#94A3B8'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong style={{ color: '#171717' }}>Q{item.questionNumber}: {item.questionText}</strong>
                    <span className={`status-pill ${item.status === 'CORRECT' ? 'status-active' : 'status-ended'}`} style={{ background: item.status === 'CORRECT' ? '#176B5B' : item.status === 'WRONG' ? '#D93838' : '#94A3B8', color: '#FFF' }}>
                      {item.status}
                    </span>
                  </div>

                  {item.codeSnippet && <pre className="code-snippet" style={{ fontSize: '0.8rem' }}>{item.codeSnippet}</pre>}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                    <div><span style={{ color: '#64748B' }}>Participant Answer:</span> <strong style={{ color: '#171717' }}>{item.selectedAnswer}</strong></div>
                    <div><span style={{ color: '#64748B' }}>Correct Answer:</span> <strong style={{ color: '#176B5B' }}>{item.correctAnswer}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RESET ROUND 2 CLAIM CONFIRMATION MODAL */}
      {resetClaimModal && (
        <div className="modal-overlay animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget && !resettingClaim) setResetClaimModal(null); }}>
          <div className="modal-card" style={{ maxWidth: '520px', borderTop: '6px solid #D93838' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.8rem' }}>⚠️</span>
              <h3 style={{ color: '#25256F', fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
                RESET ROUND 2 CLAIM?
              </h3>
            </div>
            <div style={{ background: '#FFFDF9', border: '1px solid #FFE4C4', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ marginBottom: '0.4rem' }}>
                <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Competitor Slot: </span>
                <strong style={{ fontFamily: 'monospace', color: '#34349A', fontSize: '1rem' }}>[{resetClaimModal.competitorCode}]</strong>{' '}
                <strong style={{ color: '#171717', fontSize: '1rem' }}>{resetClaimModal.playerName}</strong>
              </div>
              <div style={{ marginBottom: '0.4rem' }}>
                <span style={{ color: '#64748B', fontSize: '0.85rem' }}>Original Team: </span>
                <strong style={{ color: '#171717' }}>Team {String(resetClaimModal.teamNumber).padStart(2, '0')} ({resetClaimModal.teamName})</strong>
              </div>
              {resetClaimModal.teammateCode && (
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #E2E8F0', color: '#176B5B', fontSize: '0.85rem' }}>
                  ✅ Teammate <strong>[{resetClaimModal.teammateCode}] {resetClaimModal.teammateName}</strong> and team qualification will remain completely unaffected.
                </div>
              )}
            </div>
            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              This action will revoke the device claim on this slot and restore it to <strong>AVAILABLE</strong>.
              The old browser session will be immediately disconnected. The participant can re-select the correct player identity.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-outline"
                disabled={resettingClaim}
                onClick={() => setResetClaimModal(null)}
                style={{ padding: '0.5rem 1rem' }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ background: '#D93838', borderColor: '#D93838', padding: '0.5rem 1.25rem' }}
                disabled={resettingClaim}
                onClick={handleResetCompetitorClaim}
              >
                {resettingClaim ? 'RESETTING...' : 'Confirm Reset Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
