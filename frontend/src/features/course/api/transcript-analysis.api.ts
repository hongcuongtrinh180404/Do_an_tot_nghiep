'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  IApiResponse,
  ILessonMindmap,
  ILessonMindmapData,
  ILessonQuiz,
  ILessonQuizDraft,
  IGeneratedQuizItem,
  ILessonSummary,
  ILessonSummaryData,
} from 'share-lib';
import { apiClient } from '@/lib/api-client';
import { lessonQuizKeys } from './lesson-quiz.api';

export interface IAnalysisAiMetadata {
  model: string;
  keyIndex: number;
  maskedKey: string;
  executionTimeMs: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface IMindmapGenerationResponse {
  lessonId: string;
  mindmap: ILessonMindmapData;
  metadata: IAnalysisAiMetadata;
}

export interface IQuizGenerationResponse {
  lessonId: string;
  quizzes: IGeneratedQuizItem[];
  metadata: IAnalysisAiMetadata;
}

export interface ISummaryGenerationResponse {
  lessonId: string;
  summary: ILessonSummaryData;
  metadata: IAnalysisAiMetadata;
}

export const transcriptAnalysisKeys = {
  all: ['transcript-analysis'] as const,
  mindmap: (lessonId: string) => [...transcriptAnalysisKeys.all, 'mindmap', lessonId] as const,
  quizDraft: (lessonId: string) => [...transcriptAnalysisKeys.all, 'quiz-draft', lessonId] as const,
  summary: (lessonId: string) => [...transcriptAnalysisKeys.all, 'summary', lessonId] as const,
};

function extractErrorMessage(error: unknown, defaultMsg: string): string {
  if (typeof error === 'object' && error !== null) {
    const err = error as {
      code?: string;
      message?: string;
      response?: { data?: { message?: string | string[] } };
    };

    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return 'Quá trình AI xử lý transcript mất nhiều thời gian. Bản nháp đang được xử lý, bạn có thể tải lại trang sau giây lát.';
    }

    if (err.response?.data?.message) {
      const serverMsg = err.response.data.message;
      return Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg;
    }

    if (err.message && !err.message.includes('Network Error')) {
      return err.message;
    }
  }
  return defaultMsg;
}

export const transcriptAnalysisApi = {
  // --- MINDMAP ---
  async getMindmap(lessonId: string): Promise<ILessonMindmap | null> {
    const res = await apiClient.get<IApiResponse<ILessonMindmap | null>>(
      `/lessons/${lessonId}/analysis/mindmap`,
    );
    return res.data.data;
  },

  async generateMindmap(
    lessonId: string,
    payload: { saveAsDraft?: boolean } = { saveAsDraft: true },
  ): Promise<IMindmapGenerationResponse> {
    const res = await apiClient.post<IApiResponse<IMindmapGenerationResponse>>(
      `/lessons/${lessonId}/analysis/mindmap`,
      payload,
      { timeout: 120000 },
    );
    return res.data.data;
  },

  async applyMindmapDraft(lessonId: string): Promise<ILessonMindmap> {
    const res = await apiClient.post<IApiResponse<ILessonMindmap>>(
      `/lessons/${lessonId}/analysis/mindmap/apply`,
      {},
    );
    return res.data.data;
  },

  // --- QUIZ ---
  async getQuizDraft(lessonId: string): Promise<ILessonQuizDraft | null> {
    const res = await apiClient.get<IApiResponse<ILessonQuizDraft | null>>(
      `/lessons/${lessonId}/analysis/quiz`,
    );
    return res.data.data;
  },

  async generateQuiz(
    lessonId: string,
    payload: { count?: number; saveAsDraft?: boolean } = { count: 10, saveAsDraft: true },
  ): Promise<IQuizGenerationResponse> {
    const res = await apiClient.post<IApiResponse<IQuizGenerationResponse>>(
      `/lessons/${lessonId}/analysis/quiz`,
      payload,
      { timeout: 120000 },
    );
    return res.data.data;
  },

  async applyQuizDraft(lessonId: string): Promise<ILessonQuiz[]> {
    const res = await apiClient.post<IApiResponse<ILessonQuiz[]>>(
      `/lessons/${lessonId}/analysis/quiz/apply`,
      {},
    );
    return res.data.data;
  },

  // --- SUMMARY ---
  async getSummary(lessonId: string): Promise<ILessonSummary | null> {
    const res = await apiClient.get<IApiResponse<ILessonSummary | null>>(
      `/lessons/${lessonId}/analysis/summary`,
    );
    return res.data.data;
  },

  async generateSummary(
    lessonId: string,
    payload: { saveAsDraft?: boolean } = { saveAsDraft: true },
  ): Promise<ISummaryGenerationResponse> {
    const res = await apiClient.post<IApiResponse<ISummaryGenerationResponse>>(
      `/lessons/${lessonId}/analysis/summary`,
      payload,
      { timeout: 120000 },
    );
    return res.data.data;
  },

  async applySummaryDraft(lessonId: string): Promise<ILessonSummary> {
    const res = await apiClient.post<IApiResponse<ILessonSummary>>(
      `/lessons/${lessonId}/analysis/summary/apply`,
      {},
    );
    return res.data.data;
  },
};

// ==========================================
// REACT QUERY HOOKS
// ==========================================

export function useLessonMindmapAnalysisQuery(lessonId: string | undefined) {
  return useQuery({
    queryKey: transcriptAnalysisKeys.mindmap(lessonId || ''),
    queryFn: () => (lessonId ? transcriptAnalysisApi.getMindmap(lessonId) : null),
    enabled: Boolean(lessonId),
    staleTime: 60 * 1000,
  });
}

export function useGenerateMindmapMutation(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload?: { saveAsDraft?: boolean }) =>
      transcriptAnalysisApi.generateMindmap(lessonId, payload),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({
        queryKey: transcriptAnalysisKeys.mindmap(lessonId),
      });
      toast.success('Phân tích sơ đồ tư duy thành công!', {
        description: `Model: ${res.metadata.model} (Phản hồi sau ${(res.metadata.executionTimeMs / 1000).toFixed(1)}s)`,
      });
    },
    onError: (error: unknown) => {
      toast.error('Không thể tạo sơ đồ tư duy', {
        description: extractErrorMessage(error, 'Vui lòng kiểm tra lại transcript của video.'),
      });
    },
  });
}

export function useApplyMindmapDraftMutation(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => transcriptAnalysisApi.applyMindmapDraft(lessonId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: transcriptAnalysisKeys.mindmap(lessonId),
      });
      toast.success('Đã áp dụng sơ đồ tư duy vào bài học!', {
        description: 'Học viên có thể xem và tương tác với sơ đồ tư duy này ngay bây giờ.',
      });
    },
    onError: (error: unknown) => {
      toast.error('Lỗi khi áp dụng sơ đồ tư duy', {
        description: extractErrorMessage(error, 'Vui lòng thử lại sau.'),
      });
    },
  });
}

export function useLessonQuizDraftQuery(lessonId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: transcriptAnalysisKeys.quizDraft(lessonId || ''),
    queryFn: () => (lessonId ? transcriptAnalysisApi.getQuizDraft(lessonId) : null),
    enabled: Boolean(lessonId) && enabled,
    staleTime: 60 * 1000,
  });
}

export function useGenerateQuizMutation(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload?: { count?: number; saveAsDraft?: boolean }) =>
      transcriptAnalysisApi.generateQuiz(lessonId, payload),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({
        queryKey: transcriptAnalysisKeys.quizDraft(lessonId),
      });
      toast.success('Sinh bộ câu hỏi trắc nghiệm thành công!', {
        description: `Đã tạo ${res.quizzes.length} câu hỏi trắc nghiệm bằng Gemini AI (${(res.metadata.executionTimeMs / 1000).toFixed(1)}s)`,
      });
    },
    onError: (error: unknown) => {
      toast.error('Không thể tạo câu hỏi trắc nghiệm', {
        description: extractErrorMessage(error, 'Vui lòng kiểm tra lại transcript của video.'),
      });
    },
  });
}

export function useApplyQuizDraftMutation(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => transcriptAnalysisApi.applyQuizDraft(lessonId),
    onSuccess: (quizzes) => {
      void queryClient.invalidateQueries({
        queryKey: transcriptAnalysisKeys.quizDraft(lessonId),
      });
      void queryClient.invalidateQueries({
        queryKey: lessonQuizKeys.byLesson(lessonId),
      });
      toast.success('Đã áp dụng bộ câu hỏi vào bài học!', {
        description: `Đã cập nhật ${quizzes.length} câu hỏi trắc nghiệm chính thức cho học viên.`,
      });
    },
    onError: (error: unknown) => {
      toast.error('Lỗi khi áp dụng câu hỏi', {
        description: extractErrorMessage(error, 'Vui lòng thử lại sau.'),
      });
    },
  });
}

export function useLessonSummaryQuery(lessonId: string | undefined) {
  return useQuery({
    queryKey: transcriptAnalysisKeys.summary(lessonId || ''),
    queryFn: () => (lessonId ? transcriptAnalysisApi.getSummary(lessonId) : null),
    enabled: Boolean(lessonId),
    staleTime: 60 * 1000,
  });
}

export function useGenerateSummaryMutation(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload?: { saveAsDraft?: boolean }) =>
      transcriptAnalysisApi.generateSummary(lessonId, payload),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({
        queryKey: transcriptAnalysisKeys.summary(lessonId),
      });
      toast.success('Sinh bản tóm tắt bài học thành công!', {
        description: `Đã tóm tắt tổng quan và ${res.summary.keyPoints.length} ý chính cốt lõi (${(res.metadata.executionTimeMs / 1000).toFixed(1)}s)`,
      });
    },
    onError: (error: unknown) => {
      toast.error('Không thể tạo bản tóm tắt', {
        description: extractErrorMessage(error, 'Vui lòng kiểm tra lại transcript của video.'),
      });
    },
  });
}

export function useApplySummaryDraftMutation(lessonId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => transcriptAnalysisApi.applySummaryDraft(lessonId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: transcriptAnalysisKeys.summary(lessonId),
      });
      toast.success('Đã áp dụng bản tóm tắt vào bài học!', {
        description: 'Học viên có thể xem nội dung tóm tắt bài học này.',
      });
    },
    onError: (error: unknown) => {
      toast.error('Lỗi khi áp dụng bản tóm tắt', {
        description: extractErrorMessage(error, 'Vui lòng thử lại sau.'),
      });
    },
  });
}
