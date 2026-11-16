'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  IApiResponse,
  ITeachingStatsOverview,
  IInstructorCourseRevenue,
  ICourseReviewStats,
  IReview,
  IReplyReviewPayload,
} from 'share-lib';
import { apiClient } from '@/lib/api-client';
import { reviewKeys } from '@/features/course/api/review.api';

export interface IPaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ITeachingOverviewParams {
  timeRange?: string;
  startDate?: string;
  endDate?: string;
}

export interface ICoursesRevenueParams extends ITeachingOverviewParams {
  search?: string;
  sort?: 'revenue_desc' | 'earnings_desc' | 'sales_desc';
  page?: number;
  limit?: number;
}

export interface IInstructorReviewsParams {
  courseId?: string;
  rating?: number;
  sort?: 'created_desc' | 'created_asc';
  page?: number;
  limit?: number;
}

export const teachingStatsKeys = {
  all: ['instructor-teaching-stats'] as const,
  overview: (params: ITeachingOverviewParams) =>
    [...teachingStatsKeys.all, 'overview', params] as const,
  courses: (params: ICoursesRevenueParams) =>
    [...teachingStatsKeys.all, 'courses', params] as const,
  reviewStats: (courseId?: string) =>
    [...teachingStatsKeys.all, 'review-stats', courseId || 'all'] as const,
  reviews: () => [...teachingStatsKeys.all, 'reviews-list'] as const,
  reviewsList: (params: IInstructorReviewsParams) =>
    [...teachingStatsKeys.reviews(), params] as const,
};

export const teachingStatsApi = {
  async getOverview(params: ITeachingOverviewParams): Promise<ITeachingStatsOverview> {
    const res = await apiClient.get<IApiResponse<ITeachingStatsOverview>>(
      '/instructor/teaching-stats/overview',
      { params },
    );
    return res.data.data;
  },

  async getCoursesRevenue(
    params: ICoursesRevenueParams,
  ): Promise<IPaginatedResult<IInstructorCourseRevenue>> {
    const res = await apiClient.get<IApiResponse<IPaginatedResult<IInstructorCourseRevenue>>>(
      '/instructor/teaching-stats/courses',
      { params },
    );
    return res.data.data;
  },

  async getReviewStats(courseId?: string): Promise<ICourseReviewStats> {
    const res = await apiClient.get<IApiResponse<ICourseReviewStats>>(
      '/reviews/instructor/stats',
      { params: courseId ? { courseId } : {} },
    );
    return res.data.data;
  },

  async getReviews(params: IInstructorReviewsParams): Promise<IPaginatedResult<IReview>> {
    const res = await apiClient.get<IApiResponse<IPaginatedResult<IReview>>>(
      '/reviews/instructor',
      { params },
    );
    return res.data.data;
  },

  async replyToReview(reviewId: string, payload: IReplyReviewPayload): Promise<IReview> {
    const res = await apiClient.post<IApiResponse<IReview>>(
      `/reviews/${reviewId}/reply`,
      payload,
    );
    return res.data.data;
  },

  async deleteReviewReply(reviewId: string): Promise<IReview> {
    const res = await apiClient.delete<IApiResponse<IReview>>(
      `/reviews/${reviewId}/reply`,
    );
    return res.data.data;
  },
};

export function useTeachingOverviewQuery(params: ITeachingOverviewParams) {
  return useQuery({
    queryKey: teachingStatsKeys.overview(params),
    queryFn: () => teachingStatsApi.getOverview(params),
    staleTime: 30 * 1000,
  });
}

export function useCoursesRevenueQuery(params: ICoursesRevenueParams) {
  return useQuery({
    queryKey: teachingStatsKeys.courses(params),
    queryFn: () => teachingStatsApi.getCoursesRevenue(params),
    staleTime: 30 * 1000,
  });
}

export function useInstructorReviewStatsQuery(courseId?: string) {
  return useQuery({
    queryKey: teachingStatsKeys.reviewStats(courseId),
    queryFn: () => teachingStatsApi.getReviewStats(courseId),
    staleTime: 30 * 1000,
  });
}

export function useInstructorReviewsQuery(params: IInstructorReviewsParams) {
  return useQuery({
    queryKey: teachingStatsKeys.reviewsList(params),
    queryFn: () => teachingStatsApi.getReviews(params),
    staleTime: 30 * 1000,
  });
}

export function useReplyToReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      payload,
    }: {
      reviewId: string;
      payload: IReplyReviewPayload;
    }) => teachingStatsApi.replyToReview(reviewId, payload),
    onSuccess: (review) => {
      queryClient.setQueriesData<IPaginatedResult<IReview>>(
        { queryKey: teachingStatsKeys.reviews() },
        (current) => current ? {
          ...current,
          items: current.items.map((item) => item.id === review.id ? review : item),
        } : current,
      );
      toast.success('Đã gửi phản hồi đánh giá thành công.');
      void queryClient.invalidateQueries({ queryKey: teachingStatsKeys.reviews() });
      void queryClient.invalidateQueries({ queryKey: reviewKeys.all });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể gửi phản hồi đánh giá. Vui lòng thử lại sau.';
      toast.error(msg);
    },
  });
}

export function useDeleteReviewReplyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) => teachingStatsApi.deleteReviewReply(reviewId),
    onSuccess: (review) => {
      queryClient.setQueriesData<IPaginatedResult<IReview>>(
        { queryKey: teachingStatsKeys.reviews() },
        (current) => current ? {
          ...current,
          items: current.items.map((item) => item.id === review.id ? review : item),
        } : current,
      );
      toast.success('Đã xóa phản hồi đánh giá.');
      void queryClient.invalidateQueries({ queryKey: teachingStatsKeys.reviews() });
      void queryClient.invalidateQueries({ queryKey: reviewKeys.all });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể xóa phản hồi đánh giá. Vui lòng thử lại sau.';
      toast.error(msg);
    },
  });
}
