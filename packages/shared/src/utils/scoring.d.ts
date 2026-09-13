import { FinalResultDTO } from '../types';
export interface RawScoreInput {
    teamId: string;
    teamName: string;
    roundId: string;
    roundName: string;
    totalCorrect: number;
    totalWrong: number;
    totalUnanswered: number;
    antiCheatViolationCount: number;
    lastSubmittedAt?: string | null;
}
/**
 * Calculates raw score from correct, wrong, and unanswered counts.
 * Formula: (Correct * +1) + (Wrong * -1) + (Unanswered * 0)
 */
export declare function calculateRawScore(correct: number, wrong: number): number;
/**
 * Sorts team results according to the official 5-tier tie-breaking protocol:
 * 1. Total Score (Descending)
 * 2. DEBUGNOVA (Round 2) Score (Descending)
 * 3. Fewest Incorrect Answers (Ascending - lowest penalty points)
 * 4. Earliest Submission Timestamp (Ascending)
 * 5. Fewest Anti-Cheat Violation Warnings (Ascending)
 */
export declare function rankTeamResults(results: (RawScoreInput & {
    score: number;
    round2Score?: number;
})[]): FinalResultDTO[];
//# sourceMappingURL=scoring.d.ts.map