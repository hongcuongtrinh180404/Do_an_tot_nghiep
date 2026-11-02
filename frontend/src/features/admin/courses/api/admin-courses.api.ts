'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { IApiResponse, ICourse, CourseStatusEnum } from 'share-lib';
import { apiClient } from '@/lib/api-client';
import { useIsMounted } from '@/hooks/use-is-mounted';

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
  list: (params: AdminCoursesQueryParams) => [...adminCoursesKeys.all, 'list', params] as const,
  detail: (courseId: string) => [...adminCoursesKeys.all, 'detail', courseId] as const,
};

export const adminCoursesApi = {
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
      '/api/v1/courses/admin',
      { params: queryParams },
    );
    return response.data.data;
  },

  async approveCourse(courseId: string): Promise<ICourse> {
    const response = await apiClient.post<IApiResponse<ICourse>>(
      `/api/v1/courses/${courseId}/approve`,
    );
    return response.data.data;
  },

  async rejectCourse(courseId: string, reason: string): Promise<ICourse> {
    const response = await apiClient.post<IApiResponse<ICourse>>(
      `/api/v1/courses/${courseId}/reject`,
      { reason },
    );
    return response.data.data;
  },
};

export function useAdminCoursesQuery(params: AdminCoursesQueryParams) {
  const isMounted = useIsMounted();
  return useQuery({
    queryKey: adminCoursesKeys.list(params),
    queryFn: () => adminCoursesApi.getCourses(params),
    enabled: isMounted,
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