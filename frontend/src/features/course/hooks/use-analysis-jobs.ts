'use client';

import React, { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  analysisJobsApi,
  analysisJobKeys,
  type AnalysisJobResponse,
} from '../api/analysis-jobs.api';
import { transcriptAnalysisKeys } from '../api/transcript-analysis.api';
import { lessonQuizKeys } from '../api/lesson-quiz.api';

export interface UseLessonAnalysisJobResult {
  job: AnalysisJobResponse | null;
  isLoading: boolean;
  isProcessing: boolean;
  isFailed: boolean;
  isCompleted: boolean;
  retryJob: (jobId: string) => void;
  isRetrying: boolean;
  refetch: () => void;
}

export function useLessonAnalysisJob(
  lessonId: string | undefined,
  type: 'summary' | 'quiz' | 'mindmap',
): UseLessonAnalysisJobResult {
  const queryClient = useQueryClient();
  const validLessonId = lessonId || '';

  const queryKey = analysisJobKeys.lesson(validLessonId);

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!validLessonId) return null;
      const jobs = await analysisJobsApi.getLessonJobs(validLessonId);
      if (!jobs || jobs.length === 0) return null;

      // 1. Tìm job đang active (queued hoặc processing) thuộc đúng type
      const activeJob = jobs.find(
        (j) => j.type === type && (j.status === 'queued' || j.status === 'processing'),
      );
      if (activeJob) return activeJob;

      // 2. Nếu không có active job, lấy job gần nhất cùng type
      const typeJobs = jobs.filter((j) => j.type === type);
      return typeJobs[0] || null;
    },
    enabled: Boolean(validLessonId),
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const job = query.state.data;
      if (!job) return false;
      if (job.status === 'processing') return 2500; // Poll 2.5s khi AI đang chạy
      if (job.status === 'queued') return 5000; // Poll 5s khi đang trong outbox/hàng đợi
      return false; // Ngắt polling khi completed hoặc failed
    },
  });

  const activeJob = query.data || null;

  // Tự động invalidate dữ liệu khi Job hoàn tất
  const prevJobRef = useRef<AnalysisJobResponse | null>(null);
  useEffect(() => {
    if (activeJob?.status === 'completed' && prevJobRef.current?.status !== 'completed') {
      if (type === 'summary') {
        void queryClient.invalidateQueries({
          queryKey: transcriptAnalysisKeys.summary(validLessonId),
        });
        void queryClient.invalidateQueries({
          predicate: (q) => q.queryKey.includes('approval-checklist'),
        });
        toast.success('Bản tóm tắt bài học đã được tạo thành công!');
      } else if (type === 'quiz') {
        void queryClient.invalidateQueries({
          queryKey: lessonQuizKeys.byLesson(validLessonId),
        });
        void queryClient.invalidateQueries({
          queryKey: transcriptAnalysisKeys.quizDraft(validLessonId),
        });
        void queryClient.invalidateQueries({
          predicate: (q) => q.queryKey.includes('approval-checklist'),
        });
        toast.success('Bộ câu hỏi trắc nghiệm đã được tạo thành công!');
      } else if (type === 'mindmap') {
        void queryClient.invalidateQueries({
          queryKey: transcriptAnalysisKeys.mindmap(validLessonId),
        });
        void queryClient.invalidateQueries({
          predicate: (q) => q.queryKey.includes('approval-checklist'),
        });
        toast.success('Sơ đồ tư duy (Mindmap) đã được tạo thành công!');
      }
    }
    prevJobRef.current = activeJob;
  }, [activeJob?.status, activeJob?.id, type, validLessonId, queryClient]);

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => analysisJobsApi.retryJob(validLessonId, jobId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
      toast.info('Đang thử lại tác vụ...');
    },
    onError: (err: unknown) => {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string } | undefined;
      const msg = errorObj?.response?.data?.message || errorObj?.message || 'Không thể thử lại tác vụ';
      toast.error('Lỗi khi thử lại', { description: msg });
    },
  });

  const isProcessing = activeJob?.status === 'queued' || activeJob?.status === 'processing';
  const isFailed = activeJob?.status === 'failed';
  const isCompleted = activeJob?.status === 'completed';

  return {
    job: activeJob,
    isLoading: query.isLoading,
    isProcessing,
    isFailed,
    isCompleted,
    retryJob: retryMutation.mutate,
    isRetrying: retryMutation.isPending,
    refetch: query.refetch,
  };
}
