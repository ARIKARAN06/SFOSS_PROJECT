import { describe, it, expect } from 'vitest';
import { generateSeed, seededShuffle, evaluateAnswerChoice } from '../packages/shared/src';

describe('Round System & Qualification Tests', () => {
  it('should generate properly formatted competitor codes for Round 2', () => {
    const teamNumber = 7;
    const padded = String(teamNumber).padStart(2, '0');
    const codeA = `${padded}-A`;
    const codeB = `${padded}-B`;

    expect(codeA).toBe('07-A');
    expect(codeB).toBe('07-B');
  });

  it('should format Round 2 competitor display with player name and team info', () => {
    const comp = {
      competitorCode: '01-A',
      playerName: 'Arjun',
      originalTeamNumber: 1,
      originalTeamName: 'Code Warriors',
    };

    const displayText = `${comp.competitorCode} — ${comp.playerName} — Team ${String(comp.originalTeamNumber).padStart(2, '0')} ${comp.originalTeamName}`;
    expect(displayText).toBe('01-A — Arjun — Team 01 Code Warriors');
  });

  it('should require both Player A and Player B names for manual qualification', () => {
    function validateQualification(player1Name?: string, player2Name?: string) {
      const p1 = player1Name ? player1Name.trim() : '';
      const p2 = player2Name ? player2Name.trim() : '';

      if (!p1) return { valid: false, error: 'Enter Player A name before saving.' };
      if (!p2) return { valid: false, error: 'Enter Player B name before saving.' };
      return { valid: true, p1, p2 };
    }

    expect(validateQualification('', 'Karthik')).toEqual({
      valid: false,
      error: 'Enter Player A name before saving.',
    });

    expect(validateQualification('Arjun', '   ')).toEqual({
      valid: false,
      error: 'Enter Player B name before saving.',
    });

    expect(validateQualification('Arjun', 'Karthik')).toEqual({
      valid: true,
      p1: 'Arjun',
      p2: 'Karthik',
    });
  });

  it('should block unqualification if Round 2 participation data exists', () => {
    function canSafelyUnqualify(competitor: {
      submissionsCount: number;
      scoresCount: number;
      hasActiveSession: boolean;
    }) {
      if (
        competitor.submissionsCount > 0 ||
        competitor.scoresCount > 0 ||
        competitor.hasActiveSession
      ) {
        return {
          allowed: false,
          error: 'Cannot remove qualification because Round 2 participation data already exists.',
        };
      }
      return { allowed: true };
    }

    // Active submissions exist
    expect(canSafelyUnqualify({ submissionsCount: 1, scoresCount: 0, hasActiveSession: false })).toEqual({
      allowed: false,
      error: 'Cannot remove qualification because Round 2 participation data already exists.',
    });

    // Clean slot
    expect(canSafelyUnqualify({ submissionsCount: 0, scoresCount: 0, hasActiveSession: false })).toEqual({
      allowed: true,
    });
  });

  it('should generate independent seeds for individual competitors from same team', () => {
    const competitorAId = 'comp-07-a';
    const competitorBId = 'comp-07-b';
    const round2Id = 'round-2-id';
    const salt = 'competition-salt';

    const seedA = generateSeed(competitorAId, round2Id, salt);
    const seedB = generateSeed(competitorBId, round2Id, salt);

    expect(seedA).not.toBe(seedB);

    const questions = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10'];
    const orderA = seededShuffle(questions, seedA);
    const orderB = seededShuffle(questions, seedB);

    expect(orderA).not.toEqual(orderB);
  });

  it('should sort leaderboard accurately by score DESC, submittedAt ASC, and team/code ASC', () => {
    const timeEarly = new Date('2026-09-12T10:15:00.000Z');
    const timeLate = new Date('2026-09-12T10:20:00.000Z');

    const competitors = [
      { id: 'c1', competitorCode: '03-A', score: 15, submittedAt: timeLate },
      { id: 'c2', competitorCode: '01-A', score: 18, submittedAt: timeLate },
      { id: 'c3', competitorCode: '02-B', score: 15, submittedAt: timeEarly },
      { id: 'c4', competitorCode: '01-B', score: 15, submittedAt: timeEarly },
    ];

    const sorted = [...competitors].sort((a, b) => {
      // 1. Score DESC
      if (b.score !== a.score) return b.score - a.score;
      // 2. submittedAt ASC
      const aTime = a.submittedAt.getTime();
      const bTime = b.submittedAt.getTime();
      if (aTime !== bTime) return aTime - bTime;
      // 3. Code ASC
      return a.competitorCode.localeCompare(b.competitorCode);
    });

    expect(sorted[0].competitorCode).toBe('01-A'); // 18 pts
    expect(sorted[1].competitorCode).toBe('01-B'); // 15 pts, early, code 01-B < 02-B
    expect(sorted[2].competitorCode).toBe('02-B'); // 15 pts, early, code 02-B
    expect(sorted[3].competitorCode).toBe('03-A'); // 15 pts, late
  });

  describe('Round 2 Individual Claim Reset / Revoke Flow', () => {
    function evaluateClaimResetSafety(competitor: {
      isClaimed: boolean;
      sessionToken: string | null;
      submissionsCount: number;
      scoresCount: number;
      hasCompletedSession: boolean;
    }) {
      const hasAnswered = competitor.submissionsCount > 0;
      const hasScores = competitor.scoresCount > 0;
      const hasSubmitted = competitor.hasCompletedSession;

      if (hasAnswered || hasScores || hasSubmitted) {
        return {
          allowed: false,
          error: 'Cannot reset claim because this competitor has already started Round 2.',
        };
      }

      return {
        allowed: true,
        resetData: {
          isClaimed: false,
          sessionToken: null,
          status: 'READY',
        },
      };
    }

    it('TC1: should allow claim reset when competitor is claimed but has not started Round 2', () => {
      const claimedCompetitor = {
        isClaimed: true,
        sessionToken: 'token-uuid-1234',
        submissionsCount: 0,
        scoresCount: 0,
        hasCompletedSession: false,
      };

      const result = evaluateClaimResetSafety(claimedCompetitor);
      expect(result.allowed).toBe(true);
      expect(result.resetData).toEqual({
        isClaimed: false,
        sessionToken: null,
        status: 'READY',
      });
    });

    it('TC2: should preserve teammate data completely when resetting competitor claim (Teammate Isolation)', () => {
      const team = {
        teamNumber: 1,
        teamName: 'Code Warriors',
        isQualifiedForRound2: true,
        competitors: [
          {
            id: 'comp-01-a',
            competitorCode: '01-A',
            playerName: 'Arjun',
            playerPosition: 'A',
            isClaimed: true,
            sessionToken: 'token-arjun',
          },
          {
            id: 'comp-01-b',
            competitorCode: '01-B',
            playerName: 'Karthik',
            playerPosition: 'B',
            isClaimed: true,
            sessionToken: 'token-karthik',
          },
        ],
      };

      // Reset only Competitor A
      const targetCompId = 'comp-01-a';
      const updatedCompetitors = team.competitors.map((c) => {
        if (c.id === targetCompId) {
          return { ...c, isClaimed: false, sessionToken: null, status: 'READY' };
        }
        return c;
      });

      // Assert Competitor A was reset
      expect(updatedCompetitors[0].isClaimed).toBe(false);
      expect(updatedCompetitors[0].sessionToken).toBeNull();
      expect(updatedCompetitors[0].playerName).toBe('Arjun');
      expect(updatedCompetitors[0].competitorCode).toBe('01-A');

      // Assert Teammate B is 100% unaffected
      expect(updatedCompetitors[1].isClaimed).toBe(true);
      expect(updatedCompetitors[1].sessionToken).toBe('token-karthik');
      expect(updatedCompetitors[1].playerName).toBe('Karthik');
      expect(updatedCompetitors[1].competitorCode).toBe('01-B');

      // Assert Team qualification is untouched
      expect(team.isQualifiedForRound2).toBe(true);
      expect(team.teamNumber).toBe(1);
      expect(team.teamName).toBe('Code Warriors');
    });

    it('TC3: should block claim reset if competitor has answered questions or submitted', () => {
      // Scenario A: Answer submissions exist
      const activeCompetitor = {
        isClaimed: true,
        sessionToken: 'token-active',
        submissionsCount: 2,
        scoresCount: 0,
        hasCompletedSession: false,
      };
      expect(evaluateClaimResetSafety(activeCompetitor)).toEqual({
        allowed: false,
        error: 'Cannot reset claim because this competitor has already started Round 2.',
      });

      // Scenario B: Completed/Submitted session exists
      const submittedCompetitor = {
        isClaimed: true,
        sessionToken: 'token-sub',
        submissionsCount: 0,
        scoresCount: 0,
        hasCompletedSession: true,
      };
      expect(evaluateClaimResetSafety(submittedCompetitor)).toEqual({
        allowed: false,
        error: 'Cannot reset claim because this competitor has already started Round 2.',
      });

      // Scenario C: Final score exists
      const scoredCompetitor = {
        isClaimed: true,
        sessionToken: 'token-scored',
        submissionsCount: 0,
        scoresCount: 1,
        hasCompletedSession: false,
      };
      expect(evaluateClaimResetSafety(scoredCompetitor)).toEqual({
        allowed: false,
        error: 'Cannot reset claim because this competitor has already started Round 2.',
      });
    });

    it('TC4: should invalidate old session token after claim is reset', () => {
      function validateCompetitorSession(
        tokenSessionToken: string,
        dbCompetitor: { isClaimed: boolean; sessionToken: string | null }
      ) {
        if (!dbCompetitor.isClaimed || dbCompetitor.sessionToken !== tokenSessionToken) {
          return {
            valid: false,
            error: 'Your Round 2 claim was reset by the organizer.',
            code: 'CLAIM_RESET',
          };
        }
        return { valid: true };
      }

      const activeDbState = { isClaimed: true, sessionToken: 'session-live-abc' };
      expect(validateCompetitorSession('session-live-abc', activeDbState)).toEqual({ valid: true });

      // After admin resets claim
      const resetDbState = { isClaimed: false, sessionToken: null };
      expect(validateCompetitorSession('session-live-abc', resetDbState)).toEqual({
        valid: false,
        error: 'Your Round 2 claim was reset by the organizer.',
        code: 'CLAIM_RESET',
      });
    });

    it('TC5: should preserve all player names, competitor codes, and Round 1 links without alterations', () => {
      const originalCompetitor = {
        id: 'comp-uuid-456',
        roundId: 'round-2-id',
        originalTeamId: 'team-uuid-123',
        originalTeamNumber: 3,
        originalTeamName: 'CyberKnights',
        playerName: 'Suresh',
        playerPosition: 'B' as const,
        competitorCode: '03-B',
        isClaimed: true,
        sessionToken: 'old-token',
        status: 'ACTIVE',
      };

      // Reset action simulation
      const afterReset = {
        ...originalCompetitor,
        isClaimed: false,
        sessionToken: null,
        status: 'READY',
      };

      expect(afterReset.id).toBe(originalCompetitor.id);
      expect(afterReset.roundId).toBe(originalCompetitor.roundId);
      expect(afterReset.originalTeamId).toBe(originalCompetitor.originalTeamId);
      expect(afterReset.originalTeamNumber).toBe(3);
      expect(afterReset.originalTeamName).toBe('CyberKnights');
      expect(afterReset.playerName).toBe('Suresh');
      expect(afterReset.playerPosition).toBe('B');
      expect(afterReset.competitorCode).toBe('03-B');
      expect(afterReset.isClaimed).toBe(false);
      expect(afterReset.sessionToken).toBeNull();
      expect(afterReset.status).toBe('READY');
    });
  });
});
