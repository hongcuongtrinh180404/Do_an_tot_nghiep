import type { ClientSession } from 'mongoose';
import { JobTypeEnum } from 'share-lib';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AutomaticAnalysisService } from '../services/automatic-analysis.service.js';

describe('AutomaticAnalysisService', () => {
  const input = { lessonId: 'lesson-1', courseId: 'course-1', requestedById: 'instructor-1', inputRevision: 4 };
  const revisions = { summary: 2, mindmap: 1, quiz: 3 };
  const session = {} as ClientSession;
  const createJob = vi.fn();
  const getSummary = vi.fn();
  const getMindmap = vi.fn();
  const getQuizzes = vi.fn();
  const getQuizDraft = vi.fn();
  const service = new AutomaticAnalysisService(...[
    { createJob },
    { findByLessonId: getSummary },
    { findByLessonId: getMindmap },
    { findByLessonId: getQuizzes },
    { findByLessonId: getQuizDraft },
  ] as unknown as ConstructorParameters<typeof AutomaticAnalysisService>);

  beforeEach(() => {
    vi.resetAllMocks();
    createJob.mockImplementation(async (job) => job);
    getSummary.mockResolvedValue(null);
    getMindmap.mockResolvedValue(null);
    getQuizzes.mockResolvedValue([]);
    getQuizDraft.mockResolvedValue(null);
  });

  it('enqueues one independent, revision-scoped job per missing output in the same transaction', async () => {
    const jobs = await service.enqueueMissing(input, revisions, session);
    const types = [JobTypeEnum.SUMMARY, JobTypeEnum.MINDMAP, JobTypeEnum.QUIZ] as const;
    expect(jobs.map((job) => job.type)).toEqual(types);
    for (const type of types) {
      expect(createJob).toHaveBeenCalledWith({
        ...input,
        type,
        targetRevision: revisions[type],
        idempotencyKey: `auto-analysis:lesson-1:4:${type}`,
        parameters: { automatic: true },
      }, session);
    }
  });

  it('leaves saved content and quiz drafts untouched', async () => {
    getSummary.mockResolvedValue({ summary: {} });
    getQuizDraft.mockResolvedValue({ quizzes: [] });
    const jobs = await service.enqueueMissing(input, revisions, session);
    expect(jobs.map((job) => job.type)).toEqual([JobTypeEnum.MINDMAP]);
  });
});
