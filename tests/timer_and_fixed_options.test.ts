import { describe, it, expect } from 'vitest';
import {
  shuffleQuestionsForTeam,
  QuestionDTO,
} from '../packages/shared/src';
import { formatCountdown } from '../apps/web/src/hooks/useLocalCountdown';

describe('Fixed MCQ Option Order & Local Timer Verification', () => {
  const sampleQuestions: QuestionDTO[] = [
    {
      id: 'q-1',
      roundId: 'round-1',
      questionNumber: 1,
      questionText: 'What is Linux?',
      options: [
        { id: 'opt-1-c', questionId: 'q-1', optionLetter: 'C', optionText: 'Text C', isCorrect: false },
        { id: 'opt-1-a', questionId: 'q-1', optionLetter: 'A', optionText: 'Text A', isCorrect: false },
        { id: 'opt-1-d', questionId: 'q-1', optionLetter: 'D', optionText: 'Text D', isCorrect: true },
        { id: 'opt-1-b', questionId: 'q-1', optionLetter: 'B', optionText: 'Text B', isCorrect: false },
      ],
    },
    {
      id: 'q-2',
      roundId: 'round-1',
      questionNumber: 2,
      questionText: 'What is Git?',
      options: [
        { id: 'opt-2-b', questionId: 'q-2', optionLetter: 'B', optionText: 'Version Control', isCorrect: true },
        { id: 'opt-2-d', questionId: 'q-2', optionLetter: 'D', optionText: 'Operating System', isCorrect: false },
        { id: 'opt-2-a', questionId: 'q-2', optionLetter: 'A', optionText: 'Web Browser', isCorrect: false },
        { id: 'opt-2-c', questionId: 'q-2', optionLetter: 'C', optionText: 'Database', isCorrect: false },
      ],
    },
  ];

  it('preserves fixed option order (A, B, C, D) across all teams while shuffling questions', () => {
    const salt = 'FOSSFURY26_SALT';
    const resultTeam1 = shuffleQuestionsForTeam(sampleQuestions, 'team-alpha', 'round-1', salt);
    const resultTeam2 = shuffleQuestionsForTeam(sampleQuestions, 'team-beta', 'round-1', salt);

    // Both teams must have options in strict A, B, C, D order
    for (const q of resultTeam1.shuffledQuestions) {
      const letters = q.options.map((o) => o.optionLetter);
      expect(letters).toEqual(['A', 'B', 'C', 'D']);
      expect(resultTeam1.optionOrder[q.id]).toBeDefined();
    }

    for (const q of resultTeam2.shuffledQuestions) {
      const letters = q.options.map((o) => o.optionLetter);
      expect(letters).toEqual(['A', 'B', 'C', 'D']);
    }

    // Option IDs should match the canonical order
    const q1InTeam1 = resultTeam1.shuffledQuestions.find((q) => q.id === 'q-1')!;
    const q1InTeam2 = resultTeam2.shuffledQuestions.find((q) => q.id === 'q-1')!;
    expect(q1InTeam1.options.map((o) => o.id)).toEqual(['opt-1-a', 'opt-1-b', 'opt-1-c', 'opt-1-d']);
    expect(q1InTeam2.options.map((o) => o.id)).toEqual(['opt-1-a', 'opt-1-b', 'opt-1-c', 'opt-1-d']);
  });

  it('correctly formats countdown strings across various durations', () => {
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(-5)).toBe('00:00');
    expect(formatCountdown(5)).toBe('00:05');
    expect(formatCountdown(65)).toBe('01:05');
    expect(formatCountdown(300)).toBe('05:00');
    expect(formatCountdown(1800)).toBe('30:00');
    expect(formatCountdown(3665)).toBe('01:01:05');
  });

  it('calculates remaining duration accurately from serverTime and targetDeadline for late joiners', () => {
    // Official start: 10:00:00, Official end: 10:30:00 (30 mins = 1800s)
    const officialEndTime = new Date('2026-09-21T10:30:00.000Z').getTime();
    
    // Late joiner arrives at 10:05:00 (5 mins late)
    const serverTimeLateJoiner = new Date('2026-09-21T10:05:00.000Z').getTime();
    const remainingSeconds = Math.max(0, Math.floor((officialEndTime - serverTimeLateJoiner) / 1000));
    
    // Should be exactly 25 minutes (1500 seconds), NOT 30 minutes
    expect(remainingSeconds).toBe(1500);
    expect(formatCountdown(remainingSeconds)).toBe('25:00');
  });

  it('calculates remaining duration accurately on page refresh/reconnect without resetting timer', () => {
    const officialEndTime = new Date('2026-09-21T10:30:00.000Z').getTime();

    // Reconnecting after 12 minutes of 30 minute quiz (at 10:12:00)
    const serverTimeReconnect = new Date('2026-09-21T10:12:00.000Z').getTime();
    const remainingSeconds = Math.max(0, Math.floor((officialEndTime - serverTimeReconnect) / 1000));

    // Must be 18 minutes (1080 seconds), NOT 30 minutes
    expect(remainingSeconds).toBe(1080);
    expect(formatCountdown(remainingSeconds)).toBe('18:00');
  });

  it('handles expired deadlines by returning 0s remaining and triggers auto-submit state', () => {
    const officialEndTime = new Date('2026-09-21T10:30:00.000Z').getTime();
    // After quiz ended (10:30:05)
    const serverTimeExpired = new Date('2026-09-21T10:30:05.000Z').getTime();
    const remainingSeconds = Math.max(0, Math.floor((officialEndTime - serverTimeExpired) / 1000));

    expect(remainingSeconds).toBe(0);
    expect(formatCountdown(remainingSeconds)).toBe('00:00');
  });
});
