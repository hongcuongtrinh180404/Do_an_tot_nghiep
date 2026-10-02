'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type {
  IApiResponse,
  ICourse,
  ICreateCoursePayload,
  ICreateSectionPayload,
  IReorderSectionsPayload,
  ICreateLessonPayload,
  ISection,
  ILesson,
} from 'share-lib';
import { apiClient } from '@/lib/api-client';

export const courseKeys = {
  all: ['courses'] as const,
  lists: () => [...courseKeys.all, 'list'] as const,
  myCourses: () => [...courseKeys.all, 'my-courses'] as const,
  detail: (id: string) => [...courseKeys.all, 'detail', id] as const,
  sections: (courseId: string) => [...courseKeys.detail(courseId), 'sections'] as const,
  lessons: (sectionId: string) => ['sections', sectionId, 'lessons'] as const,
  lessonDetail: (lessonId: string) => ['lessons', 'detail', lessonId] as const,
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
  async reorderSections(
    courseId: string,
    payload: IReorderSectionsPayload,
  ): Promise<ISection[]> {
    const res = await apiClient.put<IApiResponse<ISection[]>>(
      `/courses/${courseId}/sections/reorder`,
      payload,
    );
    return res.data.data;
  },
  async getLessons(sectionId: string): Promise<ILesson[]> {
    const res = await apiClient.get<IApiResponse<ILesson[]>>(`/sections/${sectionId}/lessons`);
    return res.data.data;
  },
  async createLesson(sectionId: string, payload: ICreateLessonPayload): Promise<ILesson> {
    const res = await apiClient.post<IApiResponse<ILesson>>(
      `/sections/${sectionId}/lessons`,
      payload,
    );
    return res.data.data;
  },
  async getLessonById(id: string): Promise<ILesson> {
    const res = await apiClient.get<IApiResponse<ILesson>>(`/lessons/${id}`);
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

export function useSectionLessonsQuery(sectionId: string) {
  return useQuery({
    queryKey: courseKeys.lessons(sectionId),
    queryFn: () => courseApi.getLessons(sectionId),
    enabled: Boolean(sectionId),
  });
}

export function useLessonDetailQuery(id: string) {
  return useQuery({
    queryKey: courseKeys.lessonDetail(id),
    queryFn: () => courseApi.getLessonById(id),
    enabled: Boolean(id),
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

export function useReorderSectionsMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: IReorderSectionsPayload) =>
      courseApi.reorderSections(courseId, payload),
    onMutate: async (newOrderPayload) => {
      await queryClient.cancelQueries({ queryKey: courseKeys.sections(courseId) });

      const previousSections = queryClient.getQueryData<ISection[]>(
        courseKeys.sections(courseId),
      );

      if (previousSections) {
        const idMap = new Map(previousSections.map((s) => [s.id, s]));
        const reordered: ISection[] = newOrderPayload.sectionIds
          .map((id, index) => {
            const section = idMap.get(id);
            if (!section) return null;
            return {
              ...section,
              order: index,
            };
          })
          .filter((s): s is ISection => s !== null);

        queryClient.setQueryData<ISection[]>(courseKeys.sections(courseId), reordered);
      }

      return { previousSections };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousSections) {
        queryClient.setQueryData<ISection[]>(
          courseKeys.sections(courseId),
          context.previousSections,
        );
      }
      toast.error('Không thể cập nhật thứ tự chương', {
        description: 'Đã có lỗi xảy ra khi lưu vị trí mới. Đã khôi phục lại thứ tự ban đầu.',
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: courseKeys.sections(courseId) });
    },
  });
}

export function useCreateLessonMutation(sectionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ICreateLessonPayload) => courseApi.createLesson(sectionId, payload),
    onSuccess: (data: ILesson) => {
      // Invalidate section lessons query so list automatically updates
      void queryClient.invalidateQueries({ queryKey: courseKeys.lessons(sectionId) });

      toast.success('Thêm bài học thành công!', {
        description: `Bài học "${data.title}" đã được thêm vào chương.`,
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
            message || 'Chỉ giảng viên hoặc quản trị viên mới có quyền thêm bài học.',
        });
        return;
      }

      if (status === 404) {
        toast.error('Chương học không tồn tại', {
          description: message || 'Chương học không tồn tại hoặc đã bị xóa.',
        });
        return;
      }

      if (status === 400) {
        toast.error('Dữ liệu không hợp lệ', {
          description: message || 'Vui lòng kiểm tra lại thông tin bài học đã nhập.',
        });
        return;
      }

      toast.error('Lỗi thêm bài học', {
        description:
          message || 'Không thể kết nối đến máy chủ hoặc đã xảy ra lỗi. Vui lòng thử lại sau.',
      });
    },
  });
}

