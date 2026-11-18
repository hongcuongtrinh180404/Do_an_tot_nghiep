'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  IApiResponse,
  IInstructorApplication,
  IInstructorTerm,
  IAdminInstructorApplicationsStats,
} from 'share-lib';
import { apiClient } from '@/lib/api-client';
import { useIsMounted } from '@/hooks/use-is-mounted';
import type {
  AdminInstructorApplicationsQueryParams,
  UpdateInstructorTermsPayload,
} from '../types';

export interface AdminInstructorApplicationsPaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export const adminInstructorsKeys = {
  all: ['admin-instructors'] as const,
  list: (params: AdminInstructorApplicationsQueryParams) =>
    [...adminInstructorsKeys.all, 'list', params] as const,
  pendingCount: () => [...adminInstructorsKeys.all, 'pending-count'] as const,
  stats: () => [...adminInstructorsKeys.all, 'stats'] as const,
  detail: (id: string) => [...adminInstructorsKeys.all, 'detail', id] as const,
  terms: () => [...adminInstructorsKeys.all, 'terms'] as const,
};

export const adminInstructorsApi = {
  async getApplications(
    params: AdminInstructorApplicationsQueryParams,
  ): Promise<AdminInstructorApplicationsPaginationResult<IInstructorApplication>> {
    const queryParams: Record<string, string | number> = {
      page: params.page || 1,
      limit: params.limit || 10,
    };

    if (params.tab) {
      queryParams.tab = params.tab;
    }

    if (params.status) {
      queryParams.status = params.status;
    }

    if (params.search?.trim()) {
      queryParams.search = params.search.trim();
    }

    if (params.sort) {
      queryParams.sort = params.sort;
    }

    const response = await apiClient.get<
      IApiResponse<AdminInstructorApplicationsPaginationResult<IInstructorApplication>>
    >('/admin/instructor-applications', { params: queryParams });

    return response.data.data;
  },

  async getPendingCount(): Promise<{ pendingCount: number }> {
    const response = await apiClient.get<IApiResponse<{ pendingCount: number }>>(
      '/admin/instructor-applications/stats/pending-count',
    );
    return response.data.data;
  },

  async getStats(): Promise<IAdminInstructorApplicationsStats> {
    const response = await apiClient.get<IApiResponse<IAdminInstructorApplicationsStats>>(
      '/admin/instructor-applications/stats/overview',
    );
    return response.data.data;
  },

  async getApplicationDetail(id: string): Promise<IInstructorApplication> {
    const response = await apiClient.get<IApiResponse<IInstructorApplication>>(
      `/admin/instructor-applications/${id}`,
    );
    return response.data.data;
  },

  async approveApplication(id: string): Promise<IInstructorApplication> {
    const response = await apiClient.patch<IApiResponse<IInstructorApplication>>(
      `/admin/instructor-applications/${id}/approve`,
    );
    return response.data.data;
  },

  async rejectApplication(id: string, rejectionReason: string): Promise<IInstructorApplication> {
    const response = await apiClient.patch<IApiResponse<IInstructorApplication>>(
      `/admin/instructor-applications/${id}/reject`,
      { rejectionReason },
    );
    return response.data.data;
  },

  async getTerms(): Promise<IInstructorTerm[]> {
    const response = await apiClient.get<IApiResponse<IInstructorTerm[]>>(
      '/admin/instructor-terms',
    );
    return response.data.data;
  },

  async updateTerms(payload: UpdateInstructorTermsPayload): Promise<IInstructorTerm[]> {
    const response = await apiClient.put<IApiResponse<IInstructorTerm[]>>(
      '/admin/instructor-terms',
      payload,
    );
    return response.data.data;
  },
};

export function useAdminInstructorApplicationsQuery(
  params: AdminInstructorApplicationsQueryParams,
) {
  const isMounted = useIsMounted();
  return useQuery({
    queryKey: adminInstructorsKeys.list(params),
    queryFn: () => adminInstructorsApi.getApplications(params),
    enabled: isMounted,
  });
}

export function usePendingApplicationsCountQuery() {
  const isMounted = useIsMounted();
  return useQuery({
    queryKey: adminInstructorsKeys.pendingCount(),
    queryFn: () => adminInstructorsApi.getPendingCount(),
    enabled: isMounted,
    refetchInterval: 30000,
  });
}

export function useInstructorTermsQuery() {
  const isMounted = useIsMounted();
  return useQuery({
    queryKey: adminInstructorsKeys.terms(),
    queryFn: () => adminInstructorsApi.getTerms(),
    enabled: isMounted,
  });
}

export function useApproveInstructorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (applicationId: string) =>
      adminInstructorsApi.approveApplication(applicationId),
    onSuccess: (updatedApp) => {
      toast.success('Phê duyệt thành công', {
        description: `Đã cấp quyền Giảng viên cho ứng viên "${updatedApp.applicantName}".`,
      });
      void queryClient.invalidateQueries({ queryKey: adminInstructorsKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: { data?: { message?: string; statusCode?: number } };
      };
      const message =
        axiosError?.response?.data?.message || 'Có lỗi xảy ra khi phê duyệt hồ sơ.';
      toast.error('Phê duyệt thất bại', {
        description: Array.isArray(message) ? message[0] : message,
      });
    },
  });
}

export function useRejectInstructorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      applicationId,
      rejectionReason,
    }: {
      applicationId: string;
      rejectionReason: string;
    }) => adminInstructorsApi.rejectApplication(applicationId, rejectionReason),
    onSuccess: (updatedApp) => {
      toast.success('Đã gửi phản hồi từ chối', {
        description: `Hồ sơ của "${updatedApp.applicantName}" đã chuyển sang trạng thái từ chối.`,
      });
      void queryClient.invalidateQueries({ queryKey: adminInstructorsKeys.all });
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: { data?: { message?: string; statusCode?: number } };
      };
      const message =
        axiosError?.response?.data?.message || 'Có lỗi xảy ra khi từ chối hồ sơ.';
      toast.error('Thao tác thất bại', {
        description: Array.isArray(message) ? message[0] : message,
      });
    },
  });
}

export function useUpdateInstructorTermsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateInstructorTermsPayload) =>
      adminInstructorsApi.updateTerms(payload),
    onSuccess: () => {
      toast.success('Lưu điều khoản thành công', {
        description: 'Các điều khoản giảng viên đã được cập nhật đồng bộ lên hệ thống.',
      });
      void queryClient.invalidateQueries({ queryKey: adminInstructorsKeys.terms() });
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: { data?: { message?: string; statusCode?: number } };
      };
      const message =
        axiosError?.response?.data?.message || 'Có lỗi xảy ra khi lưu điều khoản.';
      toast.error('Lưu điều khoản thất bại', {
        description: Array.isArray(message) ? message[0] : message,
      });
    },
  });
}
