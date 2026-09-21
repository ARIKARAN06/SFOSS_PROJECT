import { describe, it, expect } from 'vitest';
import {
  generateSeed,
  seededShuffle,
  evaluateAnswerChoice,
} from '../packages/shared/src';

describe('Deterministic Shuffling Engine Tests', () => {
  it('should produce identical seeds for the same team and round IDs', () => {
    const seed1 = generateSeed('team-1', 'round-1', 'secret-salt');
    const seed2 = generateSeed('team-1', 'round-1', 'secret-salt');
    expect(seed1).toBe(seed2);
  });

  it('should produce different seeds for different teams', () => {
    const seed1 = generateSeed('team-1', 'round-1', 'secret-salt');
    const seed2 = generateSeed('team-2', 'round-1', 'secret-salt');
    expect(seed1).not.toBe(seed2);
  });

  it('should deterministically shuffle an array', () => {
    const original = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'];
    const seed = 12345678;
    const shuffled1 = seededShuffle(original, seed);
    const shuffled2 = seededShuffle(original, seed);
    expect(shuffled1).toEqual(shuffled2);
  });

  it('should evaluate answers correctly regardless of display shuffle order', () => {
    const masterOptions = [
      { id: 'opt-a', questionId: 'q-1', optionLetter: 'A', optionText: 'Option A', isCorrect: false },
      { id: 'opt-b', questionId: 'q-1', optionLetter: 'B', optionText: 'Option B', isCorrect: true },
      { id: 'opt-c', questionId: 'q-1', optionLetter: 'C', optionText: 'Option C', isCorrect: false },
      { id: 'opt-d', questionId: 'q-1', optionLetter: 'D', optionText: 'Option D', isCorrect: false },
    ];

    // Selecting correct option B (master ID opt-b)
    const resCorrect = evaluateAnswerChoice(masterOptions, 'opt-b');
    expect(resCorrect.isCorrect).toBe(true);
    expect(resCorrect.points).toBe(1.0);

    // Selecting wrong option A (master ID opt-a)
    const resWrong = evaluateAnswerChoice(masterOptions, 'opt-a');
    expect(resWrong.isCorrect).toBe(false);
    expect(resWrong.points).toBe(-1.0);

    // Unanswered
    const resEmpty = evaluateAnswerChoice(masterOptions, null);
    expect(resEmpty.isCorrect).toBe(false);
    expect(resEmpty.points).toBe(0.0);
  });
});
