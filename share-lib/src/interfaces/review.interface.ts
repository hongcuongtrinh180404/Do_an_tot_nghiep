export interface IReviewUserSummary {
  id: string;
  fullName: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface IReview {
  id: string;
  userId: string;
  courseId: string;
  rating: number; // Số nguyên 1 đến 5
  comment?: string | null;
  user?: IReviewUserSummary | null;
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

export interface IReviewEligibility {
  canReview: boolean;
  reason?: string | null;
  isEnrolled: boolean;
  progressPercent: number | null;
  isInstructor: boolean;
  hasReviewed: boolean;
  existingReviewId?: string | null;
}

