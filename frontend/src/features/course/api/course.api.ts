'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { IApiResponse, ICourse, ICreateCoursePayload } from 'share-lib';
import { apiClient } from '@/lib/api-client';

export const courseKeys = {
  all: ['courses'] as const,
  lists: () => [...courseKeys.all, 'list'] as const,
  detail: (id: string) => [...courseKeys.all, 'detail', id] as const,
};

export const courseApi = {
  async createCourse(payload: ICreateCoursePayload): Promise<ICourse> {
    const res = await apiClient.post<IApiResponse<ICourse>>('/courses', payload);
    return res.data.data;
  },
};

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
