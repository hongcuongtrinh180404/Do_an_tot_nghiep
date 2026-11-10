import type { IStudentLessonQuiz } from 'share-lib';

export interface ActiveLessonCheckpoint {
  timestamp: number;
  quizzes: IStudentLessonQuiz[];
  required: boolean;
}

interface PlayerPort {
  position: () => number;
  duration: () => number;
  paused: () => boolean;
  seek: (seconds: number) => void;
  pause: () => void;
  play: () => void;
  show: (checkpoint: ActiveLessonCheckpoint | null) => void;
}

export function groupQuizCheckpoints<T extends { timestamp: number; order: number; id: string }>(quizzes: T[]): Map<number, T[]> {
  const result = new Map<number, T[]>();
  for (const quiz of [...quizzes].sort((a, b) => a.timestamp - b.timestamp || a.order - b.order || a.id.localeCompare(b.id))) {
    const timestamp = Math.round(quiz.timestamp);
    const key = [...result.keys()].find((existing) => Math.abs(existing - timestamp) <= 2) ?? timestamp;
    result.set(key, [...(result.get(key) ?? []), quiz]);
  }
  return result;
}

/** The only owner of checkpoint/seek transitions. Saved answers are owned by the server. */
export class LessonCheckpointController {
  private checkpoints = new Map<number, IStudentLessonQuiz[]>();
  private ready = false;
  private enforced = false;
  private active: ActiveLessonCheckpoint | null = null;
  private pendingTarget: number | null = null;
  private lastTime = 0;
  private internalTarget: number | null = null;
  private resumeAfter = false;
  private zeroHandled = false;

  constructor(private readonly port: PlayerPort) {}

  setData(quizzes: IStudentLessonQuiz[], ready: boolean, enforced: boolean): void {
    this.checkpoints = groupQuizCheckpoints(quizzes);
    this.ready = ready;
    this.enforced = enforced;
    if (!ready) { this.port.pause(); return; }
    if (this.active?.required || this.pendingTarget !== null) this.drain();
    else if (this.active) {
      const current = this.checkpoints.get(this.active.timestamp);
      if (current && enforced && current.some((quiz) => !quiz.answer)) {
        this.active = { ...this.active, quizzes: current, required: true };
        this.drain();
      } else if (current) this.show({ ...this.active, quizzes: current });
      else this.close();
    }
  }

  private show(checkpoint: ActiveLessonCheckpoint | null): void {
    this.active = checkpoint;
    this.port.show(checkpoint);
  }

  private rawSeek(target: number): void {
    this.lastTime = target;
    this.internalTarget = target;
    this.zeroHandled = target > 0;
    this.port.seek(target);
  }

  private blocker(target: number): ActiveLessonCheckpoint | null {
    if (!this.enforced) return null;
    for (const [timestamp, quizzes] of this.checkpoints) {
      const remaining = quizzes.filter((quiz) => !quiz.answer);
      if (timestamp <= target + 0.01 && remaining.length > 0) return { timestamp, quizzes: remaining, required: true };
    }
    return null;
  }

  private drain(): void {
    const target = this.pendingTarget ?? this.active?.timestamp ?? this.port.position();
    const next = this.blocker(target);
    if (next) {
      if (this.pendingTarget !== null) this.resumeAfter = true;
      this.port.pause();
      if (Math.abs(this.port.position() - next.timestamp) > 0.01) this.rawSeek(next.timestamp);
      else this.lastTime = next.timestamp;
      this.zeroHandled = true;
      this.show(next);
      return;
    }
    this.show(null);
    this.pendingTarget = null;
    if (Math.abs(this.port.position() - target) > 0.01) this.rawSeek(target);
    else this.lastTime = target;
    this.zeroHandled = true;
    if (target >= this.port.duration() - 0.01) this.port.pause();
    else if (this.resumeAfter) this.port.play();
  }

  requestSeek(seconds: number): void {
    if (!Number.isFinite(seconds)) return;
    const duration = this.port.duration();
    if (!Number.isFinite(duration) || duration <= 0) return;
    const target = Math.max(0, Math.min(seconds, duration));
    if (target < this.lastTime - 0.01) {
      this.pendingTarget = null;
      this.show(null);
      this.rawSeek(target);
      return;
    }
    if (!this.active && this.pendingTarget === null) this.resumeAfter = !this.port.paused();
    this.pendingTarget = target; // Replace, never append: only the latest destination survives.
    if (!this.ready) {
      this.port.pause();
      return;
    }
    this.drain();
  }

  seeking(position: number): void {
    if (this.internalTarget !== null && Math.abs(position - this.internalTarget) < 0.05) return;
    this.requestSeek(position);
  }

  seeked(): void { this.internalTarget = null; }

  ended(): void {
    if (!this.ready || this.active) return;
    const position = this.port.position();
    const crossed = [...this.checkpoints].find(([timestamp]) => timestamp > this.lastTime && timestamp <= position);
    const next = this.blocker(position) ?? (crossed ? { timestamp: crossed[0], quizzes: crossed[1], required: false } : null);
    if (next) {
      this.resumeAfter = false;
      this.port.pause();
      this.rawSeek(next.timestamp);
      this.zeroHandled = true;
      this.show(next);
    }
  }

  play(): void {
    if (!this.ready) { this.port.pause(); return; }
    if (this.active) { this.port.pause(); return; }
    const next = this.blocker(this.port.position());
    if (next) {
      this.resumeAfter = true;
      this.port.pause();
      this.rawSeek(next.timestamp);
      this.zeroHandled = true;
      this.show(next);
    }
  }

  timeUpdate(position: number): void {
    if (!this.ready || this.active || this.port.paused()) return;
    if (position < this.lastTime) { this.lastTime = position; this.zeroHandled = false; return; }
    const previous = this.lastTime;
    this.lastTime = position;
    const mandatory = this.blocker(position);
    const crossed = [...this.checkpoints].find(([timestamp]) =>
      (timestamp > previous && timestamp <= position) || (timestamp === 0 && !this.zeroHandled));
    const checkpoint = mandatory ?? (crossed ? { timestamp: crossed[0], quizzes: crossed[1], required: false } : null);
    if (!checkpoint) return;
    this.resumeAfter = true;
    this.port.pause();
    this.rawSeek(checkpoint.timestamp);
    this.zeroHandled = true;
    this.show(checkpoint);
  }

  openCheckpoint(timestamp: number): void {
    timestamp = [...this.checkpoints.keys()].find((key) => Math.abs(key - timestamp) <= 2) ?? timestamp;
    const wasPlaying = !this.port.paused();
    this.requestSeek(timestamp);
    if (this.active?.required || !this.ready) return;
    const quizzes = this.checkpoints.get(timestamp);
    if (!quizzes) return;
    this.resumeAfter = wasPlaying;
    this.port.pause();
    const required = this.enforced && quizzes.some((quiz) => !quiz.answer);
    this.show({ timestamp, quizzes: required ? quizzes.filter((quiz) => !quiz.answer) : quizzes, required });
  }

  close(): void {
    const required = this.active?.required;
    this.show(null);
    if (required) { this.port.pause(); return; }
    this.pendingTarget = null;
    this.zeroHandled = true;
    if (this.resumeAfter && this.port.position() < this.port.duration() - 0.01) this.port.play();
  }
}
