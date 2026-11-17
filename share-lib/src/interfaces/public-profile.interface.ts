import type { LearningStatusEnum } from '../enums/learning-status.enum.js';

export type ProfileCourseType = 'learning' | 'teaching';

/** Public card data only; no enrollment/order IDs, resume positions or playback sessions. */
export interface IPublicProfileCourse {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  instructorName: string;
  instructorUsername: string | null;
  progress: {
    percent: number | null;
    status: LearningStatusEnum;
  } | null;
}

export interface IPublicProfileCourses {
  items: IPublicProfileCourse[];
  nextCursor: string | null;
  counts: Record<ProfileCourseType, number>;
}
