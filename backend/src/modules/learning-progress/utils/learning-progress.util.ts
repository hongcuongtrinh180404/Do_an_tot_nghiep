import { LearningStatusEnum, type ICourseLearningProgress } from 'share-lib';
import type { LearningProgressState } from '../schemas/learning-progress.schema.js';
import type { CourseVideoStats } from '../../course/interfaces/course-video-stats.interface.js';
export type { CourseVideoStats } from '../../course/interfaces/course-video-stats.interface.js';

export function summarizeProgress(
  courseId: string,
  state: LearningProgressState | null,
  stats?: CourseVideoStats,
): ICourseLearningProgress {
  const watchedMs = state?.watchedMs ?? 0;
  const totalDurationMs = stats && stats.videoCount > 0 && stats.missingDurationCount === 0 &&
    Number.isFinite(stats.totalSeconds) && stats.totalSeconds > 0
    ? Math.max(1, Math.round(stats.totalSeconds * 1000)) : null;
  const complete = totalDurationMs !== null && watchedMs >= totalDurationMs;
  const resumeVideo = stats?.videos.find((video) =>
    video.lessonId === state?.lastLessonId && video.url === state?.lastMediaUrl);

  return {
    courseId,
    watchedMs,
    totalDurationMs,
    // Flooring avoids displaying 100% before the exact threshold is reached.
    progressPercent: totalDurationMs === null ? null : complete ? 100 : Math.floor(watchedMs / totalDurationMs * 10_000) / 100,
    status: complete ? LearningStatusEnum.COMPLETED : watchedMs > 0 ? LearningStatusEnum.IN_PROGRESS : LearningStatusEnum.NOT_STARTED,
    lastLessonId: resumeVideo?.lessonId ?? null,
    lastPositionSeconds: resumeVideo ? Math.max(0, Math.min(state?.lastPositionSeconds ?? 0,
      resumeVideo.durationSeconds && resumeVideo.durationSeconds > 0 ? resumeVideo.durationSeconds : Infinity)) : 0,
    updatedAt: state?.updatedAt ?? null,
  };
}
