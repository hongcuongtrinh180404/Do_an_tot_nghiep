import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuizTime, formatQuizTime, normalizeQuizTimeText } from '../utils/quiz-time-input.util';
import { compareQuizTiming, hasQuizTimestamp, isQuizTimestamp } from 'share-lib';

describe('Instructor quiz time input', () => {
  it('distinguishes an empty field from a real zero-second checkpoint', () => {
    assert.deepEqual(parseQuizTime(''), { value: null });
    assert.deepEqual(parseQuizTime('00:00'), { value: 0 });
    assert.equal(formatQuizTime(null), '');
    assert.equal(formatQuizTime(0), '00:00');
  });
  it('validates complete MM:SS, seconds range and the end of the video', () => {
    for (const value of ['0:15', '00:', '00:60', '-1:00', 'abc', '02:01']) {
      assert.ok(parseQuizTime(value, 120).error, value);
    }
    assert.deepEqual(parseQuizTime('02:00', 120), { value: 120 });
    assert.deepEqual(parseQuizTime('125:30', 9000), { value: 7530 });
  });

  it('rejects nonnumeric, fractional, unsafe and out-of-range values without treating zero as empty', () => {
    for (const value of [null, undefined, '', '00:00', NaN, Infinity, -1, 0.5, 121, Number.MAX_SAFE_INTEGER + 1]) {
      assert.equal(isQuizTimestamp(value, 120), false, String(value));
    }
    assert.equal(isQuizTimestamp(0, 120), true);
    assert.equal(isQuizTimestamp(120, 120), true);
    assert.equal(isQuizTimestamp(120, 120.5), true);
    assert.equal(isQuizTimestamp(121, 120.5), false);
  });

  it('lists unscheduled questions first and excludes them from checkpoint markers', () => {
    const quizzes = [
      { id: 'end', timestamp: 120, order: 1 },
      { id: 'zero', timestamp: 0, order: 1 },
      { id: 'draft-b', timestamp: null, order: 2 },
      { id: 'draft-a', timestamp: null, order: 1 },
    ];
    assert.deepEqual([...quizzes].sort(compareQuizTiming).map((quiz) => quiz.id), ['draft-a', 'draft-b', 'zero', 'end']);
    assert.deepEqual(quizzes.filter(hasQuizTimestamp).map((quiz) => quiz.id), ['end', 'zero']);
  });

  it('normalizes single-digit minutes to 2-digit format for seamless editing', () => {
    assert.equal(normalizeQuizTimeText('1:20'), '01:20');
    assert.equal(normalizeQuizTimeText('0:15'), '00:15');
    assert.equal(normalizeQuizTimeText('01:20'), '01:20');
    assert.equal(normalizeQuizTimeText('12:45'), '12:45');
    assert.equal(normalizeQuizTimeText(''), '');
  });
});
