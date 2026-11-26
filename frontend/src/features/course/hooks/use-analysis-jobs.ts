'use client';

import React, { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { JobTypeEnum } from 'share-lib';
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
  enabled = true,
): UseLessonAnalysisJobResult {
  const queryClient = useQueryClient();
  const validLessonId = lessonId || '';

  const queryKey = analysisJobKeys.lesson(validLessonId);

  const query = useQuery({
    queryKey,
    queryFn: () => analysisJobsApi.getLessonJobs(validLessonId),
    select: (jobs) => {
      const relevant = jobs.filter((job) => job.type === type || job.type === JobTypeEnum.ANALYSIS_BUNDLE);
      const active = relevant.filter((job) => job.status === 'queued' || job.status === 'processing');
      return active.find((job) => job.type === type) ?? active[0] ?? relevant[0] ?? null;
    },
    enabled: Boolean(validLessonId) && enabled,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const analysisJobs = query.state.data?.filter((job) => job.type !== JobTypeEnum.TRANSCRIPTION);
      if (analysisJobs?.some((job) => job.status === 'processing')) return 2500;
      if (analysisJobs?.some((job) => job.status === 'queued')) return 5000;
      return false;
    },
  });

  const activeJob = enabled ? query.data ?? null : null;

  // Tự động invalidate dữ liệu khi Job hoàn tất
  const prevJobRef = useRef<AnalysisJobResponse | null>(null);
  useEffect(() => {
    if (activeJob?.status === 'completed' &&
      (prevJobRef.current?.status !== 'completed' || prevJobRef.current.id !== activeJob.id)) {
      const isBundle = activeJob.type === JobTypeEnum.ANALYSIS_BUNDLE;
      if (type === 'summary') {
        void queryClient.invalidateQueries({
          queryKey: transcriptAnalysisKeys.summary(validLessonId),
        });
        void queryClient.invalidateQueries({
          predicate: (q) => q.queryKey.includes('approval-checklist'),
        });
        if (!isBundle) toast.success('Bản tóm tắt bài học đã được tạo thành công!');
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
        if (!isBundle && (activeJob.resultRef?.count ?? 0) > 0) {
          toast.success('Bộ câu hỏi trắc nghiệm đã được tạo thành công!');
        }
      } else if (type === 'mindmap') {
        void queryClient.invalidateQueries({
          queryKey: transcriptAnalysisKeys.mindmap(validLessonId),
        });
        void queryClient.invalidateQueries({
          predicate: (q) => q.queryKey.includes('approval-checklist'),
        });
        if (!isBundle) toast.success('Sơ đồ tư duy (Mindmap) đã được tạo thành công!');
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
