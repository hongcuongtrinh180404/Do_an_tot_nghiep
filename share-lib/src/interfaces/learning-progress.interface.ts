import type { LearningStatusEnum } from '../enums/learning-status.enum.js';

export interface ICourseLearningProgress {
  courseId: string;
  watchedMs: number;
  /** Null until every current video has a known, positive duration. */
  totalDurationMs: number | null;
  progressPercent: number | null;
  status: LearningStatusEnum;
  lastLessonId: string | null;
  lastPositionSeconds: number;
  updatedAt: Date | string | null;
}

export interface IStartPlaybackSession {
  sessionId: string;
  lessonId: string;
}

export interface IPlaybackHeartbeat {
  sessionId: string;
  sequence: number;
  /** Cumulative real playback time for this session, NOT the media position. */
  watchedMs: number;
  positionSeconds: number;
}

export interface IPlaybackSessionResponse {
  sessionId: string;
  expiresAt: Date | string;
  progress: ICourseLearningProgress;
}
