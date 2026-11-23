import type { IApiResponse, JobStatusEnum, JobTypeEnum, JobPhaseEnum } from 'share-lib';
import { apiClient } from '@/lib/api-client';

export type AnalysisJobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type AnalysisJobPhase =
  | 'waiting_dispatch'
  | 'waiting_worker'
  | 'waiting_retry'
  | 'calling_ai'
  | 'saving_result'
  | 'completed'
  | 'failed';

export interface AnalysisJobResponse {
  id: string;
  type: 'summary' | 'quiz' | 'mindmap' | 'transcription' | JobTypeEnum;
  lessonId: string;
  courseId: string;
  requestedById: string;
  correlationId: string;
  active: boolean;
  status: AnalysisJobStatus | JobStatusEnum;
  phase: AnalysisJobPhase | JobPhaseEnum;
  attempts: number;
  maxAttempts: number;
  nextRunAt?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  failedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const analysisJobKeys = {
  all: ['analysis-jobs'] as const,
  lesson: (lessonId: string) => [...analysisJobKeys.all, 'lesson', lessonId] as const,
  lessonType: (lessonId: string, type: string) =>
    [...analysisJobKeys.all, 'lesson', lessonId, type] as const,
  detail: (lessonId: string, jobId: string) =>
    [...analysisJobKeys.all, 'detail', lessonId, jobId] as const,
};

export const analysisJobsApi = {
  async getLessonJobs(lessonId: string, limit = 10): Promise<AnalysisJobResponse[]> {
    const res = await apiClient.get<IApiResponse<AnalysisJobResponse[]>>(
      `/lessons/${lessonId}/analysis/jobs`,
      { params: { limit } },
    );
    return res.data.data;
  },

  async getJobById(lessonId: string, jobId: string): Promise<AnalysisJobResponse> {
    const res = await apiClient.get<IApiResponse<AnalysisJobResponse>>(
      `/lessons/${lessonId}/analysis/jobs/${jobId}`,
    );
    return res.data.data;
  },

  async retryJob(lessonId: string, jobId: string): Promise<AnalysisJobResponse> {
    const res = await apiClient.post<IApiResponse<AnalysisJobResponse>>(
      `/lessons/${lessonId}/analysis/jobs/${jobId}/retry`,
    );
    return res.data.data;
  },
};
