'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type {
  IApiResponse,
  ICourse,
  ICreateCoursePayload,
  IUpdateCoursePayload,
  ICreateSectionPayload,
  IUpdateSectionPayload,
  IReorderSectionsPayload,
  ICreateLessonPayload,
  ISection,
  ILesson,
  ILessonTranscript,
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
  lessonTranscript: (lessonId: string) => ['lessons', 'transcript', lessonId] as const,
};

export const courseApi = {
  async createCourse(payload: ICreateCoursePayload): Promise<ICourse> {
    const res = await apiClient.post<IApiResponse<ICourse>>('/courses', payload);
    return res.data.data;
  },
  async updateCourse(id: string, payload: IUpdateCoursePayload): Promise<ICourse> {
    const res = await apiClient.patch<IApiResponse<ICourse>>(`/courses/${id}`, payload);
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
  async updateSection(
    courseId: string,
    sectionId: string,
    payload: IUpdateSectionPayload,
  ): Promise<ISection> {
    const res = await apiClient.patch<IApiResponse<ISection>>(
      `/courses/${courseId}/sections/${sectionId}`,
      payload,
    );
    return res.data.data;
  },
  async deleteSection(courseId: string, sectionId: string): Promise<null> {
    const res = await apiClient.delete<IApiResponse<null>>(
      `/courses/${courseId}/sections/${sectionId}`,
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
  async getLessonTranscript(lessonId: string): Promise<ILessonTranscript> {
    const res = await apiClient.get<IApiResponse<ILessonTranscript>>(
      `/lessons/${lessonId}/transcript`,
    );
    return res.data.data;
  },
  async retryLessonTranscription(lessonId: string): Promise<null> {
    const res = await apiClient.post<IApiResponse<null>>(
      `/lessons/${lessonId}/transcript/retry`,
    );
    return res.data.data;
  },
  async uploadLessonMaterial(
    lessonId: string,
    file: File,
    title?: string,
    onProgress?: (percent: number) => void,
  ): Promise<ILesson> {
    const formData = new FormData();
    formData.append('file', file);
    if (title && title.trim()) {
      formData.append('title', title.trim());
    }

    const res = await apiClient.post<IApiResponse<ILesson>>(
      `/lessons/${lessonId}/materials`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 0,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      },
    );
    return res.data.data;
  },
  async deleteLessonMaterial(lessonId: string, materialId: string): Promise<ILesson> {
    const res = await apiClient.delete<IApiResponse<ILesson>>(
      `/lessons/${lessonId}/materials/${materialId}`,
    );
    return res.data.data;
  },
  async deleteLesson(lessonId: string): Promise<null> {
    const res = await apiClient.delete<IApiResponse<null>>(`/lessons/${lessonId}`);
    return res.data.data;
  },
  async uploadThumbnail(
    courseId: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<ICourse> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.patch<IApiResponse<ICourse>>(
      `/courses/${courseId}/thumbnail`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      },
    );
    return res.data.data;
  },
  async uploadTrailer(
    courseId: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<ICourse> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiClient.patch<IApiResponse<ICourse>>(
      `/courses/${courseId}/trailer`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 0,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      },
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

export function useLessonTranscriptQuery(lessonId?: string) {
  return useQuery({
    queryKey: courseKeys.lessonTranscript(lessonId || ''),
    queryFn: () => courseApi.getLessonTranscript(lessonId || ''),
    enabled: Boolean(lessonId),
    staleTime: 60 * 1000,
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function useRetryLessonTranscriptionMutation(lessonId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => courseApi.retryLessonTranscription(lessonId || ''),
    onSuccess: () => {
      if (lessonId) {
        void queryClient.invalidateQueries({
          queryKey: courseKeys.lessonTranscript(lessonId),
        });
        void queryClient.invalidateQueries({
          queryKey: courseKeys.lessonDetail(lessonId),
        });
      }
      toast.success('Đã gửi yêu cầu trích xuất lại transcript!');
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: { data?: { message?: string | string[] } };
      };
      const raw = axiosError.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join(', ') : raw;
      toast.error('Lỗi yêu cầu trích xuất transcript', {
        description: msg || 'Không thể gửi yêu cầu trích xuất lúc này. Vui lòng thử lại sau.',
      });
    },
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

export function useUpdateCourseMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: IUpdateCoursePayload) => courseApi.updateCourse(courseId, payload),
    onSuccess: (updatedCourse) => {
      queryClient.setQueryData(courseKeys.detail(courseId), updatedCourse);
      void queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      void queryClient.invalidateQueries({ queryKey: courseKeys.myCourses() });
      toast.success('Cập nhật thông tin thành công');
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: {
          status?: number;
          data?: {
            message?: string | string[];
          };
        };
      };
      const message = Array.isArray(axiosError.response?.data?.message)
        ? axiosError.response?.data?.message.join(', ')
        : axiosError.response?.data?.message || 'Không thể cập nhật khóa học. Vui lòng thử lại sau.';
      toast.error(message);
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

export function useUpdateSectionMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sectionId,
      payload,
    }: {
      sectionId: string;
      payload: IUpdateSectionPayload;
    }) => courseApi.updateSection(courseId, sectionId, payload),
    onSuccess: (updatedSection: ISection) => {
      // 1. Cập nhật tức thì dữ liệu trong query cache để UI đổi ngay lập tức
      queryClient.setQueryData<ISection[]>(courseKeys.sections(courseId), (old) => {
        if (!old) return [updatedSection];
        return old.map((s) => (s.id === updatedSection.id ? updatedSection : s));
      });

      // 2. Invalidate query để đồng bộ dữ liệu mới nhất từ server
      void queryClient.invalidateQueries({ queryKey: courseKeys.sections(courseId) });

      toast.success('Cập nhật chương học thành công!', {
        description: `Chương "${updatedSection.title}" đã được lưu thay đổi.`,
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
            message || 'Chỉ giảng viên sở hữu khóa học mới có quyền chỉnh sửa chương học.',
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
          description: message || 'Vui lòng kiểm tra lại thông tin chương học đã nhập.',
        });
        return;
      }

      toast.error('Lỗi cập nhật chương học', {
        description:
          message || 'Không thể kết nối đến máy chủ hoặc đã xảy ra lỗi. Vui lòng thử lại sau.',
      });
    },
  });
}

export function useDeleteSectionMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sectionId: string) => courseApi.deleteSection(courseId, sectionId),
    onSuccess: (_, deletedSectionId) => {
      // 1. Cập nhật tức thì dữ liệu trong query cache: loại bỏ section bị xóa và dồn lại order
      queryClient.setQueryData<ISection[]>(courseKeys.sections(courseId), (old) => {
        if (!old) return [];
        const deletedSection = old.find((s) => s.id === deletedSectionId);
        const deletedOrder = deletedSection ? deletedSection.order : -1;
        return old
          .filter((s) => s.id !== deletedSectionId)
          .map((s) => {
            if (deletedOrder >= 0 && s.order > deletedOrder) {
              return { ...s, order: s.order - 1 };
            }
            return s;
          });
      });

      // 2. Invalidate query để đồng bộ dữ liệu mới nhất từ server
      void queryClient.invalidateQueries({ queryKey: courseKeys.sections(courseId) });
      void queryClient.invalidateQueries({ queryKey: courseKeys.lessons(deletedSectionId) });

      toast.success('Xóa chương học thành công!', {
        description: 'Chương học và các bài học bên trong đã được xóa.',
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
            message || 'Chỉ giảng viên sở hữu khóa học mới có quyền xóa chương học.',
        });
        return;
      }

      if (status === 404) {
        toast.error('Chương học không tồn tại', {
          description: message || 'Chương học không tồn tại hoặc đã bị xóa.',
        });
        return;
      }

      toast.error('Lỗi xóa chương học', {
        description:
          message || 'Không thể kết nối đến máy chủ hoặc đã xảy ra lỗi. Vui lòng thử lại sau.',
      });
    },
  });
}

export function useDeleteLessonMutation(sectionId: string, courseId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lessonId: string) => courseApi.deleteLesson(lessonId),
    onSuccess: (_, deletedLessonId) => {
      // 1. Cập nhật tức thì dữ liệu trong query cache: loại bỏ bài học bị xóa và dồn lại order
      queryClient.setQueryData<ILesson[]>(courseKeys.lessons(sectionId), (old) => {
        if (!old) return [];
        const deletedLesson = old.find((l) => l.id === deletedLessonId);
        const deletedOrder = deletedLesson ? deletedLesson.order : -1;
        return old
          .filter((l) => l.id !== deletedLessonId)
          .map((l) => {
            if (deletedOrder >= 0 && l.order > deletedOrder) {
              return { ...l, order: l.order - 1 };
            }
            return l;
          });
      });

      // 2. Invalidate query để đồng bộ dữ liệu mới nhất từ server
      void queryClient.invalidateQueries({ queryKey: courseKeys.lessons(sectionId) });
      if (courseId) {
        void queryClient.invalidateQueries({ queryKey: courseKeys.sections(courseId) });
      }
      void queryClient.invalidateQueries({ queryKey: courseKeys.lessonDetail(deletedLessonId) });

      toast.success('Xóa bài học thành công!', {
        description: 'Bài học đã được xóa khỏi giáo trình.',
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
            message || 'Chỉ giảng viên sở hữu khóa học mới có quyền xóa bài học.',
        });
        return;
      }

      if (status === 404) {
        toast.error('Bài học không tồn tại', {
          description: message || 'Bài học này có thể đã bị xóa trước đó.',
        });
        return;
      }

      toast.error('Lỗi xóa bài học', {
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

export function useUploadCourseThumbnailMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (percent: number) => void;
    }) => courseApi.uploadThumbnail(courseId, file, onProgress),
    onSuccess: (updatedCourse: ICourse) => {
      queryClient.setQueryData<ICourse>(courseKeys.detail(courseId), (old) => {
        if (!old) return updatedCourse;
        return {
          ...old,
          thumbnailUrl: updatedCourse.thumbnailUrl,
        };
      });
      void queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      void queryClient.invalidateQueries({ queryKey: courseKeys.all });

      toast.success('Cập nhật ảnh bìa thành công!', {
        description: 'Ảnh bìa khóa học mới đã được lưu trữ an toàn trên MinIO.',
      });
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: {
          status?: number;
          data?: { message?: string | string[] };
        };
      };
      const rawMessage = axiosError.response?.data?.message;
      const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;

      toast.error('Lỗi tải ảnh bìa', {
        description:
          message || 'Không thể tải ảnh bìa lên máy chủ lưu trữ. Vui lòng thử lại sau.',
      });
    },
  });
}

export function useUploadCourseTrailerMutation(courseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: File;
      onProgress?: (percent: number) => void;
    }) => courseApi.uploadTrailer(courseId, file, onProgress),
    onSuccess: (updatedCourse: ICourse) => {
      queryClient.setQueryData<ICourse>(courseKeys.detail(courseId), (old) => {
        if (!old) return updatedCourse;
        return {
          ...old,
          trailerUrl: updatedCourse.trailerUrl,
        };
      });
      void queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      void queryClient.invalidateQueries({ queryKey: courseKeys.all });

      toast.success('Cập nhật video trailer thành công!', {
        description: 'Video giới thiệu khóa học đã được lưu trữ an toàn trên MinIO.',
      });
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: {
          status?: number;
          data?: { message?: string | string[] };
        };
      };
      const rawMessage = axiosError.response?.data?.message;
      const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;

      toast.error('Lỗi tải video trailer', {
        description:
          message || 'Không thể tải video trailer lên máy chủ lưu trữ. Vui lòng thử lại sau.',
      });
    },
  });
}

export function useUploadLessonMaterialMutation(options?: {
  courseId?: string;
  sectionId?: string;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      lessonId,
      file,
      title,
      onProgress,
    }: {
      lessonId: string;
      file: File;
      title?: string;
      onProgress?: (percent: number) => void;
    }) => courseApi.uploadLessonMaterial(lessonId, file, title, onProgress),
    onSuccess: (updatedLesson: ILesson) => {
      // Invalidate chi tiết bài học
      void queryClient.invalidateQueries({
        queryKey: courseKeys.lessonDetail(updatedLesson.id),
      });

      // Invalidate danh sách bài học của section
      const secId = options?.sectionId || updatedLesson.sectionId;
      if (secId) {
        void queryClient.invalidateQueries({
          queryKey: courseKeys.lessons(secId),
        });
      }

      // Invalidate các sections của course nếu có
      if (options?.courseId) {
        void queryClient.invalidateQueries({
          queryKey: courseKeys.sections(options.courseId),
        });
      }

      toast.success('Đính kèm tài liệu thành công!', {
        description: 'Tài liệu đã được lưu trữ an toàn trên MinIO và liên kết vào bài học.',
      });
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: {
          status?: number;
          data?: { message?: string | string[] };
        };
      };
      const rawMessage = axiosError.response?.data?.message;
      const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;

      toast.error('Lỗi tải tài liệu', {
        description:
          message || 'Không thể tải tài liệu lên máy chủ lưu trữ. Vui lòng thử lại sau.',
      });
    },
  });
}

export function useDeleteLessonMaterialMutation(options?: {
  courseId?: string;
  sectionId?: string;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      lessonId,
      materialId,
    }: {
      lessonId: string;
      materialId: string;
    }) => courseApi.deleteLessonMaterial(lessonId, materialId),
    onSuccess: (updatedLesson: ILesson) => {
      // Invalidate chi tiết bài học
      void queryClient.invalidateQueries({
        queryKey: courseKeys.lessonDetail(updatedLesson.id),
      });

      // Invalidate danh sách bài học của section
      const secId = options?.sectionId || updatedLesson.sectionId;
      if (secId) {
        void queryClient.invalidateQueries({
          queryKey: courseKeys.lessons(secId),
        });
      }

      // Invalidate các sections của course nếu có
      if (options?.courseId) {
        void queryClient.invalidateQueries({
          queryKey: courseKeys.sections(options.courseId),
        });
      }

      toast.success('Xóa tài liệu thành công!', {
        description: 'Tài liệu đã được gỡ bỏ khỏi bài học và MinIO.',
      });
    },
    onError: (error: unknown) => {
      const axiosError = error as {
        response?: {
          status?: number;
          data?: { message?: string | string[] };
        };
      };
      const rawMessage = axiosError.response?.data?.message;
      const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;

      toast.error('Lỗi khi xóa tài liệu', {
        description: message || 'Không thể xóa tài liệu. Vui lòng thử lại sau.',
      });
    },
  });
}

