'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { IApiResponse, ICourse, IEnrollment, ISection } from 'share-lib';
import { apiClient } from '@/lib/api-client';
import { courseKeys } from './course.api';

export interface IPublicCourseDetailResponse extends ICourse {
  sections: Array<
    ISection & {
      lessons: Array<{
        id: string;
        title: string;
        order: number;
        duration: number;
        isPreview: boolean;
        type?: string | null;
      }>;
    }
  >;
}

export const enrollmentKeys = {
  all: ['enrollments'] as const,
  myCourses: () => [...enrollmentKeys.all, 'my-courses'] as const,
  check: (courseId: string) => [...enrollmentKeys.all, 'check', courseId] as const,
  publicDetail: (idOrSlug: string) => ['courses', 'public-detail', idOrSlug] as const,
};

export const enrollmentApi = {
  async getMyCourses(): Promise<ICourse[]> {
    const res = await apiClient.get<IApiResponse<ICourse[]>>('/enrollments/my-courses');
    return res.data.data;
  },

  async checkEnrollment(courseId: string): Promise<boolean> {
    const res = await apiClient.get<IApiResponse<{ isEnrolled: boolean }>>(
      `/enrollments/check/${courseId}`,
    );
    return res.data.data.isEnrolled;
  },

  async registerFreeCourse(
    courseId: string,
  ): Promise<IEnrollment> {
    const res = await apiClient.post<IApiResponse<IEnrollment>>(
      '/enrollments/register-free',
      { courseId },
    );
    return res.data.data;
  },

  async getPublicCourseDetail(idOrSlug: string): Promise<IPublicCourseDetailResponse> {
    const res = await apiClient.get<IApiResponse<IPublicCourseDetailResponse>>(
      `/courses/public/${idOrSlug}`,
    );
    return res.data.data;
  },
};

export function useMyPurchasedCoursesQuery(enabled: boolean = true) {
  return useQuery({
    queryKey: enrollmentKeys.myCourses(),
    queryFn: () => enrollmentApi.getMyCourses(),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useCheckEnrollmentQuery(courseId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: enrollmentKeys.check(courseId),
    queryFn: () => enrollmentApi.checkEnrollment(courseId),
    enabled: Boolean(courseId) && enabled,
    staleTime: 30 * 1000,
  });
}

export function usePublicCourseDetailQuery(idOrSlug: string, enabled: boolean = true) {
  return useQuery({
    queryKey: enrollmentKeys.publicDetail(idOrSlug),
    queryFn: () => enrollmentApi.getPublicCourseDetail(idOrSlug),
    enabled: Boolean(idOrSlug) && enabled,
    staleTime: 60 * 1000,
  });
}

export function useRegisterFreeCourseMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => enrollmentApi.registerFreeCourse(courseId),
    onSuccess: () => {
      toast.success('Đăng ký khóa học miễn phí thành công! Bạn có thể bắt đầu học ngay.');
      // Invalidate both enrollment and course caches
      void queryClient.invalidateQueries({ queryKey: enrollmentKeys.all });
      void queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      const message =
        axiosError?.response?.data?.message ||
        'Không thể đăng ký khóa học miễn phí. Vui lòng thử lại sau.';
      toast.error(message);
    },
  });
}
