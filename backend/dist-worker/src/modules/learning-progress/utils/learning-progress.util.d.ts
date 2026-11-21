import { type ICourseLearningProgress, type ILessonCompletionSummary } from 'share-lib';
import type { LearningProgressState } from '../schemas/learning-progress.schema.js';
import type { CourseVideoStats } from '../../course/interfaces/course-video-stats.interface.js';
export type { CourseVideoStats } from '../../course/interfaces/course-video-stats.interface.js';
export declare function summarizeProgress(courseId: string, state: LearningProgressState | null, stats?: CourseVideoStats, lessons?: ILessonCompletionSummary[]): ICourseLearningProgress;
