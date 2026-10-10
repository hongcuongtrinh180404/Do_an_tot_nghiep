'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { IApiResponse, ILessonQuiz, IQuizOption, QuizQuestionTypeEnum } from 'share-lib';
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

export const lessonQuizKeys = {
  all: ['lesson-quizzes'] as const,
  byLesson: (lessonId: string) => [...lessonQuizKeys.all, lessonId] as const,
};

export const lessonQuizApi = {
  async getQuizzes(lessonId: string): Promise<ILessonQuiz[]> {
    const res = await apiClient.get<IApiResponse<ILessonQuiz[]>>(`/lessons/${lessonId}/quizzes`);
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

  async deleteQuiz(quizId: string): Promise<void> {
    await apiClient.delete<IApiResponse<{ deleted: boolean }>>(`/lessons/quizzes/${quizId}`);
  },

  async deleteQuizCluster(lessonId: string, timestamp: number): Promise<void> {
    await apiClient.delete<IApiResponse<{ deletedCount: number }>>(
      `/lessons/${lessonId}/quizzes/timestamp/${timestamp}`,
    );
  },
};

export function useLessonQuizzesQuery(lessonId: string | undefined) {
  return useQuery({
    queryKey: lessonId ? lessonQuizKeys.byLesson(lessonId) : ['lesson-quizzes', 'disabled'],
    queryFn: () => lessonQuizApi.getQuizzes(lessonId!),
    enabled: Boolean(lessonId),
    staleTime: 1000 * 60 * 5, // 5 minutes cache
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

export function useDeleteLessonQuizMutation(lessonId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quizId: string) => lessonQuizApi.deleteQuiz(quizId),
    onSuccess: () => {
      if (lessonId) {
        queryClient.invalidateQueries({ queryKey: lessonQuizKeys.byLesson(lessonId) });
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

