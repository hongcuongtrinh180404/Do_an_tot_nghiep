// @vitest-environment jsdom

// Configure React act environment globally
// @ts-expect-error vitest global
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import React, { act, createElement, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';

import {
  analysisJobsApi,
  analysisJobKeys,
  type AnalysisJobResponse,
} from '../api/analysis-jobs.api';
import {
  isSummaryJobAccepted,
  isQuizJobAccepted,
  isMindmapJobAccepted,
  transcriptAnalysisKeys,
  type ISummaryJobAcceptedResponse,
  type IQuizJobAcceptedResponse,
  type IMindmapJobAcceptedResponse,
  type ISummaryGenerationResponse,
} from '../api/transcript-analysis.api';
import {
  useLessonAnalysisJob,
  type UseLessonAnalysisJobResult,
} from '../hooks/use-analysis-jobs';
import { AnalysisJobStatusBanner } from '../components/player/analysis-job-status';

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: { get, post },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/components/ui/icon', () => ({
  Icon: ({ icon, className }: { icon: string; className?: string }) => (
    <span data-testid="mock-icon" data-icon={icon} className={className} />
  ),
}));

describe('Analysis Jobs - Polymorphic Contracts & API Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('isSummaryJobAccepted distinguishes HTTP 202 async response from standard document', () => {
    const acceptedPayload: ISummaryJobAcceptedResponse = {
      jobId: 'job-123',
      lessonId: 'les-123',
      type: 'summary',
      status: 'queued',
      phase: 'waiting_dispatch',
      statusUrl: '/api/v1/lessons/les-123/analysis/jobs/job-123',
    };
    expect(isSummaryJobAccepted(acceptedPayload)).toBe(true);

    const fullResponse: ISummaryGenerationResponse = {
      lessonId: 'les-123',
      summary: {
        title: 'Bài học 1',
        overview: 'Tổng quan bài học',
        keyPoints: [{ title: 'Ý 1', content: 'Nội dung', timestamp: 10 }],
      },
      metadata: {
        model: 'gemini-2.5',
        keyIndex: 0,
        maskedKey: '***',
        executionTimeMs: 1200,
      },
    };
    expect(isSummaryJobAccepted(fullResponse)).toBe(false);
  });

  it('isQuizJobAccepted distinguishes HTTP 202 async response for quiz', () => {
    const acceptedQuiz: IQuizJobAcceptedResponse = {
      jobId: 'quiz-job-1',
      lessonId: 'les-123',
      type: 'quiz',
      status: 'queued',
      phase: 'waiting_dispatch',
      statusUrl: '/api/v1/lessons/les-123/analysis/jobs/quiz-job-1',
    };
    expect(isQuizJobAccepted(acceptedQuiz)).toBe(true);
    expect(
      isQuizJobAccepted({
        quizzes: [],
        lessonId: 'les-123',
        metadata: { model: 'gemini', keyIndex: 0, maskedKey: '***', executionTimeMs: 100 },
      }),
    ).toBe(false);
  });

  it('isMindmapJobAccepted distinguishes HTTP 202 async response for mindmap', () => {
    const acceptedMindmap: IMindmapJobAcceptedResponse = {
      jobId: 'mm-job-1',
      lessonId: 'les-123',
      type: 'mindmap',
      status: 'queued',
      phase: 'waiting_dispatch',
      statusUrl: '/api/v1/lessons/les-123/analysis/jobs/mm-job-1',
    };
    expect(isMindmapJobAccepted(acceptedMindmap)).toBe(true);
    expect(
      isMindmapJobAccepted({
        mindmap: { root: { id: 'root', title: 'Root', timestamp: 0 } },
        lessonId: 'les-123',
        metadata: { model: 'gemini', keyIndex: 0, maskedKey: '***', executionTimeMs: 100 },
      }),
    ).toBe(false);
  });

  it('analysisJobsApi.getLessonJobs queries backend and unwraps data envelope', async () => {
    const mockJobs: AnalysisJobResponse[] = [
      {
        id: 'job-1',
        lessonId: 'les-1',
        courseId: 'crs-1',
        requestedById: 'user-1',
        correlationId: 'corr-1',
        active: true,
        type: 'summary',
        status: 'processing',
        phase: 'calling_ai',
        attempts: 1,
        maxAttempts: 3,
        createdAt: '2026-11-22T00:00:00Z',
        updatedAt: '2026-11-22T00:00:01Z',
      },
    ];
    get.mockResolvedValueOnce({ data: { data: mockJobs } });

    const result = await analysisJobsApi.getLessonJobs('les-1');
    expect(get).toHaveBeenCalledWith('/lessons/les-1/analysis/jobs', {
      params: { limit: 10 },
    });
    expect(result).toEqual(mockJobs);
  });

  it('analysisJobsApi.retryJob sends POST to lesson analysis jobs retry endpoint', async () => {
    const retriedJob: AnalysisJobResponse = {
      id: 'job-1',
      lessonId: 'les-1',
      courseId: 'crs-1',
      requestedById: 'user-1',
      correlationId: 'corr-1',
      active: true,
      type: 'summary',
      status: 'queued',
      phase: 'waiting_retry',
      attempts: 2,
      maxAttempts: 3,
      createdAt: '2026-11-22T00:00:00Z',
      updatedAt: '2026-11-22T00:05:00Z',
    };
    post.mockResolvedValueOnce({ data: { data: retriedJob } });

    const result = await analysisJobsApi.retryJob('les-1', 'job-1');
    expect(post).toHaveBeenCalledWith('/lessons/les-1/analysis/jobs/job-1/retry');
    expect(result).toEqual(retriedJob);
  });
});

describe('AnalysisJobStatusBanner Component', () => {
  let root: Root;
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it('renders nothing when job is null or completed', () => {
    act(() => {
      root.render(<AnalysisJobStatusBanner job={null} />);
    });
    expect(host.innerHTML).toBe('');

    const completedJob: AnalysisJobResponse = {
      id: 'job-c',
      lessonId: 'les-1',
      courseId: 'crs-1',
      requestedById: 'user-1',
      correlationId: 'corr-1',
      active: false,
      type: 'summary',
      status: 'completed',
      phase: 'completed',
      attempts: 1,
      maxAttempts: 3,
      createdAt: '2026-11-22T00:00:00Z',
      updatedAt: '2026-11-22T00:01:00Z',
    };
    act(() => {
      root.render(<AnalysisJobStatusBanner job={completedJob} />);
    });
    expect(host.innerHTML).toBe('');
  });

  it('renders queued state banner correctly', () => {
    const queuedJob: AnalysisJobResponse = {
      id: 'job-q',
      lessonId: 'les-1',
      courseId: 'crs-1',
      requestedById: 'user-1',
      correlationId: 'corr-1',
      active: true,
      type: 'summary',
      status: 'queued',
      phase: 'waiting_dispatch',
      attempts: 1,
      maxAttempts: 3,
      createdAt: '2026-11-22T00:00:00Z',
      updatedAt: '2026-11-22T00:00:00Z',
    };

    act(() => {
      root.render(<AnalysisJobStatusBanner job={queuedJob} />);
    });

    expect(host.textContent).toContain('Đang xếp hàng chờ xử lý...');
    expect(host.textContent).toContain('Bạn có thể tự do chuyển sang bài học khác');
  });

  it('renders processing state with calling_ai phase and retry attempts badge', () => {
    const processingJob: AnalysisJobResponse = {
      id: 'job-p',
      lessonId: 'les-1',
      courseId: 'crs-1',
      requestedById: 'user-1',
      correlationId: 'corr-1',
      active: true,
      type: 'summary',
      status: 'processing',
      phase: 'calling_ai',
      attempts: 2,
      maxAttempts: 3,
      createdAt: '2026-11-22T00:00:00Z',
      updatedAt: '2026-11-22T00:01:00Z',
    };

    act(() => {
      root.render(<AnalysisJobStatusBanner job={processingJob} />);
    });

    expect(host.textContent).toContain('AI đang phân tích transcript và tạo tóm tắt...');
    expect(host.textContent).toContain('Lần thử 2/3');
  });

  it('renders failed state banner with error message and triggers onRetry', () => {
    const failedJob: AnalysisJobResponse = {
      id: 'job-f',
      lessonId: 'les-1',
      courseId: 'crs-1',
      requestedById: 'user-1',
      correlationId: 'corr-1',
      active: false,
      type: 'summary',
      status: 'failed',
      phase: 'failed',
      errorMessage: 'Gemini Quota Exceeded 429',
      attempts: 3,
      maxAttempts: 3,
      createdAt: '2026-11-22T00:00:00Z',
      updatedAt: '2026-11-22T00:02:00Z',
    };

    const handleRetry = vi.fn();

    act(() => {
      root.render(<AnalysisJobStatusBanner job={failedJob} onRetry={handleRetry} />);
    });

    expect(host.textContent).toContain('Không thể tạo bản tóm tắt bài học');
    expect(host.textContent).toContain('Gemini Quota Exceeded 429');

    const retryBtn = host.querySelector('button');
    expect(retryBtn).not.toBeNull();
    act(() => {
      retryBtn?.click();
    });

    expect(handleRetry).toHaveBeenCalledWith('job-f');
  });
});

describe('useLessonAnalysisJob Hook', () => {
  let root: Root;
  let host: HTMLDivElement;
  let queryClient: QueryClient;
  let hookResult: UseLessonAnalysisJobResult | null = null;

  function TestHarness({
    lessonId,
    type,
  }: {
    lessonId: string;
    type: 'summary' | 'quiz' | 'mindmap';
  }) {
    const res = useLessonAnalysisJob(lessonId, type);
    useEffect(() => {
      hookResult = res;
    });
    return null;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    hookResult = null;
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  it('prioritizes active job (processing/queued) over completed job', async () => {
    const jobs: AnalysisJobResponse[] = [
      {
        id: 'job-completed-old',
        lessonId: 'les-1',
        courseId: 'crs-1',
        requestedById: 'user-1',
        correlationId: 'corr-1',
        active: false,
        type: 'summary',
        status: 'completed',
        phase: 'completed',
        attempts: 1,
        maxAttempts: 3,
        createdAt: '2026-11-22T00:00:00Z',
        updatedAt: '2026-11-22T00:01:00Z',
      },
      {
        id: 'job-active-processing',
        lessonId: 'les-1',
        courseId: 'crs-1',
        requestedById: 'user-1',
        correlationId: 'corr-2',
        active: true,
        type: 'summary',
        status: 'processing',
        phase: 'calling_ai',
        attempts: 1,
        maxAttempts: 3,
        createdAt: '2026-11-22T00:02:00Z',
        updatedAt: '2026-11-22T00:02:10Z',
      },
    ];

    get.mockResolvedValueOnce({ data: { data: jobs } });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <TestHarness lessonId="les-1" type="summary" />
        </QueryClientProvider>,
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    expect(hookResult?.job?.id).toBe('job-active-processing');
    expect(hookResult?.isProcessing).toBe(true);
    expect(hookResult?.isCompleted).toBe(false);
    expect(hookResult?.isFailed).toBe(false);
  });

  it('identifies failed job when no active job is running', async () => {
    const jobs: AnalysisJobResponse[] = [
      {
        id: 'job-failed',
        lessonId: 'les-1',
        courseId: 'crs-1',
        requestedById: 'user-1',
        correlationId: 'corr-1',
        active: false,
        type: 'summary',
        status: 'failed',
        phase: 'failed',
        errorMessage: 'Worker timeout',
        attempts: 3,
        maxAttempts: 3,
        createdAt: '2026-11-22T00:00:00Z',
        updatedAt: '2026-11-22T00:01:00Z',
      },
    ];

    get.mockResolvedValueOnce({ data: { data: jobs } });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <TestHarness lessonId="les-1" type="summary" />
        </QueryClientProvider>,
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    expect(hookResult?.job?.id).toBe('job-failed');
    expect(hookResult?.isProcessing).toBe(false);
    expect(hookResult?.isFailed).toBe(true);
    expect(hookResult?.isCompleted).toBe(false);
  });

  it('triggers query invalidation and success toast when job completes', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    let currentJob: AnalysisJobResponse = {
      id: 'job-switch',
      lessonId: 'les-1',
      courseId: 'crs-1',
      requestedById: 'user-1',
      correlationId: 'corr-1',
      active: true,
      type: 'summary',
      status: 'processing',
      phase: 'calling_ai',
      attempts: 1,
      maxAttempts: 3,
      createdAt: '2026-11-22T00:00:00Z',
      updatedAt: '2026-11-22T00:01:00Z',
    };

    get.mockImplementation(async () => ({ data: { data: [currentJob] } }));

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <TestHarness lessonId="les-1" type="summary" />
        </QueryClientProvider>,
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    expect(hookResult?.isProcessing).toBe(true);
    expect(invalidateSpy).not.toHaveBeenCalled();

    // Chuyển trạng thái sang completed và refetch
    currentJob = {
      ...currentJob,
      status: 'completed',
      phase: 'completed',
      active: false,
    };

    await act(async () => {
      await queryClient.refetchQueries({ queryKey: analysisJobKeys.lesson('les-1') });
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    expect(hookResult?.isCompleted).toBe(true);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: transcriptAnalysisKeys.summary('les-1'),
    });
    expect(toast.success).toHaveBeenCalledWith(
      'Bản tóm tắt bài học đã được tạo thành công!',
    );
  });

  it('triggers toast and invalidates quiz queries when quiz job completes', async () => {
    let currentJob: AnalysisJobResponse = {
      id: 'job-quiz-switch',
      lessonId: 'les-1',
      courseId: 'crs-1',
      requestedById: 'user-1',
      correlationId: 'corr-q',
      active: true,
      type: 'quiz',
      status: 'processing',
      phase: 'calling_ai',
      attempts: 1,
      maxAttempts: 3,
      createdAt: '2026-11-22T00:00:00Z',
      updatedAt: '2026-11-22T00:01:00Z',
    };

    get.mockImplementation(async () => ({ data: { data: [currentJob] } }));

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <TestHarness lessonId="les-1" type="quiz" />
        </QueryClientProvider>,
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    currentJob = {
      ...currentJob,
      status: 'completed',
      phase: 'completed',
      active: false,
    };

    await act(async () => {
      await queryClient.refetchQueries({ queryKey: analysisJobKeys.lesson('les-1') });
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    expect(hookResult?.isCompleted).toBe(true);
    expect(toast.success).toHaveBeenCalledWith(
      'Bộ câu hỏi trắc nghiệm đã được tạo thành công!',
    );
  });

  it('triggers toast and invalidates mindmap queries when mindmap job completes', async () => {
    let currentJob: AnalysisJobResponse = {
      id: 'job-mm-switch',
      lessonId: 'les-1',
      courseId: 'crs-1',
      requestedById: 'user-1',
      correlationId: 'corr-mm',
      active: true,
      type: 'mindmap',
      status: 'processing',
      phase: 'calling_ai',
      attempts: 1,
      maxAttempts: 3,
      createdAt: '2026-11-22T00:00:00Z',
      updatedAt: '2026-11-22T00:01:00Z',
    };

    get.mockImplementation(async () => ({ data: { data: [currentJob] } }));

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <TestHarness lessonId="les-1" type="mindmap" />
        </QueryClientProvider>,
      );
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    currentJob = {
      ...currentJob,
      status: 'completed',
      phase: 'completed',
      active: false,
    };

    await act(async () => {
      await queryClient.refetchQueries({ queryKey: analysisJobKeys.lesson('les-1') });
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    expect(hookResult?.isCompleted).toBe(true);
    expect(toast.success).toHaveBeenCalledWith(
      'Sơ đồ tư duy (Mindmap) đã được tạo thành công!',
    );
  });
});
