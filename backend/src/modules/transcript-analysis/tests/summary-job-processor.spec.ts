import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection } from 'mongoose';
import { JobTypeEnum, JobStatusEnum, JobPhaseEnum, IJob } from 'share-lib';
import { AnalysisJobProcessor } from '../processors/analysis-job.processor.js';
import { RabbitMqService, RabbitMqMessage } from '../../messaging/rabbitmq.service.js';
import { JobService } from '../../jobs/services/job.service.js';
import { JobRepository } from '../../jobs/repositories/job.repository.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonSummaryRepository } from '../../course/repositories/lesson-summary.repository.js';
import { SummaryGenerationService } from '../services/summary-generation.service.js';
import { JobManagementPolicy } from '../policies/job-management.policy.js';
import { JobMessagePayload } from '../../jobs/services/job-dispatcher.service.js';

describe('AnalysisJobProcessor', () => {
  let processor: AnalysisJobProcessor;
  let mockRabbitMqService: {
    createConsumer: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };
  let mockJobService: {
    claimJob: ReturnType<typeof vi.fn>;
    renewLease: ReturnType<typeof vi.fn>;
    completeJob: ReturnType<typeof vi.fn>;
    failJob: ReturnType<typeof vi.fn>;
  };
  let mockJobRepo: {
    findById: ReturnType<typeof vi.fn>;
  };
  let mockLessonRepo: {
    findById: ReturnType<typeof vi.fn>;
    incrementOutputRevision: ReturnType<typeof vi.fn>;
  };
  let mockLessonSummaryRepo: {
    upsertOfficialByLessonId: ReturnType<typeof vi.fn>;
    saveDraftByLessonId: ReturnType<typeof vi.fn>;
  };
  let mockSummaryGenService: {
    generateSummaryContent: ReturnType<typeof vi.fn>;
  };
  let mockJobPolicy: {
    verifyLessonAccess: ReturnType<typeof vi.fn>;
  };
  let mockConnection: {
    startSession: ReturnType<typeof vi.fn>;
  };
  let mockSession: {
    withTransaction: ReturnType<typeof vi.fn>;
    endSession: ReturnType<typeof vi.fn>;
  };

  const sampleJob: IJob = {
    id: 'job-1',
    type: JobTypeEnum.SUMMARY,
    lessonId: 'lesson-1',
    courseId: 'course-1',
    requestedById: 'user-1',
    correlationId: 'corr-1',
    parameters: { saveAsDraft: false },
    active: true,
    status: JobStatusEnum.QUEUED,
    phase: JobPhaseEnum.WAITING_DISPATCH,
    attempts: 0,
    maxAttempts: 3,
    dispatchState: 'published',
    dispatchSequence: 1,
    inputRevision: 0,
    targetRevision: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleMsgPayload: JobMessagePayload = {
    version: 1,
    jobId: 'job-1',
    dispatchSequence: 1,
    type: JobTypeEnum.SUMMARY,
    correlationId: 'corr-1',
  };

  let mockMsg: RabbitMqMessage<JobMessagePayload>;

  beforeEach(() => {
    vi.useFakeTimers();

    mockRabbitMqService = {
      createConsumer: vi.fn(),
    };
    mockConfigService = {
      get: vi.fn((key: string, defaultVal: any) => defaultVal),
    };
    mockJobService = {
      claimJob: vi.fn().mockResolvedValue({
        job: { ...sampleJob, status: JobStatusEnum.PROCESSING },
        leaseToken: 'lease-token-123',
      }),
      renewLease: vi.fn().mockResolvedValue(true),
      completeJob: vi.fn().mockResolvedValue({
        ...sampleJob,
        status: JobStatusEnum.COMPLETED,
      }),
      failJob: vi.fn().mockResolvedValue({
        ...sampleJob,
        status: JobStatusEnum.FAILED,
      }),
    };
    mockJobRepo = {
      findById: vi.fn().mockResolvedValue(sampleJob),
    };
    mockLessonRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 'lesson-1',
        analysisInputRevision: 0,
        analysisOutputRevisions: { summary: 0, quiz: 0, mindmap: 0 },
      }),
      incrementOutputRevision: vi.fn().mockResolvedValue(true),
    };
    mockLessonSummaryRepo = {
      upsertOfficialByLessonId: vi.fn().mockResolvedValue({
        id: 'summary-1',
        lessonId: 'lesson-1',
      }),
      saveDraftByLessonId: vi.fn().mockResolvedValue({
        id: 'summary-draft-1',
        lessonId: 'lesson-1',
      }),
    };
    mockSummaryGenService = {
      generateSummaryContent: vi.fn().mockResolvedValue({
        lessonId: 'lesson-1',
        lessonTitle: 'Bài học 1',
        summary: {
          title: 'Tóm tắt bài 1',
          overview: 'Tổng quan bài 1',
          keyPoints: [{ title: 'Ý 1', content: 'Chi tiết 1', timestamp: 10 }],
        },
        metadata: { model: 'gemini-flash' },
      }),
    };
    mockJobPolicy = {
      verifyLessonAccess: vi.fn().mockResolvedValue({
        lesson: { id: 'lesson-1' },
        course: { id: 'course-1' },
      }),
    };

    mockSession = {
      withTransaction: vi.fn().mockImplementation(async (callback) => {
        return callback(mockSession);
      }),
      endSession: vi.fn().mockResolvedValue(undefined),
    };

    mockConnection = {
      startSession: vi.fn().mockResolvedValue(mockSession),
    };

    mockMsg = {
      content: sampleMsgPayload,
      rawMessage: {} as any,
      ack: vi.fn(),
      nack: vi.fn(),
    };

    processor = new AnalysisJobProcessor(
      mockRabbitMqService as unknown as RabbitMqService,
      mockConfigService as unknown as ConfigService,
      mockJobService as unknown as JobService,
      mockJobRepo as unknown as JobRepository,
      mockLessonRepo as unknown as LessonRepository,
      mockLessonSummaryRepo as unknown as LessonSummaryRepository,
      mockSummaryGenService as unknown as SummaryGenerationService,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      mockJobPolicy as unknown as JobManagementPolicy,
      mockConnection as unknown as Connection,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Happy Path', () => {
    it('should claim job, generate AI summary outside transaction, commit in session and ACK', async () => {
      await processor.processSummaryJob(mockMsg);

      // 1. Claim job
      expect(mockJobService.claimJob).toHaveBeenCalledWith(
        'job-1',
        1,
        expect.stringContaining('worker-'),
        90000,
      );

      // 2. Pre-checks
      expect(mockJobPolicy.verifyLessonAccess).toHaveBeenCalled();
      expect(mockLessonRepo.findById).toHaveBeenCalledWith('lesson-1');

      // 3. AI call outside transaction
      expect(mockSummaryGenService.generateSummaryContent).toHaveBeenCalledWith(
        'lesson-1',
        expect.objectContaining({ expectedInputRevision: 0 }),
      );

      // 4. Short transaction commit
      expect(mockConnection.startSession).toHaveBeenCalled();
      expect(mockLessonRepo.incrementOutputRevision).toHaveBeenCalledWith(
        'lesson-1',
        'summary',
        0,
        mockSession,
      );
      expect(mockLessonSummaryRepo.upsertOfficialByLessonId).toHaveBeenCalled();
      expect(mockJobService.completeJob).toHaveBeenCalledWith(
        'job-1',
        'lease-token-123',
        expect.objectContaining({ summaryId: 'summary-1' }),
        mockSession,
      );
      expect(mockSession.endSession).toHaveBeenCalled();

      // 5. RabbitMQ ACK
      expect(mockMsg.ack).toHaveBeenCalled();
    });
  });

  describe('Crash After Commit Before ACK (Scenario 2)', () => {
    it('should immediately ACK without calling AI if job status is already COMPLETED', async () => {
      mockJobRepo.findById.mockResolvedValueOnce({
        ...sampleJob,
        status: JobStatusEnum.COMPLETED,
      });

      await processor.processSummaryJob(mockMsg);

      expect(mockMsg.ack).toHaveBeenCalled();
      expect(mockJobService.claimJob).not.toHaveBeenCalled();
      expect(mockSummaryGenService.generateSummaryContent).not.toHaveBeenCalled();
    });
  });

  describe('Revision Guard: Target Changed (Scenario 3)', () => {
    it('should fail job with TARGET_CHANGED and non-retryable when revision was bumped during AI run', async () => {
      // Giả lập revision bump trả về false (người dùng đã sửa tóm tắt trong lúc AI đang chạy)
      mockLessonRepo.incrementOutputRevision.mockResolvedValueOnce(false);

      await processor.processSummaryJob(mockMsg);

      expect(mockJobService.failJob).toHaveBeenCalledWith(
        'job-1',
        'lease-token-123',
        expect.objectContaining({
          errorCode: 'TARGET_CHANGED',
          retryable: false,
        }),
      );
      expect(mockMsg.ack).toHaveBeenCalled();
    });
  });

  describe('Course PENDING_APPROVAL (Scenario 4)', () => {
    it('should fail job with REJECTED_STATUS and non-retryable if course is pending approval', async () => {
      mockJobPolicy.verifyLessonAccess.mockRejectedValueOnce(
        new ConflictException('Khóa học đang chờ phê duyệt'),
      );

      await processor.processSummaryJob(mockMsg);

      expect(mockJobService.failJob).toHaveBeenCalledWith(
        'job-1',
        'lease-token-123',
        expect.objectContaining({
          errorCode: 'REJECTED_STATUS',
          retryable: false,
        }),
      );
      expect(mockSummaryGenService.generateSummaryContent).not.toHaveBeenCalled();
      expect(mockMsg.ack).toHaveBeenCalled();
    });
  });

  describe('AI Quota/Rate Limit 429 (Scenario 5)', () => {
    it('should fail job with retryable=true when transient error occurs', async () => {
      const rateLimitError = new Error('429 Too Many Requests: Resource has been exhausted');
      (rateLimitError as any).status = 429;
      mockSummaryGenService.generateSummaryContent.mockRejectedValueOnce(rateLimitError);

      await processor.processSummaryJob(mockMsg);

      expect(mockJobService.failJob).toHaveBeenCalledWith(
        'job-1',
        'lease-token-123',
        expect.objectContaining({
          errorCode: expect.any(String),
          retryable: true,
        }),
      );
      expect(mockMsg.ack).toHaveBeenCalled();
    });
  });

  describe('Input Revision Mismatch', () => {
    it('should fail job with INPUT_CHANGED if transcript was updated while job was queued', async () => {
      mockLessonRepo.findById.mockResolvedValueOnce({
        id: 'lesson-1',
        analysisInputRevision: 2, // khác với job.inputRevision = 0
      });

      await processor.processSummaryJob(mockMsg);

      expect(mockJobService.failJob).toHaveBeenCalledWith(
        'job-1',
        'lease-token-123',
        expect.objectContaining({
          errorCode: 'INPUT_CHANGED',
          retryable: false,
        }),
      );
      expect(mockSummaryGenService.generateSummaryContent).not.toHaveBeenCalled();
      expect(mockMsg.ack).toHaveBeenCalled();
    });
  });
});
