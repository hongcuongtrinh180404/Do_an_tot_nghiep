import { Injectable } from '@nestjs/common';
import type { ClientSession } from 'mongoose';
import { JobTypeEnum, type IJob, type ILesson } from 'share-lib';
import { LessonMindmapRepository } from '../../course/repositories/lesson-mindmap.repository.js';
import { LessonQuizDraftRepository } from '../../course/repositories/lesson-quiz-draft.repository.js';
import { LessonQuizRepository } from '../../course/repositories/lesson-quiz.repository.js';
import { LessonSummaryRepository } from '../../course/repositories/lesson-summary.repository.js';
import { JobService } from '../../jobs/services/job.service.js';

@Injectable()
export class AutomaticAnalysisService {
  constructor(
    private readonly jobs: JobService,
    private readonly summaries: LessonSummaryRepository,
    private readonly mindmaps: LessonMindmapRepository,
    private readonly quizzes: LessonQuizRepository,
    private readonly quizDrafts: LessonQuizDraftRepository,
  ) {}

  async enqueueMissing(
    input: Pick<IJob, 'lessonId' | 'courseId' | 'requestedById' | 'inputRevision'>,
    revisions: ILesson['analysisOutputRevisions'],
    session: ClientSession,
  ): Promise<IJob[]> {
    const { lessonId, inputRevision } = input;
    const missing: Array<JobTypeEnum.SUMMARY | JobTypeEnum.MINDMAP | JobTypeEnum.QUIZ> = [];
    // MongoDB operations in one transaction must be awaited sequentially.
    if (!(await this.summaries.findByLessonId(lessonId, session))) missing.push(JobTypeEnum.SUMMARY);
    if (!(await this.mindmaps.findByLessonId(lessonId, session))) missing.push(JobTypeEnum.MINDMAP);
    if (!(await this.quizzes.findByLessonId(lessonId, session)).length &&
      !(await this.quizDrafts.findByLessonId(lessonId, session))) {
      missing.push(JobTypeEnum.QUIZ);
    }

    const jobs: IJob[] = [];
    for (const type of missing) {
      jobs.push(await this.jobs.createJob({
        ...input,
        type,
        targetRevision: revisions?.[type] ?? 0,
        idempotencyKey: `auto-analysis:${lessonId}:${inputRevision}:${type}`,
        parameters: { automatic: true },
      }, session));
    }
    return jobs;
  }
}
