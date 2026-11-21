'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  IApiResponse,
  IReview,
  IAdminReviewStats,
  IHideReviewPayload,
  IRestoreReviewPayload,
  IReplyReviewPayload,
} from 'share-lib';
import { apiClient } from '@/lib/api-client';
import { reviewKeys } from '@/features/course/api/review.api';

export interface IAdminReviewsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  rating?: number;
  courseId?: string;
  hasReports?: boolean;
  startDate?: string;
  endDate?: string;
  sort?: string;
}

export interface IPaginatedAdminReviewsResult {
  items: IReview[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const adminReviewKeys = {
  all: ['admin-reviews'] as const,
  stats: () => [...adminReviewKeys.all, 'stats'] as const,
  list: (params: IAdminReviewsQueryParams) => [...adminReviewKeys.all, 'list', params] as const,
  detail: (id: string) => [...adminReviewKeys.all, 'detail', id] as const,
};

export const adminReviewsApi = {
  async getStats(): Promise<IAdminReviewStats> {
    const res = await apiClient.get<IApiResponse<IAdminReviewStats>>('/reviews/admin/stats');
    return res.data.data;
  },

  async getReviews(params: IAdminReviewsQueryParams): Promise<IPaginatedAdminReviewsResult> {
    const res = await apiClient.get<IApiResponse<IPaginatedAdminReviewsResult>>('/reviews/admin', {
      params,
    });
    return res.data.data;
  },

  async getReviewDetail(id: string): Promise<IReview> {
    const res = await apiClient.get<IApiResponse<IReview>>(`/reviews/admin/${id}`);
    return res.data.data;
  },

  async replyToReview(id: string, payload: IReplyReviewPayload): Promise<IReview> {
    const res = await apiClient.post<IApiResponse<IReview>>(`/reviews/admin/${id}/reply`, payload);
    return res.data.data;
  },

  async hideReview(id: string, payload: IHideReviewPayload): Promise<IReview> {
    const res = await apiClient.patch<IApiResponse<IReview>>(`/reviews/admin/${id}/hide`, payload);
    return res.data.data;
  },

  async restoreReview(id: string, payload: IRestoreReviewPayload): Promise<IReview> {
    const res = await apiClient.patch<IApiResponse<IReview>>(`/reviews/admin/${id}/restore`, payload);
    return res.data.data;
  },

  async deleteReview(id: string, reason?: string): Promise<boolean> {
    const res = await apiClient.delete<IApiResponse<{ success: boolean }>>(`/reviews/admin/${id}`, {
      data: { reason },
    });
    return res.data.data.success;
  },

  async dismissReports(id: string): Promise<IReview> {
    const res = await apiClient.patch<IApiResponse<IReview>>(`/reviews/admin/${id}/dismiss-reports`);
    return res.data.data;
  },
};

export function useAdminReviewStatsQuery() {
  return useQuery({
    queryKey: adminReviewKeys.stats(),
    queryFn: () => adminReviewsApi.getStats(),
    staleTime: 30 * 1000,
  });
}

export function useAdminReviewsQuery(params: IAdminReviewsQueryParams) {
  return useQuery({
    queryKey: adminReviewKeys.list(params),
    queryFn: () => adminReviewsApi.getReviews(params),
    staleTime: 15 * 1000,
  });
}

export function useAdminReviewDetailQuery(id: string | null) {
  return useQuery({
    queryKey: adminReviewKeys.detail(id || ''),
    queryFn: () => adminReviewsApi.getReviewDetail(id || ''),
    enabled: Boolean(id),
  });
}

export function useAdminReplyReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: IReplyReviewPayload }) =>
      adminReviewsApi.replyToReview(id, payload),
    onSuccess: (review) => {
      queryClient.setQueryData(adminReviewKeys.detail(review.id), review);
      toast.success('Đã lưu phản hồi từ ban quản trị.');
      void queryClient.invalidateQueries({ queryKey: adminReviewKeys.all });
      void queryClient.invalidateQueries({ queryKey: reviewKeys.all });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể gửi phản hồi. Vui lòng thử lại sau.';
      toast.error(msg);
    },
  });
}

export function useAdminHideReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: IHideReviewPayload }) =>
      adminReviewsApi.hideReview(id, payload),
    onSuccess: () => {
      toast.success('Đã ẩn đánh giá vi phạm thành công.');
      void queryClient.invalidateQueries({ queryKey: adminReviewKeys.all });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể ẩn đánh giá. Vui lòng thử lại sau.';
      toast.error(msg);
    },
  });
}

export function useAdminRestoreReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: IRestoreReviewPayload }) =>
      adminReviewsApi.restoreReview(id, payload),
    onSuccess: () => {
      toast.success('Đã khôi phục hiển thị đánh giá công khai.');
      void queryClient.invalidateQueries({ queryKey: adminReviewKeys.all });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể khôi phục đánh giá. Vui lòng thử lại sau.';
      toast.error(msg);
    },
  });
}

export function useAdminDeleteReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminReviewsApi.deleteReview(id, reason),
    onSuccess: () => {
      toast.success('Đã xóa mềm đánh giá vi phạm thành công.');
      void queryClient.invalidateQueries({ queryKey: adminReviewKeys.all });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể xóa đánh giá. Vui lòng thử lại sau.';
      toast.error(msg);
    },
  });
}

export function useAdminDismissReportsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminReviewsApi.dismissReports(id),
    onSuccess: () => {
      toast.success('Đã bỏ qua báo cáo vi phạm.');
      void queryClient.invalidateQueries({ queryKey: adminReviewKeys.all });
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể bỏ qua báo cáo. Vui lòng thử lại sau.';
      toast.error(msg);
    },
  });
}
