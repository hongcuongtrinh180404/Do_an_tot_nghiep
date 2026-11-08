import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { LearningStatusEnum, PLAYBACK_LEASE_MS } from 'share-lib';
import { validate } from 'class-validator';
import { LearningProgressService } from '../services/learning-progress.service.js';
import { LearningProgressRepository } from '../repositories/learning-progress.repository.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { PlaybackHeartbeatDto, StartPlaybackSessionDto } from '../dto/playback-session.dto.js';
import { type LearningProgressState, LearningProgressSchema } from '../schemas/learning-progress.schema.js';
import { type CourseVideoStats, summarizeProgress } from '../utils/learning-progress.util.js';

const userId = 'user-a';
const courseId = 'course-a';
const lessonId = 'lesson-a';
const sessionId = 'b59b3e97-4665-4210-881a-c05d6069f56c';
const otherSessionId = 'a9ab8a7f-4593-4dd4-a9c6-2bba1484bb66';

function emptyState(user = userId, course = courseId): LearningProgressState {
  return {
    id: `${user}:${course}`, userId: user, courseId: course, watchedMs: 0,
    lastLessonId: null, lastMediaUrl: null, lastPositionSeconds: 0,
    sessionId: null, sessionLessonId: null, sessionMediaUrl: null, sessionExpiresAt: null,
    lastHeartbeatAt: null, sessionWatchedMs: 0, lastSequence: 0, sessionClosed: false,
    revision: 0, updatedAt: new Date(),
  };
}

function videoStats(course = courseId): CourseVideoStats {
  return { courseId: course, totalSeconds: 6000, videoCount: 1, missingDurationCount: 0,
    videos: [{ lessonId, url: '/video.mp4', durationSeconds: 6000 }] };
}

function harness() {
  const states = new Map<string, LearningProgressState>();
  const stats = [videoStats(), videoStats('course-b')];
  const key = (user: string, course: string) => `${user}:${course}`;
  const repo = {
    ensureExists: vi.fn(async (user: string, course: string) => {
      if (!states.has(key(user, course))) states.set(key(user, course), emptyState(user, course));
    }),
    findForCourse: vi.fn(async (user: string, course: string) => structuredClone(states.get(key(user, course)) ?? null)),
    findForCourses: vi.fn(async (user: string, courses: string[]) => [...states.values()].filter((state) => state.userId === user && courses.includes(state.courseId))),
    compareAndSet: vi.fn(async (state: LearningProgressState, changes: Partial<LearningProgressState>) => {
      const current = states.get(key(state.userId, state.courseId));
      if (!current || current.revision !== state.revision) return false;
      states.set(key(state.userId, state.courseId), { ...current, ...changes, revision: current.revision + 1 });
      return true;
    }),
  };
  const enrollment = {
    findByUserAndCourse: vi.fn(async () => ({ id: 'enrolled', deletedAt: null })),
    findUserEnrollments: vi.fn(async () => [{ courseId, course: { id: courseId } }]),
  };
  const course = { findById: vi.fn(async () => ({ id: courseId, instructorId: userId })) };
  const lesson = { getCourseVideoStats: vi.fn(async (ids: string[]) => stats.filter((item) => ids.includes(item.courseId))) };
  const service = new LearningProgressService(repo as unknown as LearningProgressRepository,
    enrollment as unknown as EnrollmentRepository, course as unknown as CourseRepository, lesson as unknown as LessonRepository);
  return { service, repo, enrollment, stats, states, state: () => states.get(key(userId, courseId))! };
}

describe('Learning progress protocol', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-08T00:00:00Z')); });
  afterEach(() => vi.useRealTimers());

  it('records 30 + 20 replay + 50 minutes, independently of lesson coverage', async () => {
    const h = harness();
    await h.service.startSession(userId, courseId, { sessionId, lessonId });
    let cumulative = 0;
    let sequence = 0;
    const watch = async (minutes: number) => {
      for (let n = 0; n < minutes * 4; n++) {
        vi.setSystemTime(Date.now() + 15_000);
        cumulative += 15_000;
        await h.service.heartbeat(userId, courseId, { sessionId, sequence: ++sequence, watchedMs: cumulative, positionSeconds: 10 });
      }
      return h.service.getProgress(userId, courseId);
    };
    expect((await watch(30))?.progressPercent).toBe(30);
    expect((await watch(20))?.progressPercent).toBe(50);
    expect((await watch(50))?.status).toBe(LearningStatusEnum.COMPLETED);
    expect(h.state().watchedMs).toBe(6_000_000);
    expect(h.state().lastPositionSeconds).toBe(10);
  });

  it('caps claimed time by server elapsed, not media position or claimed speed', async () => {
    const h = harness();
    await h.service.startSession(userId, courseId, { sessionId, lessonId });
    vi.setSystemTime(Date.now() + 10_000);
    const result = await h.service.heartbeat(userId, courseId, { sessionId, sequence: 1, watchedMs: 20_000, positionSeconds: 1000 });
    expect(result.progress.watchedMs).toBe(10_000);
    // A rapid subsequent request cannot spend that same elapsed interval again.
    await h.service.heartbeat(userId, courseId, { sessionId, sequence: 2, watchedMs: 30_000, positionSeconds: 3000 });
    expect(h.state().watchedMs).toBe(10_000);
  });

  it('saves a paused seek without adding time, and supports backward resume positions', async () => {
    const h = harness();
    await h.service.startSession(userId, courseId, { sessionId, lessonId });
    vi.setSystemTime(Date.now() + 10_000);
    await h.service.heartbeat(userId, courseId, { sessionId, sequence: 1, watchedMs: 10_000, positionSeconds: 500 });
    vi.setSystemTime(Date.now() + 10_000);
    await h.service.heartbeat(userId, courseId, { sessionId, sequence: 2, watchedMs: 10_000, positionSeconds: 100 });
    expect(h.state().watchedMs).toBe(10_000);
    expect(h.state().lastPositionSeconds).toBe(100);
  });

  it('makes duplicate and out-of-order writes idempotent, including final saves', async () => {
    const h = harness();
    await h.service.startSession(userId, courseId, { sessionId, lessonId });
    vi.setSystemTime(Date.now() + 15_000);
    const final = { sessionId, sequence: 2, watchedMs: 15_000, positionSeconds: 25 };
    await h.service.heartbeat(userId, courseId, final, true);
    await h.service.heartbeat(userId, courseId, final, true);
    await h.service.heartbeat(userId, courseId, { ...final, sequence: 1, positionSeconds: 5 });
    expect(h.state().watchedMs).toBe(15_000);
    expect(h.state().lastPositionSeconds).toBe(25);
    expect(h.state().sessionClosed).toBe(true);
  });

  it('allows exactly one concurrent tab/device to claim the course', async () => {
    const h = harness();
    const results = await Promise.allSettled([
      h.service.startSession(userId, courseId, { sessionId, lessonId }),
      h.service.startSession(userId, courseId, { sessionId: otherSessionId, lessonId }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(h.state().revision).toBe(1);
  });

  it('does not double-credit concurrent duplicate heartbeats', async () => {
    const h = harness();
    await h.service.startSession(userId, courseId, { sessionId, lessonId });
    vi.setSystemTime(Date.now() + 15_000);
    const dto = { sessionId, sequence: 1, watchedMs: 15_000, positionSeconds: 15 };
    await Promise.all([h.service.heartbeat(userId, courseId, dto), h.service.heartbeat(userId, courseId, dto)]);
    expect(h.state().watchedMs).toBe(15_000);
  });

  it('releases immediately on pause/end and fences delayed writes from the previous session', async () => {
    const h = harness();
    await h.service.startSession(userId, courseId, { sessionId, lessonId });
    await h.service.heartbeat(userId, courseId, { sessionId, sequence: 1, watchedMs: 0, positionSeconds: 0 }, true);
    await h.service.startSession(userId, courseId, { sessionId: otherSessionId, lessonId });
    await expect(h.service.heartbeat(userId, courseId, { sessionId, sequence: 2, watchedMs: 1000, positionSeconds: 10 })).rejects.toBeInstanceOf(ConflictException);
    expect(h.state().sessionId).toBe(otherSessionId);
  });

  it('expires abandoned sessions and never credits offline backfill', async () => {
    const h = harness();
    await h.service.startSession(userId, courseId, { sessionId, lessonId });
    vi.setSystemTime(Date.now() + PLAYBACK_LEASE_MS);
    await expect(h.service.heartbeat(userId, courseId, { sessionId, sequence: 1, watchedMs: 45_000, positionSeconds: 45 })).rejects.toBeInstanceOf(ConflictException);
    await h.service.startSession(userId, courseId, { sessionId: otherSessionId, lessonId });
    expect(h.state().watchedMs).toBe(0);
  });

  it('start retries do not reset time budgets or the sequence cursor', async () => {
    const h = harness();
    await h.service.startSession(userId, courseId, { sessionId, lessonId });
    vi.setSystemTime(Date.now() + 1000);
    await h.service.heartbeat(userId, courseId, { sessionId, sequence: 1, watchedMs: 1000, positionSeconds: 1 });
    await h.service.startSession(userId, courseId, { sessionId, lessonId });
    expect(h.state().lastSequence).toBe(1);
    expect(h.state().sessionWatchedMs).toBe(1000);
  });

  it('requires actual enrollment, even when the requester is the author/admin', async () => {
    const h = harness();
    h.enrollment.findByUserAndCourse.mockResolvedValue(null as never);
    expect(await h.service.getProgress(userId, courseId)).toBeNull();
    await expect(h.service.startSession(userId, courseId, { sessionId, lessonId })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(h.service.heartbeat(userId, courseId, { sessionId, sequence: 1, watchedMs: 10, positionSeconds: 0 })).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.repo.ensureExists).not.toHaveBeenCalled();
  });

  it('rejects videos in another course, deleted lessons and replaced media', async () => {
    const h = harness();
    await expect(h.service.startSession(userId, courseId, { sessionId, lessonId: 'foreign-lesson' })).rejects.toBeInstanceOf(BadRequestException);
    await h.service.startSession(userId, courseId, { sessionId, lessonId });
    h.stats[0].videos[0].url = '/replacement.mp4';
    await expect(h.service.heartbeat(userId, courseId, { sessionId, sequence: 1, watchedMs: 10, positionSeconds: 0 })).rejects.toBeInstanceOf(ConflictException);
  });

  it('keeps independent progress per user and course', async () => {
    const h = harness();
    await h.service.startSession(userId, courseId, { sessionId, lessonId });
    await h.service.startSession('user-b', courseId, { sessionId, lessonId });
    await h.service.startSession(userId, 'course-b', { sessionId, lessonId });
    vi.setSystemTime(Date.now() + 10_000);
    await h.service.heartbeat(userId, courseId, { sessionId, sequence: 1, watchedMs: 10_000, positionSeconds: 10 });
    expect((await h.service.getProgress('user-b', courseId))?.watchedMs).toBe(0);
    expect((await h.service.getProgress(userId, 'course-b'))?.watchedMs).toBe(0);
    expect((await h.service.getMyProgress(userId))[0].watchedMs).toBe(10_000);
  });
});

describe('Current-curriculum progress', () => {
  it('recalculates completed learners, retaining uncapped historical watch time', () => {
    const state = { ...emptyState(), watchedMs: 6_000_000 };
    const stats = videoStats();
    expect(summarizeProgress(courseId, state, stats).status).toBe(LearningStatusEnum.COMPLETED);
    stats.totalSeconds = 7200;
    const changed = summarizeProgress(courseId, state, stats);
    expect(changed.progressPercent).toBe(83.33);
    expect(changed.status).toBe(LearningStatusEnum.IN_PROGRESS);
    expect(summarizeProgress(courseId, { ...state, watchedMs: 8_000_000 }, stats).progressPercent).toBe(100);
    stats.totalSeconds = 3000;
    expect(summarizeProgress(courseId, state, stats).progressPercent).toBe(100);
    expect(state.watchedMs).toBe(6_000_000);
  });

  it('never displays 100% early due to rounding', () => {
    expect(summarizeProgress(courseId, { ...emptyState(), watchedMs: 5_999_999 }, videoStats()).progressPercent).toBe(99.99);
  });

  it('does not auto-complete a zero-video or incomplete-duration course', () => {
    const state = { ...emptyState(), watchedMs: 9_000_000 };
    for (const stats of [undefined, { ...videoStats(), videoCount: 0 }, { ...videoStats(), missingDurationCount: 1 }, { ...videoStats(), totalSeconds: 0 }]) {
      const result = summarizeProgress(courseId, state, stats);
      expect(result.progressPercent).toBeNull();
      expect(result.status).toBe(LearningStatusEnum.IN_PROGRESS);
    }
  });

  it('drops stale resume pointers after deletion/replacement without dropping watch time', () => {
    const state = { ...emptyState(), watchedMs: 1000, lastLessonId: lessonId, lastMediaUrl: '/video.mp4', lastPositionSeconds: 9000 };
    const stats = videoStats();
    expect(summarizeProgress(courseId, state, stats).lastPositionSeconds).toBe(6000);
    stats.videos[0].url = '/new.mp4';
    expect(summarizeProgress(courseId, state, stats).lastLessonId).toBeNull();
    expect(summarizeProgress(courseId, state, stats).watchedMs).toBe(1000);
  });
});

describe('Playback request validation and storage', () => {
  it('has a unique user/course index rather than process-local tab locks', () => {
    expect(LearningProgressSchema.indexes()).toContainEqual([{ userId: 1, courseId: 1 }, { unique: true }]);
  });

  it('validates UUIDs, lesson IDs and bounded, nonnegative finite numbers', async () => {
    const good = { sessionId, sequence: 1, watchedMs: 15_000, positionSeconds: 30 };
    expect(await validate(Object.assign(new PlaybackHeartbeatDto(), good))).toEqual([]);
    for (const invalid of [{ sequence: 0 }, { sequence: 1.5 }, { watchedMs: -1 }, { watchedMs: Infinity }, { watchedMs: NaN }, { positionSeconds: Infinity }, { positionSeconds: -1 }, { sessionId: 'invalid' }]) {
      expect((await validate(Object.assign(new PlaybackHeartbeatDto(), good, invalid))).length).toBeGreaterThan(0);
    }
    expect((await validate(Object.assign(new StartPlaybackSessionDto(), { sessionId, lessonId: 'foreign-id' }))).length).toBeGreaterThan(0);
  });
});
