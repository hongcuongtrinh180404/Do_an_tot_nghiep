'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type {
  IApiResponse,
  ICourse,
  ICreateCoursePayload,
  ICreateSectionPayload,
  ISection,
} from 'share-lib';
import { apiClient } from '@/lib/api-client';

export const courseKeys = {
  all: ['courses'] as const,
  lists: () => [...courseKeys.all, 'list'] as const,
  myCourses: () => [...courseKeys.all, 'my-courses'] as const,
  detail: (id: string) => [...courseKeys.all, 'detail', id] as const,
  sections: (courseId: string) => [...courseKeys.detail(courseId), 'sections'] as const,
};

export const courseApi = {
  async createCourse(payload: ICreateCoursePayload): Promise<ICourse> {
    const res = await apiClient.post<IApiResponse<ICourse>>('/courses', payload);
    return res.data.data;
  },
  async getMyCourses(): Promise<ICourse[]> {
    const res = await apiClient.get<IApiResponse<ICourse[]>>('/courses/my-courses');
    return res.data.data;
  },
  async getCourseById(id: string): Promise<ICourse> {
    const res = await apiClient.get<IApiResponse<ICourse>>(`/courses/${id}`);
    return res.data.data;
  },
  async getSections(courseId: string): Promise<ISection[]> {
    const res = await apiClient.get<IApiResponse<ISection[]>>(`/courses/${courseId}/sections`);
    return res.data.data;
  },
  async createSection(courseId: string, payload: ICreateSectionPayload): Promise<ISection> {
    const res = await apiClient.post<IApiResponse<ISection>>(
      `/courses/${courseId}/sections`,
      payload,
    );
    return res.data.data;
  },
};

export function useMyCoursesQuery() {
  return useQuery({
    queryKey: courseKeys.myCourses(),
    queryFn: () => courseApi.getMyCourses(),
  });
}

export function useCourseDetailQuery(id: string) {
  return useQuery({
    queryKey: courseKeys.detail(id),
    queryFn: () => courseApi.getCourseById(id),
    enabled: Boolean(id),
  });
}

export function useCourseSectionsQuery(courseId: string) {
  return useQuery({
    queryKey: courseKeys.sections(courseId),
    queryFn: () => courseApi.getSections(courseId),
    enabled: Boolean(courseId),
  });
}

export function useCreateCourseMutation() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ICreateCoursePayload) => courseApi.createCourse(payload),
    onSuccess: (data: ICourse) => {
      // Invalidate course queries
      queryClient.invalidateQueries({ queryKey: courseKeys.all });

      toast.success('Tạo khóa học thành công!', {
        description: `Khóa học "${data.title}" đã được lưu thành công vào hệ thống.`,
      });

      // Redirect to courses management
      router.push('/instructor/courses');
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: {
          status?: number;
          data?: {
            message?: string | string[];
            error?: string;
            statusCode?: number;
          };
        };
      };

      const status = axiosError.response?.status;
      const responseData = axiosError.response?.data;
      const rawMessage = responseData?.message;
      const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;

      if (status === 401) {
        // apiClient response interceptor already attempted token refresh before reaching here.
        // If 401 reaches this point, refresh token failed or is invalid.
        toast.error('Phiên làm việc đã hết hạn', {
          description: 'Vui lòng đăng nhập lại để tiếp tục.',
        });
        router.push('/login');
        return;
      }

      if (status === 403) {
        toast.error('Không có quyền truy cập', {
          description:
            message || 'Tài khoản của bạn cần có quyền Giảng viên để thực hiện thao tác này.',
        });
        return;
      }

      if (status === 409) {
        toast.error('Đường dẫn tĩnh (slug) đã tồn tại', {
          description:
            message || 'Đường dẫn tĩnh này đã được sử dụng. Vui lòng chọn slug khác.',
        });
        return;
      }

      if (status === 400) {
        toast.error('Dữ liệu không hợp lệ', {
          description: message || 'Vui lòng kiểm tra lại các thông tin đã nhập.',
        });
        return;
      }

      toast.error('Lỗi tạo khóa học', {
        description:
          message || 'Không thể kết nối đến máy chủ hoặc đã xảy ra lỗi. Vui lòng thử lại sau.',
      });
    },
  });
}

export function useCreateSectionMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ICreateSectionPayload) => courseApi.createSection(courseId, payload),
    onSuccess: (data: ISection) => {
      // Invalidate course sections query so list automatically updates
      void queryClient.invalidateQueries({ queryKey: courseKeys.sections(courseId) });

      toast.success('Thêm chương học thành công!', {
        description: `Chương "${data.title}" đã được thêm vào khóa học.`,
      });
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: {
          status?: number;
          data?: {
            message?: string | string[];
            error?: string;
            statusCode?: number;
          };
        };
      };

      const status = axiosError.response?.status;
      const responseData = axiosError.response?.data;
      const rawMessage = responseData?.message;
      const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;

      if (status === 401) {
        toast.error('Phiên làm việc đã hết hạn', {
          description: 'Vui lòng đăng nhập lại để tiếp tục.',
        });
        return;
      }

      if (status === 403) {
        toast.error('Không có quyền thực hiện', {
          description:
            message || 'Chỉ giảng viên sở hữu khóa học mới có quyền thêm chương học.',
        });
        return;
      }

      if (status === 404) {
        toast.error('Khóa học không tồn tại', {
          description: message || 'Khóa học không tồn tại hoặc đã bị xóa.',
        });
        return;
      }

      if (status === 400) {
        toast.error('Dữ liệu không hợp lệ', {
          description: message || 'Vui lòng kiểm tra lại thông tin chương học đã nhập.',
        });
        return;
      }

      toast.error('Lỗi thêm chương học', {
        description:
          message || 'Không thể kết nối đến máy chủ hoặc đã xảy ra lỗi. Vui lòng thử lại sau.',
      });
    },
  });
}

