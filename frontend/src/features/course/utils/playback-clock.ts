/** A monotonic real-time clock. Media movement only verifies playback; seeking never earns time. */
export class PlaybackClock {
  private running = false;
  private lastNow = 0;
  private lastPosition = 0;
  private rate = 1;
  private wallMs = 0;
  private mediaMs = 0;
  private segmentCreditedMs = 0;
  private totalMs = 0;

  begin(now: number, position: number, rate: number): void {
    this.running = true;
    this.lastNow = now;
    this.lastPosition = position;
    this.rate = rate > 0 ? rate : 1;
    this.wallMs = this.mediaMs = this.segmentCreditedMs = 0;
  }

  sample(now: number, position: number): void {
    if (!this.running) return;
    const wallDelta = Math.max(0, now - this.lastNow);
    const mediaDelta = position - this.lastPosition;
    this.lastNow = now;
    this.lastPosition = position;
    // Defence in depth if a seek event was missed, including backward replays.
    if (mediaDelta < 0 || mediaDelta > wallDelta / 1000 * this.rate + 0.5) {
      this.wallMs = this.mediaMs = this.segmentCreditedMs = 0;
      return;
    }
    this.wallMs += wallDelta;
    this.mediaMs += Math.max(0, mediaDelta) / this.rate * 1000;
    // Use cumulative segment bounds so media-clock quantization doesn't lose time at every sample.
    // A sleeping device/frozen video cannot turn its wall-clock gap into credited playback.
    const credit = Math.min(this.wallMs, this.mediaMs);
    this.totalMs += Math.max(0, credit - this.segmentCreditedMs);
    this.segmentCreditedMs = credit;
  }

  stop(now: number, position: number): void {
    this.sample(now, position);
    this.running = false;
  }

  seeking(): void {
    this.running = false;
  }

  get watchedMs(): number {
    return Math.floor(this.totalMs);
  }
}
