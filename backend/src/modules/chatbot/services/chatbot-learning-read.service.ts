import { Inject, Injectable } from '@nestjs/common';
import { LearningStatusEnum, type ICourseLearningProgress } from 'share-lib';
import { LearningProgressService } from '../../learning-progress/services/learning-progress.service.js';
import { ChatbotAiError } from '../chatbot.errors.js';
import {
  ChatbotMyCoursesRepository, CHATBOT_LEARNING_BATCH_SIZE, CHATBOT_LEARNING_QUERY_MS,
  type OwnedCourseCursor, type OwnedCourseRow,
} from '../repositories/chatbot-my-courses.repository.js';
import {
  ChatbotLearningError, type ChatbotOwnedCourse, type CourseSelection,
  type LearningOverview, type LearningResult, type MyCoursesFilters, type MyCoursesResult,
} from '../tools/my-learning.types.js';

export const CHATBOT_LEARNING_BUDGET_MS = 8000;

function ownedCourse(row: OwnedCourseRow, progress: ICourseLearningProgress): ChatbotOwnedCourse {
  return {
    id: row.id, title: row.title, enrolledAt: row.enrolledAt.toISOString(),
    url: row.publicDetail ? `/courses/${row.id}` : '/my-courses',
    progress: {
      status: progress.status, progressPercent: progress.progressPercent,
      completedLessons: progress.completedLessons, totalLessons: progress.totalLessons,
      watchedMs: progress.watchedMs, lastLessonId: progress.lastLessonId,
      lastPositionSeconds: progress.lastPositionSeconds,
    },
    resumeUrl: progress.lastLessonId ? `/courses/${row.id}/lessons/${progress.lastLessonId}` : null,
  };
}

/** Uses the same current-curriculum summaries as /learning-progress/my-courses. */
@Injectable()
export class ChatbotLearningReadService {
  constructor(
    @Inject(ChatbotMyCoursesRepository) private readonly courses: ChatbotMyCoursesRepository,
    @Inject(LearningProgressService) private readonly progress: LearningProgressService,
  ) {}

  private async read<T>(userId: string, signal: AbortSignal | undefined, operation: (check: () => void) => Promise<T>): Promise<T> {
    if (!/^[a-f\d]{24}$/i.test(userId)) throw new ChatbotAiError('CHATBOT_REQUEST_INVALID');
    const deadline = Date.now() + CHATBOT_LEARNING_BUDGET_MS;
    let timedOut = false;
    let onAbort: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      if (signal?.aborted) throw new ChatbotAiError('CHATBOT_CANCELLED');
      if (timedOut || Date.now() >= deadline) throw new ChatbotLearningError('CHATBOT_LEARNING_UNAVAILABLE');
    };
    try {
      check();
      const interrupted = new Promise<never>((_resolve, reject) => {
        onAbort = () => reject(new ChatbotAiError('CHATBOT_CANCELLED'));
        signal?.addEventListener('abort', onAbort, { once: true });
        timer = setTimeout(() => {
          timedOut = true;
          reject(new ChatbotLearningError('CHATBOT_LEARNING_UNAVAILABLE'));
        }, CHATBOT_LEARNING_BUDGET_MS);
        timer.unref();
      });
      // Bound the whole scan, not just the individual Mongo queries. An in-flight
      // read may finish under maxTimeMS; check() prevents starting the next batch.
      const result = await Promise.race([operation(check), interrupted]);
      check();
      return result;
    } catch (error) {
      if (signal?.aborted) throw new ChatbotAiError('CHATBOT_CANCELLED');
      if (error instanceof ChatbotAiError) throw error;
      throw new ChatbotLearningError('CHATBOT_LEARNING_UNAVAILABLE');
    } finally {
      if (timer) clearTimeout(timer);
      if (onAbort) signal?.removeEventListener('abort', onAbort);
    }
  }

  private async scan(userId: string, keyword: string | undefined, check: () => void,
    consume: (rows: OwnedCourseRow[]) => Promise<void>): Promise<void> {
    let after: OwnedCourseCursor | undefined;
    for (;;) {
      check();
      const rows = await this.courses.batch(userId, { keyword, after });
      check();
      if (!rows.length) return;
      await consume(rows);
      if (rows.length < CHATBOT_LEARNING_BATCH_SIZE) return;
      const last = rows[rows.length - 1];
      after = { enrolledAt: last.enrolledAt, enrollmentId: last.enrollmentId };
    }
  }

  list(userId: string, filters: MyCoursesFilters, signal?: AbortSignal): Promise<MyCoursesResult> {
    return this.read(userId, signal, async (check) => {
      const items: ChatbotOwnedCourse[] = [];
      let total = 0;
      const offset = (filters.page - 1) * filters.limit;
      await this.scan(userId, filters.keyword, check, async (rows) => {
        // Every supplied ID came from this user's live, non-deleted enrollment.
        const states = await this.progress.getProgressForCourses(userId, rows.map((row) => row.id), CHATBOT_LEARNING_QUERY_MS);
        check();
        const byId = new Map(states.map((state) => [state.courseId, state]));
        for (const row of rows) {
          const state = byId.get(row.id);
          if (!state) throw new ChatbotLearningError('CHATBOT_LEARNING_UNAVAILABLE');
          if (filters.learningStatus && state.status !== filters.learningStatus) continue;
          if (total >= offset && items.length < filters.limit) items.push(ownedCourse(row, state));
          total++;
        }
      });
      return { filtersApplied: filters, items, total, page: filters.page, limit: filters.limit, hasMore: total > offset + filters.limit };
    });
  }

  overview(userId: string, signal?: AbortSignal): Promise<LearningOverview> {
    return this.read(userId, signal, async (check) => {
      const result: LearningOverview = { scope: 'overview', totalCourses: 0, notStarted: 0, inProgress: 0, completed: 0 };
      await this.scan(userId, undefined, check, async (rows) => {
        const states = await this.progress.getProgressForCourses(userId, rows.map((row) => row.id), CHATBOT_LEARNING_QUERY_MS);
        check();
        if (states.length !== rows.length) throw new ChatbotLearningError('CHATBOT_LEARNING_UNAVAILABLE');
        for (const state of states) {
          result.totalCourses++;
          if (state.status === LearningStatusEnum.COMPLETED) result.completed++;
          else if (state.status === LearningStatusEnum.IN_PROGRESS) result.inProgress++;
          else result.notStarted++;
        }
      });
      return result;
    });
  }

  candidates(userId: string, keyword: string, page: number, limit: number, signal?: AbortSignal): Promise<CourseSelection> {
    return this.read(userId, signal, async (check) => {
      const items: CourseSelection['items'] = [];
      let total = 0;
      const offset = (page - 1) * limit;
      await this.scan(userId, keyword, check, (rows) => {
        for (const row of rows) {
          if (total >= offset && items.length < limit) items.push({ id: row.id, title: row.title });
          total++;
        }
        return Promise.resolve();
      });
      return { scope: 'selection', keyword, items, total, page, limit, hasMore: total > offset + limit };
    });
  }

  detail(userId: string, courseId: string, signal?: AbortSignal): Promise<LearningResult> {
    return this.read(userId, signal, async (check) => {
      const [row] = await this.courses.batch(userId, { courseId });
      if (!row) return { scope: 'not_owned' };
      check();
      const [state] = await this.progress.getProgressForCourses(userId, [row.id], CHATBOT_LEARNING_QUERY_MS);
      if (!state) throw new ChatbotLearningError('CHATBOT_LEARNING_UNAVAILABLE');
      check();
      const title = state.lastLessonId ? await this.courses.resumeTitle(row.id, state.lastLessonId) : null;
      check();
      // A signed selection does not grant access; also recheck after the progress reads.
      if (!(await this.courses.batch(userId, { courseId })).length) return { scope: 'not_owned' };
      const course = ownedCourse(row, state);
      if (!title) {
        course.resumeUrl = null;
        course.progress.lastLessonId = null;
        course.progress.lastPositionSeconds = 0;
      }
      return { scope: 'course', course, remainingLessons: Math.max(0, state.totalLessons - state.completedLessons), lastLessonTitle: title };
    });
  }
}
