import { LearningStatusEnum, type ICourseLearningProgress, type ILessonCompletionSummary } from 'share-lib';
import type { LearningProgressState } from '../schemas/learning-progress.schema.js';
import type { CourseVideoStats } from '../../course/interfaces/course-video-stats.interface.js';
export type { CourseVideoStats } from '../../course/interfaces/course-video-stats.interface.js';

export function summarizeProgress(
  courseId: string,
  state: LearningProgressState | null,
  stats?: CourseVideoStats,
  lessons: ILessonCompletionSummary[] = [],
): ICourseLearningProgress {
  const watchedMs = state?.watchedMs ?? 0;
  const currentLessonIds = new Set(stats?.videos.map((video) => video.lessonId) ?? []);
  const currentLessons = lessons.filter((lesson) => currentLessonIds.has(lesson.lessonId));
  const totalLessons = currentLessonIds.size;
  const completedLessons = new Set(currentLessons
    .filter((lesson) => lesson.status === LearningStatusEnum.COMPLETED)
    .map((lesson) => lesson.lessonId)).size;
  const totalDurationMs = stats && stats.videoCount > 0 && stats.missingDurationCount === 0 &&
    Number.isFinite(stats.totalSeconds) && stats.totalSeconds > 0
    ? Math.max(1, Math.round(stats.totalSeconds * 1000)) : null;
  const complete = totalLessons > 0 && completedLessons === totalLessons;
  const started = watchedMs > 0 || currentLessons.some((lesson) => lesson.status !== LearningStatusEnum.NOT_STARTED);
  const resumeVideo = stats?.videos.find((video) =>
    video.lessonId === state?.lastLessonId && video.url === state?.lastMediaUrl);

  return {
    courseId,
    revision: state?.revision ?? 0,
    watchedMs,
    totalDurationMs,
    completedLessons,
    totalLessons,
    // Flooring avoids displaying 100% before the exact threshold is reached.
    progressPercent: totalLessons === 0 ? null : complete ? 100 : Math.floor(completedLessons * 10_000 / totalLessons) / 100,
    status: complete ? LearningStatusEnum.COMPLETED : started ? LearningStatusEnum.IN_PROGRESS : LearningStatusEnum.NOT_STARTED,
    lastLessonId: resumeVideo?.lessonId ?? null,
    lastPositionSeconds: resumeVideo ? Math.max(0, Math.min(state?.lastPositionSeconds ?? 0,
      resumeVideo.durationSeconds && resumeVideo.durationSeconds > 0 ? resumeVideo.durationSeconds : Infinity)) : 0,
    updatedAt: state?.updatedAt ?? null,
  };
}
