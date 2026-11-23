import type { CourseLevelEnum } from '../enums/course-level.enum.js';
import type { CourseStatusEnum } from '../enums/course-status.enum.js';
import type { LearningStatusEnum } from '../enums/learning-status.enum.js';
import type { OrderStatusEnum } from '../enums/order-status.enum.js';

export interface IAdminUserEnrolledCourse {
  id: string;
  courseId: string;
  title: string;
  thumbnailUrl: string | null;
  enrolledAt: Date | string;
  paidAt: Date | string | null;
  /** Stored order amount, not the course's current price. Null when an order cannot be verified. */
  price: number | null;
  /** Free registrations have no payment order. */
  isFree: boolean;
  paymentStatus: OrderStatusEnum | null;
  totalLessons: number;
  completedLessons: number;
  progressPercent: number | null;
  /** A learner can be IN_PROGRESS with zero completed lessons. */
  status: LearningStatusEnum;
}

export interface IAdminUserInstructorStats {
  totalCourses: number;
  /** Distinct accounts with an active enrollment across the current teaching courses. */
  totalStudents: number;
  /** All-time paid transactions attributed to this account, including historical courses. */
  totalRevenue: number;
  /** Instructor earnings recorded at checkout, not today's commission rate. */
  netRevenue: number;
  averageRating: number;
  totalReviews: number;
}

export interface IAdminUserTeachingCourse {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  price: number;
  level: CourseLevelEnum;
  studentCount: number;
  revenue: number;
  rating: number;
  reviewCount: number;
  status: CourseStatusEnum;
  updatedAt: Date | string;
}

export interface IAdminUserTeaching {
  stats: IAdminUserInstructorStats;
  courses: IAdminUserTeachingCourse[];
}
