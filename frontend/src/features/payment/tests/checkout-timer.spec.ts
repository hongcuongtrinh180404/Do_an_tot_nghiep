import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function formatCountdown(secondsRemaining: number): string {
  if (secondsRemaining <= 0) return '00:00';
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function calculateSecondsRemaining(expiresAtIso: string, nowMs: number): number {
  const target = new Date(expiresAtIso).getTime();
  return Math.max(0, Math.floor((target - nowMs) / 1000));
}

describe('Checkout Timer & Formatting Logic', () => {
  it('should format 15 minutes properly', () => {
    assert.equal(formatCountdown(15 * 60), '15:00');
  });

  it('should format remaining minutes and single-digit seconds', () => {
    assert.equal(formatCountdown(9 * 60 + 5), '09:05');
  });

  it('should return 00:00 when time is zero or negative', () => {
    assert.equal(formatCountdown(0), '00:00');
    assert.equal(formatCountdown(-10), '00:00');
  });

  it('should calculate remaining seconds accurately between now and expiresAt', () => {
    const now = Date.now();
    const expiresAt = new Date(now + 14 * 60 * 1000 + 30 * 1000).toISOString(); // 14m 30s
    const diff = calculateSecondsRemaining(expiresAt, now);
    assert.equal(diff, 14 * 60 + 30);
    assert.equal(formatCountdown(diff), '14:30');
  });

  it('should return 0 seconds remaining if expiresAt has passed', () => {
    const now = Date.now();
    const pastExpiresAt = new Date(now - 10000).toISOString();
    assert.equal(calculateSecondsRemaining(pastExpiresAt, now), 0);
  });
});
