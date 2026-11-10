'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  IApiResponse,
  IReview,
  ICourseReviewStats,
  IReviewEligibility,
  ICreateReviewPayload,
  IUpdateReviewPayload,
} from 'share-lib';
import { apiClient } from '@/lib/api-client';
import { courseKeys } from './course.api';
import { enrollmentKeys } from './enrollment.api';

export interface IPaginatedReviewsResult {
  items: IReview[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const reviewKeys = {
  all: ['reviews'] as const,
  stats: (courseId: string) => [...reviewKeys.all, 'stats', courseId] as const,
  list: (courseId: string, page = 1, limit = 10) =>
    [...reviewKeys.all, 'list', courseId, { page, limit }] as const,
  eligibility: (courseId: string) => [...reviewKeys.all, 'eligibility', courseId] as const,
  myReview: (courseId: string) => [...reviewKeys.all, 'my-review', courseId] as const,
};

export const reviewApi = {
  async getCourseStats(courseId: string): Promise<ICourseReviewStats> {
    const res = await apiClient.get<IApiResponse<ICourseReviewStats>>(
      `/reviews/courses/${courseId}/stats`,
    );
    return res.data.data;
  },

  async getCourseReviews(
    courseId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<IPaginatedReviewsResult> {
    const res = await apiClient.get<IApiResponse<IPaginatedReviewsResult>>(
      `/reviews/courses/${courseId}`,
      { params: { page, limit } },
    );
    return res.data.data;
  },

  async checkEligibility(courseId: string): Promise<IReviewEligibility> {
    const res = await apiClient.get<IApiResponse<IReviewEligibility>>(
      `/reviews/courses/${courseId}/eligibility`,
    );
    return res.data.data;
  },

  async getMyReview(courseId: string): Promise<IReview | null> {
    const res = await apiClient.get<IApiResponse<IReview | null>>(
      `/reviews/courses/${courseId}/my-review`,
    );
    return res.data.data;
  },

  async createReview(courseId: string, payload: ICreateReviewPayload): Promise<IReview> {
    const res = await apiClient.post<IApiResponse<IReview>>(
      `/reviews/courses/${courseId}`,
      payload,
    );
    return res.data.data;
  },

  async updateReview(reviewId: string, payload: IUpdateReviewPayload): Promise<IReview> {
    const res = await apiClient.patch<IApiResponse<IReview>>(
      `/reviews/${reviewId}`,
      payload,
    );
    return res.data.data;
  },

  async deleteReview(reviewId: string): Promise<boolean> {
    const res = await apiClient.delete<IApiResponse<{ success: boolean }>>(
      `/reviews/${reviewId}`,
    );
    return res.data.data.success;
  },
};

export function useCourseReviewStatsQuery(courseId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: reviewKeys.stats(courseId),
    queryFn: () => reviewApi.getCourseStats(courseId),
    enabled: Boolean(courseId) && enabled,
    staleTime: 30 * 1000,
  });
}

export function useCourseReviewsQuery(
  courseId: string,
  page: number = 1,
  limit: number = 10,
  enabled: boolean = true,
) {
  return useQuery({
    queryKey: reviewKeys.list(courseId, page, limit),
    queryFn: () => reviewApi.getCourseReviews(courseId, page, limit),
    enabled: Boolean(courseId) && enabled,
    staleTime: 30 * 1000,
  });
}

export function useReviewEligibilityQuery(courseId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: reviewKeys.eligibility(courseId),
    queryFn: () => reviewApi.checkEligibility(courseId),
    enabled: Boolean(courseId) && enabled,
    staleTime: 10 * 1000,
  });
}

export function useMyReviewQuery(courseId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: reviewKeys.myReview(courseId),
    queryFn: () => reviewApi.getMyReview(courseId),
    enabled: Boolean(courseId) && enabled,
    staleTime: 30 * 1000,
  });
}

export function useCreateReviewMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ICreateReviewPayload) => reviewApi.createReview(courseId, payload),
    onSuccess: () => {
      toast.success('Đánh giá khóa học thành công! Cảm ơn bạn đã đóng góp ý kiến.');
      void queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      void queryClient.invalidateQueries({ queryKey: courseKeys.all });
      void queryClient.invalidateQueries({ queryKey: enrollmentKeys.publicDetail(courseId) });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể gửi đánh giá. Vui lòng kiểm tra lại điều kiện.';
      toast.error(msg);
    },
  });
}

export function useUpdateReviewMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ reviewId, payload }: { reviewId: string; payload: IUpdateReviewPayload }) =>
      reviewApi.updateReview(reviewId, payload),
    onSuccess: () => {
      toast.success('Cập nhật đánh giá thành công!');
      void queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      void queryClient.invalidateQueries({ queryKey: courseKeys.all });
      void queryClient.invalidateQueries({ queryKey: enrollmentKeys.publicDetail(courseId) });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể cập nhật đánh giá. Vui lòng thử lại sau.';
      toast.error(msg);
    },
  });
}

export function useDeleteReviewMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) => reviewApi.deleteReview(reviewId),
    onSuccess: () => {
      toast.success('Đã xóa đánh giá thành công.');
      void queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      void queryClient.invalidateQueries({ queryKey: courseKeys.all });
      void queryClient.invalidateQueries({ queryKey: enrollmentKeys.publicDetail(courseId) });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể xóa đánh giá. Vui lòng thử lại sau.';
      toast.error(msg);
    },
  });
}

