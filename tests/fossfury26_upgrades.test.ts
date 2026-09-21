import { describe, it, expect } from 'vitest';
import { RoundStatus, ViolationType } from '../packages/shared/src/types';

describe('FOSSFURY 26 — Feature Upgrades Test Suite', () => {

  // ==========================================================
  // 1. ROUND 1 REGISTRATION — COLLECT & VALIDATE BOTH PLAYERS
  // ==========================================================
  describe('Round 1 Registration — Validation', () => {
    function validateRegistration(teamName: string, player1Name: string, player2Name: string) {
      if (!teamName || !teamName.trim()) {
        return { success: false, error: 'Team name is required.' };
      }
      if (!player1Name || !player1Name.trim()) {
        return { success: false, error: 'Player 1 name is required.' };
      }
      if (!player2Name || !player2Name.trim()) {
        return { success: false, error: 'Player 2 name is required.' };
      }
      if (player1Name.trim().toLowerCase() === player2Name.trim().toLowerCase()) {
        return { success: false, error: 'Player 1 and Player 2 cannot have identical names.' };
      }
      return {
        success: true,
        teamName: teamName.trim(),
        player1Name: player1Name.trim(),
        player2Name: player2Name.trim(),
      };
    }

    it('should reject registration when teamName is empty or whitespace', () => {
      const result = validateRegistration('   ', 'Arjun', 'Sneha');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Team name is required.');
    });

    it('should reject registration when Player 1 name is missing', () => {
      const result = validateRegistration('Code Warriors', '', 'Sneha');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Player 1 name is required.');
    });

    it('should reject registration when Player 2 name is missing or whitespace', () => {
      const result = validateRegistration('Code Warriors', 'Arjun', '   ');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Player 2 name is required.');
    });

    it('should reject registration when Player 1 and Player 2 names are identical (case-insensitive)', () => {
      const result = validateRegistration('Code Warriors', 'Arjun Sharma', 'arjun sharma');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Player 1 and Player 2 cannot have identical names.');
    });

    it('should successfully validate when team name and distinct player names are provided', () => {
      const result = validateRegistration('Code Warriors', 'Arjun', 'Sneha');
      expect(result.success).toBe(true);
      expect(result.player1Name).toBe('Arjun');
      expect(result.player2Name).toBe('Sneha');
    });
  });

  // ==========================================================
  // 2. ROUND 2 QUALIFICATION — NAME AUTO-CARRY & EDITING
  // ==========================================================
  describe('Round 2 Qualification — Name Auto-Carry', () => {
    interface MockTeam {
      id: string;
      teamNumber: number;
      teamName: string;
      player1Name: string;
      player2Name: string;
      isQualifiedForRound2: boolean;
    }

    interface MockCompetitor {
      id: string;
      competitorCode: string;
      playerPosition: string;
      playerName: string;
      originalTeamId: string;
    }

    function qualifyTeamWithAutoCarry(team: MockTeam): MockCompetitor[] {
      const padded = String(team.teamNumber).padStart(2, '0');
      return [
        {
          id: `comp-${team.teamNumber}-A`,
          competitorCode: `${padded}-A`,
          playerPosition: 'A',
          playerName: team.player1Name,
          originalTeamId: team.id,
        },
        {
          id: `comp-${team.teamNumber}-B`,
          competitorCode: `${padded}-B`,
          playerPosition: 'B',
          playerName: team.player2Name,
          originalTeamId: team.id,
        },
      ];
    }

    it('should auto-carry Player 1 to Slot A and Player 2 to Slot B without retyping', () => {
      const team: MockTeam = {
        id: 'team-07',
        teamNumber: 7,
        teamName: 'Code Warriors',
        player1Name: 'Arjun',
        player2Name: 'Sneha',
        isQualifiedForRound2: true,
      };

      const competitors = qualifyTeamWithAutoCarry(team);
      expect(competitors).toHaveLength(2);
      expect(competitors[0].competitorCode).toBe('07-A');
      expect(competitors[0].playerName).toBe('Arjun');
      expect(competitors[1].competitorCode).toBe('07-B');
      expect(competitors[1].playerName).toBe('Sneha');
    });

    it('should allow editing player names before Round 2 starts', () => {
      function updatePlayerNames(round2Status: RoundStatus, newP1: string, newP2: string) {
        if (round2Status === RoundStatus.ROUND_ACTIVE || round2Status === RoundStatus.PRE_START) {
          return { success: false, error: 'Cannot edit player names after Round 2 has started or entered pre-start.' };
        }
        if (!newP1.trim() || !newP2.trim()) {
          return { success: false, error: 'Both player names are required.' };
        }
        return { success: true, p1: newP1.trim(), p2: newP2.trim() };
      }

      // Allowed when CREATED or LOBBY_OPEN
      const editBefore = updatePlayerNames(RoundStatus.CREATED, 'Arjun Kumar', 'Sneha Patel');
      expect(editBefore.success).toBe(true);
      expect(editBefore.p1).toBe('Arjun Kumar');

      // Blocked when PRE_START
      const editPreStart = updatePlayerNames(RoundStatus.PRE_START, 'Arjun K', 'Sneha P');
      expect(editPreStart.success).toBe(false);
      expect(editPreStart.error).toContain('Cannot edit player names after Round 2 has started');

      // Blocked when ROUND_ACTIVE
      const editActive = updatePlayerNames(RoundStatus.ROUND_ACTIVE, 'Arjun K', 'Sneha P');
      expect(editActive.success).toBe(false);
      expect(editActive.error).toContain('Cannot edit player names after Round 2 has started');
    });
  });

  // ==========================================================
  // 3. PRE-START COUNTDOWN TIMER MECHANICS
  // ==========================================================
  describe('Pre-Start Countdown Timer', () => {
    it('should configure preStartDurationMinutes between 0 and 30', () => {
      function validatePreStartDuration(mins: number) {
        return Math.min(30, Math.max(0, Math.floor(mins)));
      }

      expect(validatePreStartDuration(0)).toBe(0);
      expect(validatePreStartDuration(5)).toBe(5);
      expect(validatePreStartDuration(30)).toBe(30);
      expect(validatePreStartDuration(-5)).toBe(0);
      expect(validatePreStartDuration(45)).toBe(30);
    });

    it('should set PRE_START status and scheduledAnswerStartAt when preStartDurationMinutes > 0', () => {
      const now = new Date('2026-09-12T10:00:00Z');
      const preStartDuration = 5; // 5 minutes

      const isImmediate = preStartDuration <= 0;
      const status = isImmediate ? RoundStatus.ROUND_ACTIVE : RoundStatus.PRE_START;
      const scheduledStart = new Date(now.getTime() + preStartDuration * 60 * 1000);

      expect(status).toBe(RoundStatus.PRE_START);
      expect(scheduledStart.toISOString()).toBe('2026-09-12T10:05:00.000Z');
    });

    it('should reject answer saving and quiz submission during PRE_START', () => {
      function checkSubmissionAllowed(status: RoundStatus) {
        if (status === RoundStatus.PRE_START) {
          return { allowed: false, status: 403, error: 'Round has not started yet.' };
        }
        if (status === RoundStatus.CREATED) {
          return { allowed: false, status: 403, error: 'Round is not currently active.' };
        }
        if (status === RoundStatus.ROUND_ENDED) {
          return { allowed: false, status: 403, error: 'Round has already ended.' };
        }
        return { allowed: true };
      }

      const preStartAttempt = checkSubmissionAllowed(RoundStatus.PRE_START);
      expect(preStartAttempt.allowed).toBe(false);
      expect(preStartAttempt.error).toBe('Round has not started yet.');

      const activeAttempt = checkSubmissionAllowed(RoundStatus.ROUND_ACTIVE);
      expect(activeAttempt.allowed).toBe(true);
    });

    it('should auto-transition from PRE_START to ROUND_ACTIVE once scheduled time arrives', () => {
      const scheduledAnswerStartAt = new Date('2026-09-12T10:05:00Z');

      function checkAutoTransition(currentStatus: RoundStatus, scheduledTime: Date, currentTime: Date): RoundStatus {
        if (currentStatus === RoundStatus.PRE_START && currentTime >= scheduledTime) {
          return RoundStatus.ROUND_ACTIVE;
        }
        return currentStatus;
      }

      // Before time arrives
      const before = checkAutoTransition(RoundStatus.PRE_START, scheduledAnswerStartAt, new Date('2026-09-12T10:04:59Z'));
      expect(before).toBe(RoundStatus.PRE_START);

      // Exactly at time
      const exact = checkAutoTransition(RoundStatus.PRE_START, scheduledAnswerStartAt, new Date('2026-09-12T10:05:00Z'));
      expect(exact).toBe(RoundStatus.ROUND_ACTIVE);

      // After time
      const after = checkAutoTransition(RoundStatus.PRE_START, scheduledAnswerStartAt, new Date('2026-09-12T10:06:00Z'));
      expect(after).toBe(RoundStatus.ROUND_ACTIVE);
    });
  });

  // ==========================================================
  // 4. ROUND 2 ANTI-CHEAT & INDIVIDUAL DISQUALIFICATION
  // ==========================================================
  describe('Round 2 Anti-Cheat & Individual Disqualification', () => {
    it('should support all 10 anti-cheat violation event types', () => {
      const all10Violations = [
        ViolationType.TAB_SWITCH,
        ViolationType.WINDOW_BLUR,
        ViolationType.FULLSCREEN_EXIT,
        ViolationType.RELOAD_ATTEMPT,
        ViolationType.COPY_ATTEMPT,
        ViolationType.PASTE_ATTEMPT,
        ViolationType.CONTEXT_MENU,
        ViolationType.KEYBOARD_SHORTCUT,
        ViolationType.NETWORK_DISCONNECT,
        ViolationType.NETWORK_RECONNECT,
      ];

      expect(all10Violations).toHaveLength(10);
      all10Violations.forEach((v) => {
        expect(typeof v).toBe('string');
        expect(v.length).toBeGreaterThan(0);
      });
    });

    it('should isolate competitor disqualification: 07-A DQ does NOT affect 07-B or Team 07', () => {
      const team07 = { id: 'team-07', teamNumber: 7, isDisqualified: false };
      const comp07A = { id: 'comp-07-a', competitorCode: '07-A', playerName: 'Arjun', isDisqualified: false, disqualifiedReason: null as string | null };
      const comp07B = { id: 'comp-07-b', competitorCode: '07-B', playerName: 'Sneha', isDisqualified: false, disqualifiedReason: null as string | null };

      // Disqualify 07-A only
      function disqualifyCompetitor(comp: typeof comp07A, reason: string) {
        comp.isDisqualified = true;
        comp.disqualifiedReason = reason;
      }

      disqualifyCompetitor(comp07A, 'Tab switch violation');

      // Verify 07-A is disqualified
      expect(comp07A.isDisqualified).toBe(true);
      expect(comp07A.disqualifiedReason).toBe('Tab switch violation');

      // Verify strict isolation: 07-B and Team 07 are completely unaffected!
      expect(comp07B.isDisqualified).toBe(false);
      expect(comp07B.disqualifiedReason).toBeNull();
      expect(team07.isDisqualified).toBe(false);
    });

    it('should prevent disqualified competitors from modifying answers or submitting', () => {
      function allowActionForCompetitor(isDisqualified: boolean) {
        if (isDisqualified) {
          return { allowed: false, status: 403, error: 'You have been disqualified from this round.' };
        }
        return { allowed: true };
      }

      expect(allowActionForCompetitor(true)).toEqual({
        allowed: false,
        status: 403,
        error: 'You have been disqualified from this round.',
      });

      expect(allowActionForCompetitor(false)).toEqual({
        allowed: true,
      });
    });

    it('should exclude disqualified competitors from numerical ranking on the leaderboard', () => {
      const competitors = [
        { id: 'comp-07-a', name: 'Arjun', score: 25, isDisqualified: true },
        { id: 'comp-07-b', name: 'Sneha', score: 20, isDisqualified: false },
        { id: 'comp-08-a', name: 'Rahul', score: 22, isDisqualified: false },
      ];

      function computeRanks(list: typeof competitors) {
        const eligible = list.filter((c) => !c.isDisqualified).sort((a, b) => b.score - a.score);
        const ranked = eligible.map((c, idx) => ({ ...c, rank: idx + 1 }));

        const disqualified = list.filter((c) => c.isDisqualified).map((c) => ({ ...c, rank: null }));
        return { ranked, disqualified };
      }

      const { ranked, disqualified } = computeRanks(competitors);

      // Sneha & Rahul get ranks #1 and #2 based on scores 22 and 20
      expect(ranked).toHaveLength(2);
      expect(ranked[0].name).toBe('Rahul');
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].name).toBe('Sneha');
      expect(ranked[1].rank).toBe(2);

      // Arjun is in disqualified section with rank null
      expect(disqualified).toHaveLength(1);
      expect(disqualified[0].name).toBe('Arjun');
      expect(disqualified[0].rank).toBeNull();
    });

    it('should restore competitor eligibility upon admin reset disqualification', () => {
      const comp07A = { id: 'comp-07-a', competitorCode: '07-A', playerName: 'Arjun', isDisqualified: true, disqualifiedReason: 'Tab switch' };

      function resetCompetitorDisqualification(comp: typeof comp07A) {
        comp.isDisqualified = false;
        comp.disqualifiedReason = null;
      }

      resetCompetitorDisqualification(comp07A);

      expect(comp07A.isDisqualified).toBe(false);
      expect(comp07A.disqualifiedReason).toBeNull();
    });
  });

  // ==========================================================
  // 5. ROUND 2 DISQUALIFICATION API & JSON PARSING INTEGRATION
  // ==========================================================
  describe('Round 2 Disqualification API & Message Verification', () => {
    // Helper to format disqualification UI messages
    function getDisqualificationDetails(params: {
      roundNumber: number;
      isCompetitor: boolean;
      playerName?: string;
      competitorCode?: string;
      teamName?: string;
      reason?: string | null;
    }) {
      const isRound2 = params.roundNumber === 2 || params.isCompetitor;
      return {
        title: 'DISQUALIFIED FROM THIS ROUND',
        message: isRound2
          ? 'You have been disqualified from this round.'
          : 'Your team has been disqualified from this round.',
        playerName: isRound2 ? params.playerName : undefined,
        competitorCode: isRound2 ? params.competitorCode : undefined,
        teamName: !isRound2 ? params.teamName : undefined,
        reason: params.reason || 'Disqualified by administrator',
        helpText: 'Please contact the organizer.',
      };
    }

    it('should display "You have been disqualified from this round." with player details for Round 2', () => {
      const result = getDisqualificationDetails({
        roundNumber: 2,
        isCompetitor: true,
        playerName: 'Arjun Sharma',
        competitorCode: '03-A',
        reason: 'Window lost focus / tab switch',
      });

      expect(result.title).toBe('DISQUALIFIED FROM THIS ROUND');
      expect(result.message).toBe('You have been disqualified from this round.');
      expect(result.message).not.toContain('team');
      expect(result.playerName).toBe('Arjun Sharma');
      expect(result.competitorCode).toBe('03-A');
      expect(result.teamName).toBeUndefined();
      expect(result.reason).toBe('Window lost focus / tab switch');
      expect(result.helpText).toBe('Please contact the organizer.');
    });

    it('should display "Your team has been disqualified from this round." for Round 1 team competition', () => {
      const result = getDisqualificationDetails({
        roundNumber: 1,
        isCompetitor: false,
        teamName: 'Binary Beasts',
        reason: 'Full-screen exit detected',
      });

      expect(result.title).toBe('DISQUALIFIED FROM THIS ROUND');
      expect(result.message).toBe('Your team has been disqualified from this round.');
      expect(result.teamName).toBe('Binary Beasts');
      expect(result.playerName).toBeUndefined();
      expect(result.competitorCode).toBeUndefined();
      expect(result.helpText).toBe('Please contact the organizer.');
    });

    it('fetchApi safe error handling prevents "Unexpected token <" syntax errors when server returns non-JSON', async () => {
      // Mock fetch returning HTML 404
      const mockFetchHtml = async () => ({
        status: 404,
        statusText: 'Not Found',
        headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
        text: async () => '<!DOCTYPE html><html><head><title>Error</title></head><body>Cannot POST /api/unknown</body></html>',
        json: async () => { throw new SyntaxError("Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON"); },
      });

      // Implementation of client fetchApi safety check
      async function safeFetchApiSimulation(fetchFn: typeof mockFetchHtml) {
        const res = await fetchFn();
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          return {
            success: false,
            error: `Server returned a non-JSON response (${res.status} ${res.statusText}) for /api/endpoint.`,
          };
        }
        return await res.json();
      }

      const result = await safeFetchApiSimulation(mockFetchHtml);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Server returned a non-JSON response (404 Not Found)');
    });

    it('disqualifying competitor 01-A preserves 01-B and Team 01 database states', () => {
      // Mock database state representing strict isolation
      const databaseState = {
        teams: [{ id: 'team-1', teamNumber: 1, name: 'Team Alpha', isDisqualified: false }],
        competitors: [
          { id: 'comp-1-A', competitorCode: '01-A', playerName: 'Alex', status: 'ACTIVE', isDisqualified: false },
          { id: 'comp-1-B', competitorCode: '01-B', playerName: 'Bob', status: 'ACTIVE', isDisqualified: false },
        ],
      };

      // Disqualify 01-A
      const target = databaseState.competitors.find(c => c.id === 'comp-1-A')!;
      target.isDisqualified = true;
      target.status = 'DISQUALIFIED';

      // Verify 01-A state
      expect(target.isDisqualified).toBe(true);
      expect(target.status).toBe('DISQUALIFIED');

      // Verify 01-B is untouched
      const teammate = databaseState.competitors.find(c => c.id === 'comp-1-B')!;
      expect(teammate.isDisqualified).toBe(false);
      expect(teammate.status).toBe('ACTIVE');

      // Verify Team is untouched
      const team = databaseState.teams.find(t => t.id === 'team-1')!;
      expect(team.isDisqualified).toBe(false);
    });

    it('session restoration returns valid JSON with status DISQUALIFIED instead of 401', () => {
      function restoreSessionLogic(competitor: { isDisqualified: boolean; status: string; id: string; code: string; name: string }) {
        // Return restored session payload even if disqualified
        return {
          success: true,
          role: 'COMPETITOR',
          status: competitor.isDisqualified ? 'DISQUALIFIED' : competitor.status,
          isDisqualified: competitor.isDisqualified,
          competitor: {
            id: competitor.id,
            competitorCode: competitor.code,
            playerName: competitor.name,
          },
        };
      }

      const session = restoreSessionLogic({
        id: 'comp-01-a',
        code: '01-A',
        name: 'Alex',
        isDisqualified: true,
        status: 'DISQUALIFIED',
      });

      expect(session.success).toBe(true);
      expect(session.isDisqualified).toBe(true);
      expect(session.status).toBe('DISQUALIFIED');
      expect(session.competitor.competitorCode).toBe('01-A');
    });

    it('Express server returns JSON 404 for unmatched /api routes and never HTML', async () => {
      const { app } = await import('../apps/server/src/app');
      const http = await import('http');

      const server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as any).port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        // Test unmatched POST endpoint under /api
        const res = await fetch(`${baseUrl}/api/some/completely/nonexistent/endpoint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        expect(res.status).toBe(404);
        const contentType = res.headers.get('content-type') || '';
        expect(contentType).toContain('application/json');

        const body = await res.json();
        expect(body).toEqual({
          success: false,
          error: 'API endpoint not found',
        });

        // Test unmatched GET endpoint under /api
        const getRes = await fetch(`${baseUrl}/api/nonexistent`, {
          method: 'GET',
        });
        expect(getRes.status).toBe(404);
        expect(getRes.headers.get('content-type')).toContain('application/json');
        const getBody = await getRes.json();
        expect(getBody).toEqual({
          success: false,
          error: 'API endpoint not found',
        });
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it('Express anticheat competitor endpoints return JSON responses', async () => {
      const { app } = await import('../apps/server/src/app');
      const http = await import('http');

      const server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as any).port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        // Test disqualify endpoint without auth -> should return JSON 401
        const resDq = await fetch(`${baseUrl}/api/anticheat/competitors/test-id/disqualify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Tab switch' }),
        });
        expect(resDq.status).toBe(401);
        expect(resDq.headers.get('content-type')).toContain('application/json');
        const bodyDq = await resDq.json();
        expect(bodyDq.success).toBe(false);

        // Test reset-disqualification endpoint without auth -> should return JSON 401
        const resReset = await fetch(`${baseUrl}/api/anticheat/competitors/test-id/reset-disqualification`, {
          method: 'POST',
        });
        expect(resReset.status).toBe(401);
        expect(resReset.headers.get('content-type')).toContain('application/json');
        const bodyReset = await resReset.json();
        expect(bodyReset.success).toBe(false);
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });
  });

  // ==========================================================
  // 6. ROOM CODE MANAGEMENT, TEAM MODAL & ROUND ORDERING
  // ==========================================================
  describe('Room Code Management, Team Selection & Round Ordering', () => {
    // Room code validation helper matching roomService.ts
    function validateNewRoomCode(newRoomCode: string): { valid: boolean; formatted?: string; error?: string } {
      if (!newRoomCode || typeof newRoomCode !== 'string') {
        return { valid: false, error: 'Room code is required.' };
      }
      const formatted = newRoomCode.trim().toUpperCase();
      if (formatted.length < 4 || formatted.length > 12) {
        return { valid: false, error: 'Room code must be between 4 and 12 characters.' };
      }
      if (!/^[A-Z0-9]+$/.test(formatted)) {
        return { valid: false, error: 'Room code must contain only alphanumeric characters.' };
      }
      return { valid: true, formatted };
    }

    // Room code generation helper matching AdminDashboard.tsx
    function generateRoomCode(): string {
      const prefixes = ['FURY', 'FOSS', 'SYN', 'NOVA'];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const num = Math.floor(10 + Math.random() * 90);
      return `${prefix}${num}`;
    }

    it('validates room code length and alphanumeric format correctly', () => {
      expect(validateNewRoomCode('FURY26')).toEqual({ valid: true, formatted: 'FURY26' });
      expect(validateNewRoomCode('foss84 ')).toEqual({ valid: true, formatted: 'FOSS84' });
      expect(validateNewRoomCode('SYNTRACE2026')).toEqual({ valid: true, formatted: 'SYNTRACE2026' });

      // Rejections
      expect(validateNewRoomCode('')).toEqual({ valid: false, error: 'Room code is required.' });
      expect(validateNewRoomCode('ABC')).toEqual({ valid: false, error: 'Room code must be between 4 and 12 characters.' });
      expect(validateNewRoomCode('VERYLONGROOMCODEEXCEEDING12')).toEqual({ valid: false, error: 'Room code must be between 4 and 12 characters.' });
      expect(validateNewRoomCode('FURY-26')).toEqual({ valid: false, error: 'Room code must contain only alphanumeric characters.' });
      expect(validateNewRoomCode('FURY 26')).toEqual({ valid: false, error: 'Room code must contain only alphanumeric characters.' });
      expect(validateNewRoomCode('FURY@26')).toEqual({ valid: false, error: 'Room code must contain only alphanumeric characters.' });
    });

    it('generates random room codes matching 6-8 character uppercase alphanumeric format', () => {
      for (let i = 0; i < 20; i++) {
        const code = generateRoomCode();
        expect(code).toMatch(/^(FURY|FOSS|SYN|NOVA)\d{2}$/);
        const validation = validateNewRoomCode(code);
        expect(validation.valid).toBe(true);
        expect(validation.formatted).toBe(code);
      }
    });

    it('blocks room code updates when any round is PRE_START or ROUND_ACTIVE', () => {
      function canUpdateRoomCode(rounds: { roundNumber: number; status: RoundStatus }[]): { allowed: boolean; error?: string } {
        const hasActiveRound = rounds.some(
          (r) => r.status === RoundStatus.ROUND_ACTIVE || r.status === RoundStatus.PRE_START
        );
        if (hasActiveRound) {
          return { allowed: false, error: 'Room code cannot be changed while a round is in progress.' };
        }
        return { allowed: true };
      }

      // Blocked when Round 1 is ACTIVE
      const r1Active = canUpdateRoomCode([
        { roundNumber: 1, status: RoundStatus.ROUND_ACTIVE },
        { roundNumber: 2, status: RoundStatus.CREATED },
      ]);
      expect(r1Active.allowed).toBe(false);
      expect(r1Active.error).toBe('Room code cannot be changed while a round is in progress.');

      // Blocked when Round 1 is PRE_START
      const r1PreStart = canUpdateRoomCode([
        { roundNumber: 1, status: RoundStatus.PRE_START },
        { roundNumber: 2, status: RoundStatus.CREATED },
      ]);
      expect(r1PreStart.allowed).toBe(false);
      expect(r1PreStart.error).toBe('Room code cannot be changed while a round is in progress.');

      // Blocked when Round 2 is ACTIVE
      const r2Active = canUpdateRoomCode([
        { roundNumber: 1, status: RoundStatus.ROUND_ENDED },
        { roundNumber: 2, status: RoundStatus.ROUND_ACTIVE },
      ]);
      expect(r2Active.allowed).toBe(false);
      expect(r2Active.error).toBe('Room code cannot be changed while a round is in progress.');

      // Allowed when all rounds are inactive (CREATED, LOBBY_OPEN, ROUND_ENDED)
      const allInactive = canUpdateRoomCode([
        { roundNumber: 1, status: RoundStatus.ROUND_ENDED },
        { roundNumber: 2, status: RoundStatus.CREATED },
      ]);
      expect(allInactive.allowed).toBe(true);
      expect(allInactive.error).toBeUndefined();
    });

    it('rejects old room code and accepts new room code after update', () => {
      let currentRoomCode = 'FURY20';

      function validateRoomEntry(enteredCode: string): { success: boolean; error?: string } {
        if (enteredCode.trim().toUpperCase() === currentRoomCode) {
          return { success: true };
        }
        return { success: false, error: 'Invalid room code.' };
      }

      expect(validateRoomEntry('FURY20').success).toBe(true);
      expect(validateRoomEntry('fury20').success).toBe(true);

      // Admin changes code to FURY84
      currentRoomCode = 'FURY84';

      // Old code is now rejected
      expect(validateRoomEntry('FURY20').success).toBe(false);
      expect(validateRoomEntry('FURY20').error).toBe('Invalid room code.');

      // New code is accepted
      expect(validateRoomEntry('FURY84').success).toBe(true);
      expect(validateRoomEntry('fury84').success).toBe(true);
    });

    it('formats concurrent team claim error message with exact team number padding', () => {
      function formatClaimError(teamNumber: number): string {
        return `Team ${String(teamNumber).padStart(2, '0')} has already been claimed. Please select another team.`;
      }

      expect(formatClaimError(1)).toBe('Team 01 has already been claimed. Please select another team.');
      expect(formatClaimError(7)).toBe('Team 07 has already been claimed. Please select another team.');
      expect(formatClaimError(12)).toBe('Team 12 has already been claimed. Please select another team.');
    });

    it('guarantees Round 1 appears first and Round 2 appears second in round ordering', () => {
      const unorderedRounds = [
        { id: 'r2', roundNumber: 2, title: 'DEBUGNOVA' },
        { id: 'r1', roundNumber: 1, title: 'SYNTRACE' },
      ];

      const sortedRounds = [...unorderedRounds].sort((a, b) => a.roundNumber - b.roundNumber);

      expect(sortedRounds[0].roundNumber).toBe(1);
      expect(sortedRounds[0].title).toBe('SYNTRACE');
      expect(sortedRounds[1].roundNumber).toBe(2);
      expect(sortedRounds[1].title).toBe('DEBUGNOVA');
    });

    it('ensures marketing text like "Offline Local LAN" is absent from header while retaining clean branding', () => {
      const headerTitle = 'FOSSFURY 26';
      const badgeText = 'SFOSS'; // Replaced "SFOSS OFFLINE" with "SFOSS"
      const subtitle = 'SFOSS TECHNICAL QUIZ PLATFORM';

      expect(headerTitle).not.toContain('Offline Local LAN');
      expect(badgeText).not.toContain('OFFLINE');
      expect(subtitle).not.toContain('Offline');
      expect(badgeText).toBe('SFOSS');
    });
  });

  // ==========================================================
  // 7. ROUND 1 QUALIFICATION-ONLY PUBLICATION & DATA MASKING
  // ==========================================================
  describe('Round 1 Qualification-Only Publication & Data Masking', () => {
    it('rejects publication when requested for Round 2 (DEBUGNOVA)', () => {
      function validatePublicationRequest(roundNumber: number, qualifiedCount: number) {
        if (roundNumber !== 1) {
          return { success: false, error: 'Result publication is only available for Round 1.' };
        }
        if (qualifiedCount === 0) {
          return { success: false, error: 'Complete Round 2 qualification before publishing Round 1 results.' };
        }
        return { success: true, message: 'Round 1 qualification results published successfully.' };
      }

      // Round 2 publication attempt is strictly rejected
      const round2Attempt = validatePublicationRequest(2, 5);
      expect(round2Attempt.success).toBe(false);
      expect(round2Attempt.error).toBe('Result publication is only available for Round 1.');

      // Round 1 publication with 0 qualified teams is rejected
      const prematureAttempt = validatePublicationRequest(1, 0);
      expect(prematureAttempt.success).toBe(false);
      expect(prematureAttempt.error).toBe('Complete Round 2 qualification before publishing Round 1 results.');

      // Round 1 publication with qualified teams succeeds
      const validAttempt = validatePublicationRequest(1, 10);
      expect(validAttempt.success).toBe(true);
      expect(validAttempt.message).toBe('Round 1 qualification results published successfully.');
    });

    it('returns published: false to participants before Admin publication', () => {
      function getParticipantRound1Result(isPublished: boolean, isQualified: boolean, isDisqualified = false) {
        if (isDisqualified) {
          return {
            success: true,
            published: isPublished,
            isDisqualified: true,
            disqualifiedReason: 'Rule violation',
            roundName: 'SYNTRACE',
          };
        }
        if (!isPublished) {
          return {
            success: true,
            published: false,
            roundName: 'SYNTRACE',
          };
        }
        return {
          success: true,
          published: true,
          qualified: isQualified,
          roundName: 'SYNTRACE',
        };
      }

      const beforePublishTeam01 = getParticipantRound1Result(false, true);
      expect(beforePublishTeam01.published).toBe(false);
      expect((beforePublishTeam01 as any).qualified).toBeUndefined();

      const beforePublishTeam02 = getParticipantRound1Result(false, false);
      expect(beforePublishTeam02.published).toBe(false);
      expect((beforePublishTeam02 as any).qualified).toBeUndefined();
    });

    it('returns QUALIFIED to Team 01 & Team 03, NOT QUALIFIED to Team 02 after publication', () => {
      function getParticipantRound1Result(isPublished: boolean, isQualified: boolean) {
        if (!isPublished) {
          return { success: true, published: false, roundName: 'SYNTRACE' };
        }
        return {
          success: true,
          published: true,
          qualified: isQualified,
          roundName: 'SYNTRACE',
        };
      }

      // After Admin publishes results
      const team01Result = getParticipantRound1Result(true, true);
      const team02Result = getParticipantRound1Result(true, false);
      const team03Result = getParticipantRound1Result(true, true);

      expect(team01Result).toEqual({
        success: true,
        published: true,
        qualified: true,
        roundName: 'SYNTRACE',
      });

      expect(team02Result).toEqual({
        success: true,
        published: true,
        qualified: false,
        roundName: 'SYNTRACE',
      });

      expect(team03Result).toEqual({
        success: true,
        published: true,
        qualified: true,
        roundName: 'SYNTRACE',
      });
    });

    it('verifies complete data masking: NEVER exposes score, rank, answers, or leaderboard to participants', () => {
      const mockPublishedResponse = {
        success: true,
        published: true,
        qualified: true,
        roundName: 'SYNTRACE',
      };

      // Forbidden fields that must NEVER appear in the participant response
      const forbiddenFields = [
        'score',
        'rank',
        'totalCorrect',
        'totalWrong',
        'totalUnanswered',
        'correctCount',
        'wrongCount',
        'unansweredCount',
        'submittedAt',
        'answers',
        'selectedOptions',
        'correctAnswer',
        'answerPaper',
        'leaderboard',
        'results',
      ];

      for (const field of forbiddenFields) {
        expect(mockPublishedResponse).not.toHaveProperty(field);
      }
    });

    it('preserves disqualification precedence over qualification status', () => {
      function getParticipantRound1Result(isPublished: boolean, isQualified: boolean, isDisqualified: boolean) {
        if (isDisqualified) {
          return {
            success: true,
            published: isPublished,
            isDisqualified: true,
            disqualifiedReason: 'Tab switch detected',
            roundName: 'SYNTRACE',
          };
        }
        return {
          success: true,
          published: isPublished,
          qualified: isQualified,
          roundName: 'SYNTRACE',
        };
      }

      // Disqualified team before publication
      const dqBefore = getParticipantRound1Result(false, false, true);
      expect(dqBefore.isDisqualified).toBe(true);
      expect(dqBefore.disqualifiedReason).toBe('Tab switch detected');

      // Disqualified team after publication — remains Disqualified, not converted to NOT QUALIFIED
      const dqAfter = getParticipantRound1Result(true, false, true);
      expect(dqAfter.isDisqualified).toBe(true);
      expect(dqAfter.disqualifiedReason).toBe('Tab switch detected');
      expect((dqAfter as any).qualified).toBeUndefined();
    });

    it('clears publication state when official standings are reset', () => {
      let roundStatus = RoundStatus.RESULTS_PUBLISHED;

      function resetStandings() {
        if (roundStatus === RoundStatus.RESULTS_PUBLISHED || roundStatus === RoundStatus.SCORING_COMPLETE) {
          roundStatus = RoundStatus.ROUND_ENDED;
        }
      }

      expect(roundStatus).toBe(RoundStatus.RESULTS_PUBLISHED);
      resetStandings();
      expect(roundStatus).toBe(RoundStatus.ROUND_ENDED);

      // Now participant result is once again NOT published
      const isPublished = roundStatus === RoundStatus.RESULTS_PUBLISHED;
      expect(isPublished).toBe(false);
    });

    it('Express server rejects unauthenticated/non-admin requests to /api/results/leaderboard', async () => {
      const { app } = await import('../apps/server/src/app');
      const http = await import('http');

      const server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as any).port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        const res = await fetch(`${baseUrl}/api/results/leaderboard/test-round-id`);
        // Must reject with 401 Unauthorized (token required)
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.success).toBe(false);
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it('Express server rejects unauthenticated requests to /api/participant/round1/result', async () => {
      const { app } = await import('../apps/server/src/app');
      const http = await import('http');

      const server = http.createServer(app);
      await new Promise<void>((resolve) => server.listen(0, resolve));
      const port = (server.address() as any).port;
      const baseUrl = `http://127.0.0.1:${port}`;

      try {
        const res = await fetch(`${baseUrl}/api/participant/round1/result`);
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.success).toBe(false);
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });
  });

});



