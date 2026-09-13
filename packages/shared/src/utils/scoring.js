"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRawScore = calculateRawScore;
exports.rankTeamResults = rankTeamResults;
/**
 * Calculates raw score from correct, wrong, and unanswered counts.
 * Formula: (Correct * +1) + (Wrong * -1) + (Unanswered * 0)
 */
function calculateRawScore(correct, wrong) {
    return correct * 1.0 + wrong * -1.0;
}
/**
 * Sorts team results according to the official 5-tier tie-breaking protocol:
 * 1. Total Score (Descending)
 * 2. DEBUGNOVA (Round 2) Score (Descending)
 * 3. Fewest Incorrect Answers (Ascending - lowest penalty points)
 * 4. Earliest Submission Timestamp (Ascending)
 * 5. Fewest Anti-Cheat Violation Warnings (Ascending)
 */
function rankTeamResults(results) {
    const sorted = [...results].sort((a, b) => {
        // Tier 1: Total Score (Descending)
        if (b.score !== a.score) {
            return b.score - a.score;
        }
        // Tier 2: DEBUGNOVA (Round 2) Score (Descending)
        const r2ScoreA = a.round2Score ?? a.score;
        const r2ScoreB = b.round2Score ?? b.score;
        if (r2ScoreB !== r2ScoreA) {
            return r2ScoreB - r2ScoreA;
        }
        // Tier 3: Fewest Incorrect Answers (Ascending)
        if (a.totalWrong !== b.totalWrong) {
            return a.totalWrong - b.totalWrong;
        }
        // Tier 4: Earliest Submission Timestamp (Ascending)
        if (a.lastSubmittedAt && b.lastSubmittedAt) {
            const timeA = new Date(a.lastSubmittedAt).getTime();
            const timeB = new Date(b.lastSubmittedAt).getTime();
            if (timeA !== timeB) {
                return timeA - timeB;
            }
        }
        // Tier 5: Fewest Anti-Cheat Violation Warnings (Ascending)
        return a.antiCheatViolationCount - b.antiCheatViolationCount;
    });
    return sorted.map((res, index) => ({
        id: `${res.teamId}-${res.roundId}`,
        teamId: res.teamId,
        teamName: res.teamName,
        roundId: res.roundId,
        roundName: res.roundName,
        totalCorrect: res.totalCorrect,
        totalWrong: res.totalWrong,
        totalUnanswered: res.totalUnanswered,
        score: res.score,
        rank: index + 1,
        antiCheatViolationCount: res.antiCheatViolationCount,
        lastSubmittedAt: res.lastSubmittedAt,
    }));
}
//# sourceMappingURL=scoring.js.map