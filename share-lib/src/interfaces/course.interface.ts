import { CourseStatusEnum } from '../enums/course-status.enum.js';
import { CourseLevelEnum } from '../enums/course-level.enum.js';

export interface ICourse {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  thumbnailUrl?: string | null;
  price: number;
  instructorId: string;
  status: CourseStatusEnum;
  level: CourseLevelEnum;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  createdById?: string | null;
  updatedById?: string | null;
}

export interface ICreateCoursePayload {
  title: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  thumbnailUrl?: string;
  price?: number;
  level?: CourseLevelEnum;
}
