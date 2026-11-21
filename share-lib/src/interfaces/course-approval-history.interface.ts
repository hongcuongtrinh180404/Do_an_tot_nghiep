import type { CourseStatusEnum } from '../enums/course-status.enum.js';
import type { CourseLevelEnum } from '../enums/course-level.enum.js';
import type { CourseApprovalActionEnum } from '../enums/course-approval-action.enum.js';

export interface ICourseApprovalHistoryCourseSummary {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl?: string | null;
  price?: number;
  level?: CourseLevelEnum | string;
  category?: {
    id: string;
    name: string;
  } | null;
}

export interface ICourseApprovalHistoryUserSummary {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
}

export interface ICourseApprovalHistory {
  id: string;
  courseId: string;
  adminId: string;
  instructorId: string;
  action: CourseApprovalActionEnum;
  reason?: string | null;
  previousStatus: CourseStatusEnum;
  targetStatus: CourseStatusEnum;
  createdAt: Date | string;
  updatedAt: Date | string;
  course?: ICourseApprovalHistoryCourseSummary | null;
  admin?: ICourseApprovalHistoryUserSummary | null;
  instructor?: ICourseApprovalHistoryUserSummary | null;
}

export interface IAdminCourseApprovalHistoryStats {
  total: number;
  approved: number;
  rejected: number;
}
