'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { IApiResponse, ILessonQuiz, IQuizOption, ISaveLessonQuizPayload, QuizQuestionTypeEnum } from 'share-lib';
import { apiClient } from '@/lib/api-client';

export interface IQuizQuestionPayloadItem {
  id?: string;
  order: number;
  question: string;
  questionType: QuizQuestionTypeEnum;
  options: IQuizOption[];
  explanation?: string | null;
}

export interface ISyncLessonQuizzesPayload {
  timestamp: number;
  questions?: IQuizQuestionPayloadItem[];
  quizzes?: IQuizQuestionPayloadItem[];
}

export interface IMoveMergeLessonQuizzesPayload {
  sourceTimestamp: number;
  targetTimestamp: number;
}

export const lessonQuizKeys = {
  all: ['lesson-quizzes'] as const,
  byLesson: (lessonId: string) => [...lessonQuizKeys.all, lessonId] as const,
};

export function getLessonQuizErrorMessage(error: unknown): string {
  const response = (error as { response?: { data?: { message?: string | string[] } } })?.response;
  const message = response?.data?.message;
  return Array.isArray(message)
    ? message.join(', ')
    : typeof message === 'string'
      ? message
      : 'Không thể lưu câu hỏi. Vui lòng thử lại.';
}

export const lessonQuizApi = {
  async getQuizzes(lessonId: string): Promise<ILessonQuiz[]> {
    const res = await apiClient.get<IApiResponse<ILessonQuiz[]>>(`/lessons/${lessonId}/quizzes/manage`);
    return res.data.data;
  },

  async createQuiz(lessonId: string, payload: ISaveLessonQuizPayload): Promise<ILessonQuiz> {
    const res = await apiClient.post<IApiResponse<ILessonQuiz>>(`/lessons/${lessonId}/quizzes`, payload);
    return res.data.data;
  },

  async updateQuiz(quizId: string, payload: ISaveLessonQuizPayload): Promise<ILessonQuiz> {
    const res = await apiClient.put<IApiResponse<ILessonQuiz>>(`/lessons/quizzes/${quizId}`, payload);
    return res.data.data;
  },

  async syncQuizzes(
    lessonId: string,
    payload: ISyncLessonQuizzesPayload,
  ): Promise<ILessonQuiz[]> {
    const questions = payload.questions || payload.quizzes || [];
    const res = await apiClient.put<IApiResponse<ILessonQuiz[]>>(
      `/lessons/${lessonId}/quizzes/sync`,
      {
        timestamp: payload.timestamp,
        questions,
      },
    );
    return res.data.data;
  },

  async moveOrMergeQuizzes(
    lessonId: string,
    payload: IMoveMergeLessonQuizzesPayload,
  ): Promise<ILessonQuiz[]> {
    const res = await apiClient.put<IApiResponse<ILessonQuiz[]>>(
      `/lessons/${lessonId}/quizzes/move-merge`,
      payload,
    );
    return res.data.data;
  },

  async deleteQuiz(quizId: string): Promise<void> {
    await apiClient.delete<IApiResponse<{ deleted: boolean }>>(`/lessons/quizzes/${quizId}`);
  },

  async deleteQuizCluster(lessonId: string, timestamp: number): Promise<void> {
    await apiClient.delete<IApiResponse<{ deletedCount: number }>>(
      `/lessons/${lessonId}/quizzes/timestamp/${timestamp}`,
    );
  },
};

export function useLessonQuizzesQuery(lessonId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: lessonId ? lessonQuizKeys.byLesson(lessonId) : ['lesson-quizzes', 'disabled'],
    queryFn: () => lessonQuizApi.getQuizzes(lessonId!),
    enabled: Boolean(lessonId) && enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

export function useSaveLessonQuizMutation(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quizId, payload }: { quizId?: string; payload: ISaveLessonQuizPayload }) =>
      quizId ? lessonQuizApi.updateQuiz(quizId, payload) : lessonQuizApi.createQuiz(lessonId, payload),
    onSuccess: async (quiz, { quizId }) => {
      queryClient.setQueryData<ILessonQuiz[]>(lessonQuizKeys.byLesson(lessonId), (previous) =>
        [...(previous ?? []).filter((item) => item.id !== quiz.id), quiz]
          .sort((a, b) => a.timestamp - b.timestamp || a.order - b.order || a.id.localeCompare(b.id)),
      );
      await queryClient.invalidateQueries({ queryKey: lessonQuizKeys.byLesson(lessonId) });
      toast.success(quizId ? 'Đã cập nhật câu hỏi' : 'Đã thêm câu hỏi');
    },
    onError: (error: unknown) => {
      toast.error('Lỗi lưu câu hỏi', { description: getLessonQuizErrorMessage(error) });
    },
  });
}

export function useSyncLessonQuizzesMutation(lessonId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ISyncLessonQuizzesPayload) => {
      if (!lessonId) throw new Error('lessonId is required to sync quizzes');
      return lessonQuizApi.syncQuizzes(lessonId, payload);
    },
    onSuccess: () => {
      if (lessonId) {
        queryClient.invalidateQueries({ queryKey: lessonQuizKeys.byLesson(lessonId) });
      }
      toast.success('Lưu câu hỏi tương tác thành công!', {
        description: 'Các câu hỏi tại mốc thời gian này đã được đồng bộ vào hệ thống.',
      });
    },
    onError: (error: unknown) => {
      const responseData = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
      const rawMessage = responseData?.message;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join(', ')
        : typeof rawMessage === 'string'
          ? rawMessage
          : 'Không thể lưu câu hỏi. Vui lòng kiểm tra lại kết nối mạng.';
      toast.error('Lỗi lưu câu hỏi', {
        description: message,
      });
    },
  });
}

export function useMoveMergeLessonQuizClusterMutation(lessonId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: IMoveMergeLessonQuizzesPayload) => {
      if (!lessonId) throw new Error('lessonId is required to move or merge quizzes');
      return lessonQuizApi.moveOrMergeQuizzes(lessonId, payload);
    },
    onSuccess: () => {
      if (lessonId) {
        queryClient.invalidateQueries({ queryKey: lessonQuizKeys.byLesson(lessonId) });
      }
    },
    onError: (error: unknown) => {
      const responseData = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data;
      const rawMessage = responseData?.message;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join(', ')
        : typeof rawMessage === 'string'
          ? rawMessage
          : 'Không thể di chuyển hoặc gộp cụm câu hỏi.';
      toast.error('Lỗi cập nhật mốc câu hỏi', {
        description: message,
      });
    },
  });
}

export function useDeleteLessonQuizMutation(lessonId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quizId: string) => lessonQuizApi.deleteQuiz(quizId),
    onSuccess: async (_, quizId) => {
      if (lessonId) {
        queryClient.setQueryData<ILessonQuiz[]>(lessonQuizKeys.byLesson(lessonId), (previous) =>
          previous?.filter((quiz) => quiz.id !== quizId),
        );
        await queryClient.invalidateQueries({ queryKey: lessonQuizKeys.byLesson(lessonId) });
      }
      toast.success('Đã xóa câu hỏi tương tác');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Không thể xóa câu hỏi.';
      toast.error('Lỗi xóa câu hỏi', {
        description: message,
      });
    },
  });
}

export function useDeleteLessonQuizClusterMutation(lessonId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (timestamp: number) => {
      if (!lessonId) throw new Error('lessonId is required to delete quiz cluster');
      return lessonQuizApi.deleteQuizCluster(lessonId, timestamp);
    },
    onSuccess: () => {
      if (lessonId) {
        queryClient.invalidateQueries({ queryKey: lessonQuizKeys.byLesson(lessonId) });
      }
      toast.success('Đã xóa toàn bộ câu hỏi tại mốc này thành công!');
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : 'Không thể xóa cụm câu hỏi.';
      toast.error('Lỗi xóa câu hỏi', {
        description: message,
      });
    },
  });
}
