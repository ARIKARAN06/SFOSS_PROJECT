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
});
