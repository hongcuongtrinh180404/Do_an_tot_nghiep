import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LearningStatusEnum } from 'share-lib';
import type { LearningProgressService } from '../../learning-progress/services/learning-progress.service.js';
import type { ChatbotMyCoursesRepository, OwnedCourseRow } from '../repositories/chatbot-my-courses.repository.js';
import { CHATBOT_LEARNING_BUDGET_MS, ChatbotLearningReadService } from '../services/chatbot-learning-read.service.js';

const userId = '0123456789abcdef00000001';
const rows: OwnedCourseRow[] = Array.from({ length: 50 }, (_value, index) => ({
  enrollmentId: (index + 100).toString(16).padStart(24, '0'),
  id: (index + 200).toString(16).padStart(24, '0'),
  title: `Khóa học ${index + 1}`, enrolledAt: new Date('2026-11-20T00:00:00.000Z'), publicDetail: true,
}));
const state = (courseId: string) => ({
  courseId, progressPercent: 0, completedLessons: 0, totalLessons: 2,
  status: LearningStatusEnum.NOT_STARTED, watchedMs: 0, lastLessonId: null, lastPositionSeconds: 0,
});

describe('Personal learning read budget, cancellation and complete scans', () => {
  const batch = vi.fn();
  const resumeTitle = vi.fn();
  const getProgressForCourses = vi.fn();
  const service = new ChatbotLearningReadService(
    { batch, resumeTitle } as unknown as ChatbotMyCoursesRepository,
    { getProgressForCourses } as unknown as LearningProgressService,
  );
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
    getProgressForCourses.mockImplementation(async (_userId: string, ids: string[]) => ids.map(state));
  });
  afterEach(() => vi.useRealTimers());

  it('does not query after cancellation and cleans up its timer', async () => {
    await expect(service.list(userId, { page: 1, limit: 5 }, AbortSignal.abort()))
      .rejects.toMatchObject({ code: 'CHATBOT_CANCELLED' });
    expect(batch).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('stops waiting immediately on disconnect without starting a subsequent progress query', async () => {
    let finish!: (value: OwnedCourseRow[]) => void;
    batch.mockImplementationOnce(() => new Promise<OwnedCourseRow[]>((resolve) => { finish = resolve; }));
    const controller = new AbortController();
    const promise = service.list(userId, { page: 1, limit: 5 }, controller.signal);
    const rejected = expect(promise).rejects.toMatchObject({ code: 'CHATBOT_CANCELLED' });
    controller.abort();
    await rejected;
    finish(rows);
    await Promise.resolve();
    expect(getProgressForCourses).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('enforces an 8-second wall-clock budget even when a read never resolves', async () => {
    batch.mockImplementationOnce(() => new Promise<OwnedCourseRow[]>(() => {}));
    const rejected = expect(service.overview(userId))
      .rejects.toMatchObject({ code: 'CHATBOT_LEARNING_UNAVAILABLE' });
    await vi.advanceTimersByTimeAsync(CHATBOT_LEARNING_BUDGET_MS);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('never returns partial totals if a later batch fails', async () => {
    batch.mockResolvedValueOnce(rows).mockRejectedValueOnce(new Error('private-db-error'));
    await expect(service.list(userId, { page: 1, limit: 5 }))
      .rejects.toMatchObject({ code: 'CHATBOT_LEARNING_UNAVAILABLE' });
    expect(batch.mock.calls[1][1].after).toEqual({
      enrolledAt: rows[49].enrolledAt, enrollmentId: rows[49].enrollmentId,
    });
    expect(getProgressForCourses.mock.calls[0][2]).toBe(1500);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('fails closed instead of counting a course with a missing progress summary', async () => {
    batch.mockResolvedValueOnce(rows.slice(0, 2));
    getProgressForCourses.mockResolvedValueOnce([state(rows[0].id)]);
    await expect(service.list(userId, { page: 1, limit: 5 }))
      .rejects.toMatchObject({ code: 'CHATBOT_LEARNING_UNAVAILABLE' });
  });
  it('rechecks enrollment after fresh progress, without returning facts after revocation', async () => {
    batch.mockResolvedValueOnce([rows[0]]).mockResolvedValueOnce([]);
    expect(await service.detail(userId, rows[0].id)).toEqual({ scope: 'not_owned' });
    expect(batch).toHaveBeenCalledTimes(2);
    expect(getProgressForCourses).toHaveBeenCalledOnce();
  });
  it('does not start another enrollment query if cancelled while resolving a resume title', async () => {
    const controller = new AbortController();
    batch.mockResolvedValueOnce([rows[0]]);
    getProgressForCourses.mockResolvedValueOnce([{ ...state(rows[0].id), lastLessonId: rows[1].id }]);
    resumeTitle.mockImplementationOnce(async () => { controller.abort(); return 'Bài học'; });
    await expect(service.detail(userId, rows[0].id, controller.signal))
      .rejects.toMatchObject({ code: 'CHATBOT_CANCELLED' });
    expect(batch).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cleans up the budget on successful empty reads and rejects malformed account IDs', async () => {
    batch.mockResolvedValue([]);
    expect(await service.overview(userId)).toMatchObject({ totalCourses: 0 });
    expect(vi.getTimerCount()).toBe(0);
    await expect(service.overview('someone-else')).rejects.toMatchObject({ code: 'CHATBOT_REQUEST_INVALID' });
    expect(batch).toHaveBeenCalledOnce();
  });
});
