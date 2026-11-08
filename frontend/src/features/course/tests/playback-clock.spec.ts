import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PlaybackClock } from '../utils/playback-clock';

describe('Real playback clock', () => {
  it('counts actual elapsed time at 1x, 2x and 0.5x', () => {
    for (const rate of [0.5, 1, 2]) {
      const clock = new PlaybackClock();
      clock.begin(0, 0, rate);
      clock.stop(600_000, 600 * rate);
      assert.equal(clock.watchedMs, 600_000);
    }
  });

  it('accumulates repeated viewing rather than unique media coverage', () => {
    const clock = new PlaybackClock();
    clock.begin(0, 0, 1);
    clock.stop(30_000, 30);
    clock.begin(40_000, 0, 1);
    clock.stop(60_000, 20);
    assert.equal(clock.watchedMs, 50_000);
  });

  it('does not count seek gaps or time while paused', () => {
    const clock = new PlaybackClock();
    clock.begin(0, 0, 1);
    clock.sample(10_000, 10);
    clock.seeking();
    clock.sample(11_000, 500);
    clock.begin(11_000, 500, 1);
    clock.stop(21_000, 510);
    clock.sample(60_000, 510);
    assert.equal(clock.watchedMs, 20_000);
  });

  it('does not count buffering and can resume later', () => {
    const clock = new PlaybackClock();
    clock.begin(0, 0, 1);
    clock.stop(10_000, 10);
    clock.sample(50_000, 10);
    clock.begin(50_000, 10, 1);
    clock.stop(60_000, 20);
    assert.equal(clock.watchedMs, 20_000);
  });

  it('caps sleep/frozen-video gaps by verified media movement', () => {
    const clock = new PlaybackClock();
    clock.begin(0, 0, 1);
    clock.sample(10_000, 10);
    clock.sample(610_000, 11);
    assert.equal(clock.watchedMs, 11_000);
  });

  it('allows background playback despite less frequent samples', () => {
    const clock = new PlaybackClock();
    clock.begin(0, 0, 2);
    clock.sample(30_000, 60);
    clock.stop(60_000, 120);
    assert.equal(clock.watchedMs, 60_000);
  });

  it('handles rate changes by starting a new segment', () => {
    const clock = new PlaybackClock();
    clock.begin(0, 0, 1);
    clock.stop(10_000, 10);
    clock.begin(10_000, 10, 2);
    clock.stop(20_000, 30);
    assert.equal(clock.watchedMs, 20_000);
  });

  it('rejects an implausible media jump even if seeking was not reported', () => {
    const clock = new PlaybackClock();
    clock.begin(0, 0, 1);
    clock.sample(1000, 100);
    clock.stop(2000, 101);
    assert.equal(clock.watchedMs, 1000);
  });

  it('does not accumulate rounding errors across quantized media samples', () => {
    const clock = new PlaybackClock();
    clock.begin(0, 0, 1);
    clock.sample(251, 0.2);
    clock.sample(499, 0.5);
    clock.sample(750, 0.7);
    clock.stop(1000, 1);
    assert.equal(clock.watchedMs, 1000);
  });
});
