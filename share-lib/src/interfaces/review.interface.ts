import { ReviewStatusEnum } from '../enums/review-status.enum.js';

export interface IReviewUserSummary {
  id: string;
  fullName: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface IReviewCourseSummary {
  id: string;
  title: string;
  slug?: string;
  thumbnail?: string | null;
}

export type ReviewModerationAction = 'HIDE' | 'RESTORE' | 'DELETE';

export interface IReviewModerationEntry {
  action: ReviewModerationAction;
  adminId: string;
  adminName?: string;
  reason?: string;
  createdAt: Date | string;
}

export interface IReviewReportEntry {
  userId: string;
  userName?: string;
  reason: string;
  createdAt: Date | string;
}

export interface IReview {
  id: string;
  userId: string;
  courseId: string;
  rating: number; // Số nguyên 1 đến 5
  comment?: string | null;
  status: ReviewStatusEnum;
  hideReason?: string | null;
  moderationHistory?: IReviewModerationEntry[];
  reports?: IReviewReportEntry[];
  reportCount?: number;
  user?: IReviewUserSummary | null;
  course?: IReviewCourseSummary | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  createdById?: string | null;
  updatedById?: string | null;
}

export interface ICreateReviewPayload {
  rating: number;
  comment?: string | null;
}

export interface IUpdateReviewPayload {
  rating?: number;
  comment?: string | null;
}

export interface IHideReviewPayload {
  reason: string;
}

export interface IRestoreReviewPayload {
  reason?: string;
}

export interface IReportReviewPayload {
  reason: string;
}

export interface IReviewDistributionItem {
  stars: number; // 5, 4, 3, 2, 1
  count: number;
  percentage: number;
}

export interface ICourseReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: IReviewDistributionItem[];
}

export interface IAdminReviewStats {
  total: number;
  visibleCount: number;
  hiddenCount: number;
  reportedCount: number;
  deletedCount: number;
  averageRating: number;
}

export interface IReviewEligibility {
  canReview: boolean;
  reason?: string | null;
  isEnrolled: boolean;
  progressPercent: number | null;
  isInstructor: boolean;
  hasReviewed: boolean;
  existingReviewId?: string | null;
}
