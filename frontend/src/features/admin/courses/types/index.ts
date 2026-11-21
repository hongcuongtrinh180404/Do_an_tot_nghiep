import type { CourseApprovalActionEnum } from 'share-lib';

export type AdminCoursesTabType = 'COURSES' | 'HISTORY';

export type CourseApprovalHistoryStatusFilter = 'ALL' | 'APPROVED' | 'REJECTED';

export interface AdminCourseApprovalHistoriesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  action?: CourseApprovalActionEnum;
  courseId?: string;
  sort?: string;
}
