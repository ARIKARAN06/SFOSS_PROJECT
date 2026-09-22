import { describe, it, expect } from 'vitest';
import { MARKS_PER_CORRECT, PENALTY_PER_WRONG, UNANSWERED_SCORE, calculateRawScore } from '../packages/shared/src';
import { RoundStatus } from '../packages/shared/src/types';

describe('FOSSFURY 26 — Marking System (+2 / -1 / 0) Test Suite', () => {

  // ==========================================================
  // SHARED CONSTANTS & CALCULATION TESTS
  // ==========================================================
  describe('Constants & calculateRawScore', () => {
    it('should have correct shared constants for FOSSFURY 26', () => {
      expect(MARKS_PER_CORRECT).toBe(2.0);
      expect(PENALTY_PER_WRONG).toBe(-1.0);
      expect(UNANSWERED_SCORE).toBe(0.0);
    });

    it('Test A: 10 correct, 0 wrong, 0 unanswered = 20', () => {
      const score = calculateRawScore(10, 0);
      expect(score).toBe(20.0);
    });

    it('Test B: 0 correct, 10 wrong, 0 unanswered = -10 (negative score allowed, no clamping)', () => {
      const score = calculateRawScore(0, 10);
      expect(score).toBe(-10.0);
      // Ensure negative scores are never clamped to 0
      expect(score).toBeLessThan(0);
    });

    it('Test C: 0 correct, 0 wrong, 10 unanswered = 0', () => {
      const score = calculateRawScore(0, 0);
      expect(score).toBe(0.0);
    });

    it('Test D: 5 correct, 3 wrong, 2 unanswered = 7', () => {
      const score = calculateRawScore(5, 3);
      // (5 * 2) - (3 * 1) = 10 - 3 = 7
      expect(score).toBe(7.0);
    });

    it('Example from specification: 12 correct, 5 wrong, 3 unanswered = 19', () => {
      const score = calculateRawScore(12, 5);
      // (12 * 2) - (5 * 1) = 24 - 5 = 19
      expect(score).toBe(19.0);
    });
  });

  // ==========================================================
  // TEST E: ROUND 1 RANKING WITH NEW SCORES (+2 / -1 / 0)
  // ==========================================================
  describe('Test E: Round 1 Ranking & Tie-Breaking with New Scores', () => {
    interface Round1TeamResult {
      teamId: string;
      teamNumber: number;
      teamName: string;
      totalCorrect: number;
      totalWrong: number;
      totalUnanswered: number;
      score: number;
      submittedAt: Date | null;
      isDisqualified: boolean;
      rank?: number | null;
    }

    function rankRound1Teams(teams: Round1TeamResult[]) {
      // Sort: 
      // 1st: Eligible teams first (score DESC, submittedAt ASC, teamNumber ASC)
      // 2nd: Disqualified teams last (no rank)
      const sorted = [...teams].sort((a, b) => {
        if (a.isDisqualified && !b.isDisqualified) return 1;
        if (!a.isDisqualified && b.isDisqualified) return -1;
        if (b.score !== a.score) return b.score - a.score;
        if (a.submittedAt && b.submittedAt) {
          const diff = a.submittedAt.getTime() - b.submittedAt.getTime();
          if (diff !== 0) return diff;
        }
        return a.teamNumber - b.teamNumber;
      });

      let currentRank = 1;
      return sorted.map((team) => ({
        ...team,
        rank: team.isDisqualified || team.score === -999.0 ? null : currentRank++,
      }));
    }

    it('should rank Round 1 teams accurately using +2 / -1 / 0 scores and deterministic tie-breaking', () => {
      const t1 = new Date('2026-09-21T10:00:00Z');
      const t2 = new Date('2026-09-21T10:02:00Z');
      const t3 = new Date('2026-09-21T10:05:00Z');

      const mockTeams: Round1TeamResult[] = [
        {
          teamId: 't-3',
          teamNumber: 3,
          teamName: 'Team Three',
          totalCorrect: 5,
          totalWrong: 3,
          totalUnanswered: 2,
          score: calculateRawScore(5, 3), // 7
          submittedAt: t3,
          isDisqualified: false,
        },
        {
          teamId: 't-1',
          teamNumber: 1,
          teamName: 'Team One',
          totalCorrect: 10,
          totalWrong: 0,
          totalUnanswered: 0,
          score: calculateRawScore(10, 0), // 20
          submittedAt: t2,
          isDisqualified: false,
        },
        {
          teamId: 't-2',
          teamNumber: 2,
          teamName: 'Team Two',
          totalCorrect: 0,
          totalWrong: 10,
          totalUnanswered: 0,
          score: calculateRawScore(0, 10), // -10 (negative score)
          submittedAt: t1,
          isDisqualified: false,
        },
        {
          teamId: 't-4',
          teamNumber: 4,
          teamName: 'Team Four',
          totalCorrect: 10,
          totalWrong: 0,
          totalUnanswered: 0,
          score: calculateRawScore(10, 0), // 20 (tied with Team 1, but earlier submittedAt t1)
          submittedAt: t1,
          isDisqualified: false,
        },
        {
          teamId: 't-5',
          teamNumber: 5,
          teamName: 'Team Five',
          totalCorrect: 10,
          totalWrong: 0,
          totalUnanswered: 0,
          score: -999.0,
          submittedAt: t1,
          isDisqualified: true, // Disqualified
        },
      ];

      const ranked = rankRound1Teams(mockTeams);

      // Team 4: 20 pts, submitted at t1 -> Rank 1
      expect(ranked[0].teamNumber).toBe(4);
      expect(ranked[0].score).toBe(20.0);
      expect(ranked[0].rank).toBe(1);

      // Team 1: 20 pts, submitted at t2 -> Rank 2
      expect(ranked[1].teamNumber).toBe(1);
      expect(ranked[1].score).toBe(20.0);
      expect(ranked[1].rank).toBe(2);

      // Team 3: 7 pts, submitted at t3 -> Rank 3
      expect(ranked[2].teamNumber).toBe(3);
      expect(ranked[2].score).toBe(7.0);
      expect(ranked[2].rank).toBe(3);

      // Team 2: -10 pts, submitted at t1 -> Rank 4 (negative score preserved without clamping!)
      expect(ranked[3].teamNumber).toBe(2);
      expect(ranked[3].score).toBe(-10.0);
      expect(ranked[3].rank).toBe(4);

      // Team 5: Disqualified -> rank null, placed at the end
      expect(ranked[4].teamNumber).toBe(5);
      expect(ranked[4].isDisqualified).toBe(true);
      expect(ranked[4].rank).toBeNull();
    });
  });

  // ==========================================================
  // TEST F: ROUND 2 RANKING WITH NEW SCORES (+2 / -1 / 0)
  // ==========================================================
  describe('Test F: Round 2 Ranking & Tie-Breaking with New Scores', () => {
    interface Round2CompetitorResult {
      competitorId: string;
      competitorCode: string;
      playerName: string;
      totalCorrect: number;
      totalWrong: number;
      totalUnanswered: number;
      score: number;
      submittedAt: Date | null;
      isDisqualified: boolean;
      rank?: number | null;
    }

    function rankRound2Competitors(competitors: Round2CompetitorResult[]) {
      // Sort:
      // 1st: Eligible competitors first (score DESC, submittedAt ASC, competitorCode ASC)
      // 2nd: Disqualified competitors last (no rank)
      const sorted = [...competitors].sort((a, b) => {
        if (a.isDisqualified && !b.isDisqualified) return 1;
        if (!a.isDisqualified && b.isDisqualified) return -1;
        if (b.score !== a.score) return b.score - a.score;
        if (a.submittedAt && b.submittedAt) {
          const diff = a.submittedAt.getTime() - b.submittedAt.getTime();
          if (diff !== 0) return diff;
        }
        return a.competitorCode.localeCompare(b.competitorCode);
      });

      let currentRank = 1;
      return sorted.map((comp) => ({
        ...comp,
        rank: comp.isDisqualified || comp.score === -999.0 ? null : currentRank++,
      }));
    }

    it('should rank Round 2 competitors accurately with +2 / -1 / 0 scores and competitorCode tie-breaker', () => {
      const t1 = new Date('2026-09-21T11:00:00Z');
      const t2 = new Date('2026-09-21T11:05:00Z');

      const mockCompetitors: Round2CompetitorResult[] = [
        {
          competitorId: 'c-02a',
          competitorCode: '02-A',
          playerName: 'Karthik',
          totalCorrect: 12,
          totalWrong: 5,
          totalUnanswered: 3,
          score: calculateRawScore(12, 5), // 19
          submittedAt: t1,
          isDisqualified: false,
        },
        {
          competitorId: 'c-01b',
          competitorCode: '01-B',
          playerName: 'Sneha',
          totalCorrect: 12,
          totalWrong: 5,
          totalUnanswered: 3,
          score: calculateRawScore(12, 5), // 19 (tied score and tied submittedAt, tie-broken by code: 01-B < 02-A)
          submittedAt: t1,
          isDisqualified: false,
        },
        {
          competitorId: 'c-01a',
          competitorCode: '01-A',
          playerName: 'Arjun',
          totalCorrect: 15,
          totalWrong: 2,
          totalUnanswered: 3,
          score: calculateRawScore(15, 2), // (15*2) - (2*1) = 28
          submittedAt: t2,
          isDisqualified: false,
        },
        {
          competitorId: 'c-03a',
          competitorCode: '03-A',
          playerName: 'Vikram',
          totalCorrect: 1,
          totalWrong: 9,
          totalUnanswered: 10,
          score: calculateRawScore(1, 9), // (1*2) - (9*1) = -7 (negative score!)
          submittedAt: t1,
          isDisqualified: false,
        },
        {
          competitorId: 'c-04a',
          competitorCode: '04-A',
          playerName: 'Ravi',
          totalCorrect: 20,
          totalWrong: 0,
          totalUnanswered: 0,
          score: -999.0,
          submittedAt: t1,
          isDisqualified: true,
        },
      ];

      const ranked = rankRound2Competitors(mockCompetitors);

      // Rank 1: Arjun (28 pts)
      expect(ranked[0].competitorCode).toBe('01-A');
      expect(ranked[0].score).toBe(28.0);
      expect(ranked[0].rank).toBe(1);

      // Rank 2: Sneha (19 pts, code 01-B ties with 02-A, 01-B comes first)
      expect(ranked[1].competitorCode).toBe('01-B');
      expect(ranked[1].score).toBe(19.0);
      expect(ranked[1].rank).toBe(2);

      // Rank 3: Karthik (19 pts, code 02-A)
      expect(ranked[2].competitorCode).toBe('02-A');
      expect(ranked[2].score).toBe(19.0);
      expect(ranked[2].rank).toBe(3);

      // Rank 4: Vikram (-7 pts, negative score preserved)
      expect(ranked[3].competitorCode).toBe('03-A');
      expect(ranked[3].score).toBe(-7.0);
      expect(ranked[3].rank).toBe(4);

      // Disqualified: Ravi (score -999.0, rank null)
      expect(ranked[4].competitorCode).toBe('04-A');
      expect(ranked[4].isDisqualified).toBe(true);
      expect(ranked[4].rank).toBeNull();
    });
  });

  // ==========================================================
  // TEST G: AUTOMATIC TOP 10 QUALIFICATION WITH NEW SCORES
  // ==========================================================
  describe('Test G: Automatic Top 10 Qualification with New Scores', () => {
    interface QualifiedCandidate {
      teamId: string;
      teamNumber: number;
      score: number;
      isDisqualified: boolean;
      submittedAt: Date;
    }

    function autoQualifyTop10(
      results: QualifiedCandidate[],
      existingQualifiedCount: number,
      existingCompetitorsCount: number
    ): { qualifiedTeamIds: string[]; wasAutoQualified: boolean } {
      // Only auto-qualify if no teams were previously qualified and no competitors exist
      if (existingQualifiedCount > 0 || existingCompetitorsCount > 0) {
        return { qualifiedTeamIds: [], wasAutoQualified: false };
      }

      // Filter eligible
      const eligible = results.filter((r) => !r.isDisqualified && r.score !== -999.0);
      
      // Sort by score DESC, submittedAt ASC, teamNumber ASC
      eligible.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const diff = a.submittedAt.getTime() - b.submittedAt.getTime();
        if (diff !== 0) return diff;
        return a.teamNumber - b.teamNumber;
      });

      const top10 = eligible.slice(0, 10);
      return { qualifiedTeamIds: top10.map((t) => t.teamId), wasAutoQualified: true };
    }

    it('should select top 10 eligible teams based on new +2/-1/0 scores when no qualifications exist', () => {
      const now = new Date();
      // Generate 15 teams with varying scores calculated via +2/-1/0
      const teams: QualifiedCandidate[] = Array.from({ length: 15 }, (_, i) => {
        const teamNumber = i + 1;
        const correct = 15 - i;
        const wrong = i;
        const score = calculateRawScore(correct, wrong); // (15-i)*2 - i = 30 - 3i
        return {
          teamId: `team-${teamNumber}`,
          teamNumber,
          score,
          isDisqualified: teamNumber === 1, // Team 1 is disqualified
          submittedAt: new Date(now.getTime() + i * 1000),
        };
      });

      const result = autoQualifyTop10(teams, 0, 0);
      expect(result.wasAutoQualified).toBe(true);
      expect(result.qualifiedTeamIds.length).toBe(10);
      // Team 1 is disqualified, so Team 2 (top eligible) should be first
      expect(result.qualifiedTeamIds[0]).toBe('team-2');
      // Should not contain team-1
      expect(result.qualifiedTeamIds).not.toContain('team-1');
    });

    it('should NEVER overwrite or duplicate qualifications if qualifications already exist', () => {
      const teams: QualifiedCandidate[] = [
        {
          teamId: 'team-1',
          teamNumber: 1,
          score: 20,
          isDisqualified: false,
          submittedAt: new Date(),
        },
      ];

      // If already qualified count > 0, auto-qualify must be skipped
      const result = autoQualifyTop10(teams, 5, 10);
      expect(result.wasAutoQualified).toBe(false);
      expect(result.qualifiedTeamIds).toEqual([]);
    });
  });

  // ==========================================================
  // TEST H: ANSWER PAPER TOTALS MATCH OFFICIAL SCORES
  // ==========================================================
  describe('Test H: Admin Answer-Paper Breakdown and Score Consistency', () => {
    interface QuestionSpec {
      id: string;
      correctOptionId: string;
    }

    interface SubmissionSpec {
      questionId: string;
      selectedOptionId: string;
    }

    function generateAnswerPaper(
      questions: QuestionSpec[],
      submissions: SubmissionSpec[],
      isDisqualified: boolean = false
    ) {
      const subMap = new Map(submissions.map((s) => [s.questionId, s.selectedOptionId]));

      const answerPaper = questions.map((q) => {
        const selected = subMap.get(q.id);
        let status: 'CORRECT' | 'WRONG' | 'UNANSWERED' = 'UNANSWERED';
        let pointsAwarded = 0.0;

        if (selected) {
          if (selected === q.correctOptionId) {
            status = 'CORRECT';
            pointsAwarded = 2.0;
          } else {
            status = 'WRONG';
            pointsAwarded = -1.0;
          }
        }

        return { questionId: q.id, status, pointsAwarded };
      });

      const totalCorrect = answerPaper.filter((a) => a.status === 'CORRECT').length;
      const totalWrong = answerPaper.filter((a) => a.status === 'WRONG').length;
      const totalUnanswered = answerPaper.filter((a) => a.status === 'UNANSWERED').length;
      const computedScore = isDisqualified ? -999.0 : totalCorrect * 2.0 + totalWrong * -1.0;

      return {
        answerPaper,
        totalCorrect,
        totalWrong,
        totalUnanswered,
        score: computedScore,
        isDisqualified,
      };
    }

    it('should compute answer-paper breakdown and score matching official formula (+2 / -1 / 0)', () => {
      // 10 questions: 5 correct, 3 wrong, 2 unanswered
      const questions: QuestionSpec[] = Array.from({ length: 10 }, (_, i) => ({
        id: `q-${i + 1}`,
        correctOptionId: `opt-correct-${i + 1}`,
      }));

      const submissions: SubmissionSpec[] = [
        // 5 correct
        { questionId: 'q-1', selectedOptionId: 'opt-correct-1' },
        { questionId: 'q-2', selectedOptionId: 'opt-correct-2' },
        { questionId: 'q-3', selectedOptionId: 'opt-correct-3' },
        { questionId: 'q-4', selectedOptionId: 'opt-correct-4' },
        { questionId: 'q-5', selectedOptionId: 'opt-correct-5' },
        // 3 wrong
        { questionId: 'q-6', selectedOptionId: 'opt-wrong-6' },
        { questionId: 'q-7', selectedOptionId: 'opt-wrong-7' },
        { questionId: 'q-8', selectedOptionId: 'opt-wrong-8' },
        // q-9 and q-10 unanswered
      ];

      const paper = generateAnswerPaper(questions, submissions);

      expect(paper.totalCorrect).toBe(5);
      expect(paper.totalWrong).toBe(3);
      expect(paper.totalUnanswered).toBe(2);
      expect(paper.score).toBe(7.0);

      // Verify each question's pointsAwarded
      expect(paper.answerPaper[0].pointsAwarded).toBe(2.0);
      expect(paper.answerPaper[0].status).toBe('CORRECT');
      expect(paper.answerPaper[5].pointsAwarded).toBe(-1.0);
      expect(paper.answerPaper[5].status).toBe('WRONG');
      expect(paper.answerPaper[8].pointsAwarded).toBe(0.0);
      expect(paper.answerPaper[8].status).toBe('UNANSWERED');
    });

    it('should preserve negative total score in answer paper without clamping to 0', () => {
      // 5 questions: 0 correct, 5 wrong, 0 unanswered -> score -5.0
      const questions: QuestionSpec[] = Array.from({ length: 5 }, (_, i) => ({
        id: `q-${i + 1}`,
        correctOptionId: `opt-correct-${i + 1}`,
      }));

      const submissions: SubmissionSpec[] = questions.map((q) => ({
        questionId: q.id,
        selectedOptionId: `opt-wrong-${q.id}`,
      }));

      const paper = generateAnswerPaper(questions, submissions);

      expect(paper.totalCorrect).toBe(0);
      expect(paper.totalWrong).toBe(5);
      expect(paper.totalUnanswered).toBe(0);
      expect(paper.score).toBe(-5.0);
      expect(paper.score).toBeLessThan(0);
    });
  });

  // ==========================================================
  // RECALCULATION PRESERVATION TESTS
  // ==========================================================
  describe('Recalculation Safety & State Preservation', () => {
    it('preserves published status when recalculating a previously published round', () => {
      function getNextRoundStatus(currentStatus: RoundStatus): RoundStatus {
        return currentStatus === RoundStatus.RESULTS_PUBLISHED
          ? RoundStatus.RESULTS_PUBLISHED
          : RoundStatus.SCORING_COMPLETE;
      }

      expect(getNextRoundStatus(RoundStatus.RESULTS_PUBLISHED)).toBe(RoundStatus.RESULTS_PUBLISHED);
      expect(getNextRoundStatus(RoundStatus.ROUND_ENDED)).toBe(RoundStatus.SCORING_COMPLETE);
      expect(getNextRoundStatus(RoundStatus.SCORING_COMPLETE)).toBe(RoundStatus.SCORING_COMPLETE);
    });
  });
});
