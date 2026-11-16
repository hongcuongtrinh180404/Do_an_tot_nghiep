import { describe, expect, it } from 'vitest';
import { convertLegacyQuiz } from '../../../../scripts/migrate-quiz-timing.js';

describe('Quiz timing migration', () => {
  it('schedules published legacy quizzes ten seconds after the explanation, capped at video end', () => {
    expect(convertLegacyQuiz({ timestamp: 27 }, true, 120)).toMatchObject({ timestamp: 37, explanationTimestamp: 27 });
    expect(convertLegacyQuiz({ timestamp: 115 }, true, 120)).toMatchObject({ timestamp: 120, explanationTimestamp: 115 });
    expect(convertLegacyQuiz({ timestamp: 0 }, true, 5.9)).toMatchObject({ timestamp: 5, explanationTimestamp: 0 });
    expect(convertLegacyQuiz({ timestamp: 999 }, true, 120.8)).toMatchObject({ timestamp: 120, explanationTimestamp: 120 });
  });

  it('requires manual timing for unpublished legacy quizzes', () => {
    expect(convertLegacyQuiz({ timestamp: 27 }, false, 120)).toMatchObject({ timestamp: null, explanationTimestamp: 27 });
  });

  it('is idempotent even after the instructor changes or clears the scheduled time', () => {
    const migrated = convertLegacyQuiz({ timestamp: 27, question: 'Câu hỏi' }, true, 120);
    for (const timestamp of [null, 0, 95]) {
      const edited = { ...migrated, timestamp };
      expect(convertLegacyQuiz(edited, true, 120)).toEqual(edited);
    }
    const newAiQuiz = { timestamp: null, explanationTimestamp: 15 };
    expect(convertLegacyQuiz(newAiQuiz, true, 120)).toEqual(newAiQuiz);
  });

  it.each([undefined, 0, NaN, Infinity])('refuses to invent the duration of a published video: %s', (duration) => {
    expect(() => convertLegacyQuiz({ timestamp: 27 }, true, duration)).toThrow('duration');
  });
});
