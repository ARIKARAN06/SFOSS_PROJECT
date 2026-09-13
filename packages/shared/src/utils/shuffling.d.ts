import { QuestionDTO, OptionDTO } from '../types';
/**
 * Generates a deterministic pseudo-random number generator (PRNG) seed
 * using HMAC-SHA256 over TeamID + RoundID and a Server Secret Salt.
 */
export declare function generateSeed(teamId: string, roundId: string, secretSalt: string): number;
/**
 * Seeded Fisher-Yates array shuffling algorithm.
 * Returns a new array with items shuffled deterministically according to the PRNG seed.
 */
export declare function seededShuffle<T>(array: T[], seed: number): T[];
/**
 * Generates participant-specific shuffled question order and option order for a team session.
 */
export declare function shuffleQuestionsForTeam(questions: QuestionDTO[], teamId: string, roundId: string, secretSalt: string): {
    shuffledQuestions: QuestionDTO[];
    questionOrder: string[];
    optionOrder: Record<string, string[]>;
};
/**
 * Resolves participant selected option ID against master question correct answer.
 */
export declare function evaluateAnswerChoice(masterOptions: OptionDTO[], selectedOptionId: string | null | undefined): {
    isCorrect: boolean;
    points: number;
};
//# sourceMappingURL=shuffling.d.ts.map