import type { ICourse } from './course.interface.js';

export interface IEnrollment {
  id: string;
  userId: string;
  courseId: string;
  orderId?: string | null;
  enrolledAt: Date | string;
  course?: ICourse | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  createdById?: string | null;
  updatedById?: string | null;
}

