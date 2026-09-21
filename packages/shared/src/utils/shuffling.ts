import crypto from 'crypto';
import { QuestionDTO, OptionDTO } from '../types';

/**
 * Generates a deterministic pseudo-random number generator (PRNG) seed
 * using HMAC-SHA256 over TeamID + RoundID and a Server Secret Salt.
 */
export function generateSeed(teamId: string, roundId: string, secretSalt: string): number {
  const hmac = crypto.createHmac('sha256', secretSalt);
  hmac.update(`${teamId}:${roundId}`);
  const hex = hmac.digest('hex');
  // Convert first 8 hex chars to unsigned 32-bit integer
  return parseInt(hex.substring(0, 8), 16);
}

/**
 * Seeded Mulberry32 Pseudo-Random Number Generator.
 * Returns a floating point number in range [0, 1).
 */
function createPRNG(seed: number) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Seeded Fisher-Yates array shuffling algorithm.
 * Returns a new array with items shuffled deterministically according to the PRNG seed.
 */
export function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  const prng = createPRNG(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

/**
 * Generates participant-specific shuffled question order and option order for a team session.
 */
export function shuffleQuestionsForTeam(
  questions: QuestionDTO[],
  teamId: string,
  roundId: string,
  secretSalt: string
): {
  shuffledQuestions: QuestionDTO[];
  questionOrder: string[]; // Master Question IDs in rendered order
  optionOrder: Record<string, string[]>; // Master QuestionID -> Master Option IDs in rendered order
} {
  const masterSeed = generateSeed(teamId, roundId, secretSalt);

  // 1. Shuffle Question Order (preserved as configured)
  const shuffledQuestions = seededShuffle(questions, masterSeed);
  const questionOrder = shuffledQuestions.map((q) => q.id);

  // 2. FIXED Option Order per Question (NO OPTION SHUFFLING)
  // All participants see options in the exact Admin-configured order (A, B, C, D)
  const optionOrder: Record<string, string[]> = {};
  const processedQuestions = shuffledQuestions.map((q) => {
    // Stable sort by optionLetter ('A', 'B', 'C', 'D')
    const fixedOptions = [...q.options].sort((a, b) =>
      (a.optionLetter || '').localeCompare(b.optionLetter || '')
    );
    optionOrder[q.id] = fixedOptions.map((opt) => opt.id);
    return {
      ...q,
      options: fixedOptions,
    };
  });

  return {
    shuffledQuestions: processedQuestions,
    questionOrder,
    optionOrder,
  };
}

/**
 * Resolves participant selected option ID against master question correct answer.
 */
export function evaluateAnswerChoice(
  masterOptions: OptionDTO[],
  selectedOptionId: string | null | undefined
): {
  isCorrect: boolean;
  points: number;
} {
  if (!selectedOptionId) {
    return { isCorrect: false, points: 0.0 };
  }

  const selectedOption = masterOptions.find((opt) => opt.id === selectedOptionId);
  if (!selectedOption) {
    return { isCorrect: false, points: -1.0 };
  }

  if (selectedOption.isCorrect === true) {
    return { isCorrect: true, points: 1.0 };
  }

  return { isCorrect: false, points: -1.0 };
}
