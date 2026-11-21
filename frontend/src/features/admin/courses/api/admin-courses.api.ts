'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  IAdminCourseStats,
  IApiResponse,
  ICourse,
  CourseStatusEnum,
  ICourseApprovalHistory,
  IAdminCourseApprovalHistoryStats,
} from 'share-lib';
import { apiClient } from '@/lib/api-client';
import { useIsMounted } from '@/hooks/use-is-mounted';
import type { AdminCourseApprovalHistoriesQueryParams } from '../types';

export interface AdminCoursesPaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface AdminCoursesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CourseStatusEnum | string;
  categoryId?: string;
  instructorId?: string;
  sort?: string;
}

export const adminCoursesKeys = {
  all: ['admin-courses'] as const,
  stats: () => [...adminCoursesKeys.all, 'stats'] as const,
  list: (params: AdminCoursesQueryParams) => [...adminCoursesKeys.all, 'list', params] as const,
  detail: (courseId: string) => [...adminCoursesKeys.all, 'detail', courseId] as const,
  approvalHistories: (params: AdminCourseApprovalHistoriesQueryParams) =>
    [...adminCoursesKeys.all, 'approval-histories', params] as const,
  approvalHistoryStats: () =>
    [...adminCoursesKeys.all, 'approval-histories', 'stats'] as const,
  courseApprovalHistory: (courseId: string) =>
    [...adminCoursesKeys.all, 'approval-histories', 'course', courseId] as const,
};

export const adminCoursesApi = {
  async getStats(): Promise<IAdminCourseStats> {
    const response = await apiClient.get<IApiResponse<IAdminCourseStats>>('/courses/admin/stats');
    return response.data.data;
  },

  async getCourses(params: AdminCoursesQueryParams): Promise<AdminCoursesPaginationResult<ICourse>> {
    const queryParams: Record<string, string | number> = {
      page: params.page || 1,
      limit: params.limit || 10,
    };

    if (params.search?.trim()) {
      queryParams.search = params.search.trim();
    }

    if (params.status) {
      queryParams.status = params.status;
    }

    if (params.categoryId) {
      queryParams.categoryId = params.categoryId;
    }

    if (params.instructorId) {
      queryParams.instructorId = params.instructorId;
    }

    if (params.sort) {
      queryParams.sort = params.sort;
    }

    const response = await apiClient.get<IApiResponse<AdminCoursesPaginationResult<ICourse>>>(
      '/courses/admin',
      { params: queryParams },
    );
    return response.data.data;
  },

  async approveCourse(courseId: string): Promise<ICourse> {
    const response = await apiClient.post<IApiResponse<ICourse>>(
      `/courses/${courseId}/approve`,
    );
    return response.data.data;
  },

  async rejectCourse(courseId: string, reason: string): Promise<ICourse> {
    const response = await apiClient.post<IApiResponse<ICourse>>(
      `/courses/${courseId}/reject`,
      { reason },
    );
    return response.data.data;
  },

  async getApprovalHistories(
    params: AdminCourseApprovalHistoriesQueryParams,
  ): Promise<AdminCoursesPaginationResult<ICourseApprovalHistory>> {
    const queryParams: Record<string, string | number> = {
      page: params.page || 1,
      limit: params.limit || 10,
    };

    if (params.search?.trim()) {
      queryParams.search = params.search.trim();
    }

    if (params.action) {
      queryParams.action = params.action;
    }

    if (params.courseId) {
      queryParams.courseId = params.courseId;
    }

    if (params.sort) {
      queryParams.sort = params.sort;
    }

    const response = await apiClient.get<IApiResponse<AdminCoursesPaginationResult<ICourseApprovalHistory>>>(
      '/courses/admin/approval-history',
      { params: queryParams },
    );
    return response.data.data;
  },

  async getApprovalHistoryStats(): Promise<IAdminCourseApprovalHistoryStats> {
    const response = await apiClient.get<IApiResponse<IAdminCourseApprovalHistoryStats>>(
      '/courses/admin/approval-history/stats',
    );
    return response.data.data;
  },

  async getCourseApprovalHistory(courseId: string): Promise<ICourseApprovalHistory[]> {
    const response = await apiClient.get<IApiResponse<ICourseApprovalHistory[]>>(
      `/courses/${courseId}/approval-history`,
    );
    return response.data.data;
  },
};

export function useAdminCourseStatsQuery() {
  const isMounted = useIsMounted();
  return useQuery({
    queryKey: adminCoursesKeys.stats(),
    queryFn: () => adminCoursesApi.getStats(),
    enabled: isMounted,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useAdminCoursesQuery(params: AdminCoursesQueryParams) {
  const isMounted = useIsMounted();
  return useQuery({
    queryKey: adminCoursesKeys.list(params),
    queryFn: () => adminCoursesApi.getCourses(params),
    enabled: isMounted,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useAdminCourseApprovalHistoriesQuery(params: AdminCourseApprovalHistoriesQueryParams) {
  const isMounted = useIsMounted();
  return useQuery({
    queryKey: adminCoursesKeys.approvalHistories(params),
    queryFn: () => adminCoursesApi.getApprovalHistories(params),
    enabled: isMounted,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useAdminCourseApprovalHistoryStatsQuery() {
  const isMounted = useIsMounted();
  return useQuery({
    queryKey: adminCoursesKeys.approvalHistoryStats(),
    queryFn: () => adminCoursesApi.getApprovalHistoryStats(),
    enabled: isMounted,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
}

export function useCourseApprovalHistoryQuery(courseId: string | null) {
  const isMounted = useIsMounted();
  return useQuery({
    queryKey: courseId ? adminCoursesKeys.courseApprovalHistory(courseId) : ['null-course-history'],
    queryFn: () => (courseId ? adminCoursesApi.getCourseApprovalHistory(courseId) : Promise.resolve([])),
    enabled: isMounted && Boolean(courseId),
    staleTime: 0,
  });
}

export function useApproveCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId: string) => adminCoursesApi.approveCourse(courseId),
    onSuccess: (updatedCourse) => {
      toast.success('Phê duyệt thành công', {
        description: `Khóa học "${updatedCourse.title}" đã được xuất bản công khai.`,
      });
      void queryClient.invalidateQueries({ queryKey: adminCoursesKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['courses', updatedCourse.id] });
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: { data?: { message?: string; statusCode?: number } };
      };
      const message =
        axiosError?.response?.data?.message || 'Có lỗi xảy ra khi phê duyệt khóa học.';
      toast.error('Phê duyệt thất bại', {
        description: Array.isArray(message) ? message[0] : message,
      });
    },
  });
}

export function useRejectCourseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ courseId, reason }: { courseId: string; reason: string }) =>
      adminCoursesApi.rejectCourse(courseId, reason),
    onSuccess: (updatedCourse) => {
      toast.success('Đã gửi yêu cầu chỉnh sửa', {
        description: `Khóa học "${updatedCourse.title}" đã được chuyển về bản nháp kèm lý do phản hồi.`,
      });
      void queryClient.invalidateQueries({ queryKey: adminCoursesKeys.all });
      void queryClient.invalidateQueries({ queryKey: ['courses', updatedCourse.id] });
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: { data?: { message?: string; statusCode?: number } };
      };
      const message =
        axiosError?.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu chỉnh sửa.';
      toast.error('Yêu cầu chỉnh sửa thất bại', {
        description: Array.isArray(message) ? message[0] : message,
      });
    },
  });
}
