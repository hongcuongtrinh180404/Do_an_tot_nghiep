import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection } from 'mongoose';
import { JobTypeEnum, JobStatusEnum, JobPhaseEnum, IJob, ILessonMindmapData } from 'share-lib';
import { AnalysisJobProcessor } from '../processors/analysis-job.processor.js';
import { RabbitMqService, RabbitMqMessage } from '../../messaging/rabbitmq.service.js';
import { JobService } from '../../jobs/services/job.service.js';
import { JobRepository } from '../../jobs/repositories/job.repository.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonMindmapRepository } from '../../course/repositories/lesson-mindmap.repository.js';
import { MindmapAnalysisService } from '../services/mindmap-analysis.service.js';
import { JobManagementPolicy } from '../policies/job-management.policy.js';
import { JobMessagePayload } from '../../jobs/services/job-dispatcher.service.js';

describe('AnalysisJobProcessor - Mindmap Job', () => {
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
  let mockLessonMindmapRepo: {
    upsertOfficialByLessonId: ReturnType<typeof vi.fn>;
    saveDraftByLessonId: ReturnType<typeof vi.fn>;
  };
  let mockMindmapGenService: {
    generateMindmapContent: ReturnType<typeof vi.fn>;
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

  const sampleMindmapData: ILessonMindmapData = {
    root: {
      id: 'root-1',
      title: 'Chủ đề chính',
      timestamp: 0,
      children: [
        {
          id: 'child-1',
          title: 'Nhánh con 1',
          timestamp: 30,
        },
      ],
    },
  };

  const sampleMindmapJob: IJob = {
    id: 'mindmap-job-1',
    type: JobTypeEnum.MINDMAP,
    lessonId: 'lesson-1',
    courseId: 'course-1',
    requestedById: 'user-1',
    correlationId: 'corr-mindmap-1',
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
    jobId: 'mindmap-job-1',
    dispatchSequence: 1,
    type: JobTypeEnum.MINDMAP,
    correlationId: 'corr-mindmap-1',
  };

  let mockMsg: RabbitMqMessage<JobMessagePayload>;

  beforeEach(() => {
    vi.useFakeTimers();

    mockRabbitMqService = {
      createConsumer: vi.fn(),
    };
    mockConfigService = {
      get: vi.fn((key: string, defaultVal: unknown) => defaultVal),
    };
    mockJobService = {
      claimJob: vi.fn().mockResolvedValue({
        job: { ...sampleMindmapJob, status: JobStatusEnum.PROCESSING },
        leaseToken: 'lease-token-mindmap-123',
      }),
      renewLease: vi.fn().mockResolvedValue(true),
      completeJob: vi.fn().mockResolvedValue({
        ...sampleMindmapJob,
        status: JobStatusEnum.COMPLETED,
      }),
      failJob: vi.fn().mockResolvedValue({
        ...sampleMindmapJob,
        status: JobStatusEnum.FAILED,
      }),
    };
    mockJobRepo = {
      findById: vi.fn().mockResolvedValue(sampleMindmapJob),
    };
    mockLessonRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 'lesson-1',
        analysisInputRevision: 0,
        analysisOutputRevisions: { summary: 0, quiz: 0, mindmap: 0 },
      }),
      incrementOutputRevision: vi.fn().mockResolvedValue(true),
    };
    mockLessonMindmapRepo = {
      upsertOfficialByLessonId: vi.fn().mockResolvedValue({ id: 'mindmap-doc-1' }),
      saveDraftByLessonId: vi.fn().mockResolvedValue({ id: 'mindmap-draft-1' }),
    };
    mockMindmapGenService = {
      generateMindmapContent: vi.fn().mockResolvedValue({
        mindmap: sampleMindmapData,
        model: 'gemini-2.5-flash',
      }),
    };
    mockJobPolicy = {
      verifyLessonAccess: vi.fn().mockResolvedValue({
        lesson: { id: 'lesson-1' },
        course: { id: 'course-1' },
      }),
    };

    mockSession = {
      withTransaction: vi.fn().mockImplementation(async (callback: (s: unknown) => Promise<unknown>) => {
        return callback(mockSession);
      }),
      endSession: vi.fn().mockResolvedValue(undefined),
    };

    mockConnection = {
      startSession: vi.fn().mockResolvedValue(mockSession),
    };

    mockMsg = {
      content: sampleMsgPayload,
      rawMessage: {} as never,
      ack: vi.fn(),
      nack: vi.fn(),
    };

    processor = new AnalysisJobProcessor(
      mockRabbitMqService as unknown as RabbitMqService,
      mockConfigService as unknown as ConfigService,
      mockJobService as unknown as JobService,
      mockJobRepo as unknown as JobRepository,
      mockLessonRepo as unknown as LessonRepository,
      {} as never, // lessonSummaryRepo
      {} as never, // summaryGenerationService
      {} as never, // quizGenerationService
      mockMindmapGenService as unknown as MindmapAnalysisService,
      {} as never, // lessonQuizRepo
      {} as never, // lessonQuizDraftRepo
      mockLessonMindmapRepo as unknown as LessonMindmapRepository,
      mockJobPolicy as unknown as JobManagementPolicy,
      mockConnection as unknown as Connection,
      {} as never,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Happy Path: Upsert Official Mindmap', () => {
    it('should claim job, generate mindmap outside transaction, commit in session, bump revision and ACK', async () => {
      await processor.processMindmapJob(mockMsg);

      expect(mockJobService.claimJob).toHaveBeenCalledWith(
        'mindmap-job-1',
        1,
        expect.stringContaining('worker-'),
        90000,
      );

      expect(mockMindmapGenService.generateMindmapContent).toHaveBeenCalledWith(
        'lesson-1',
        expect.objectContaining({ expectedInputRevision: 0 }),
      );

      expect(mockConnection.startSession).toHaveBeenCalled();
      expect(mockLessonRepo.incrementOutputRevision).toHaveBeenCalledWith(
        'lesson-1',
        'mindmap',
        0,
        mockSession,
      );

      expect(mockLessonMindmapRepo.upsertOfficialByLessonId).toHaveBeenCalledWith(
        'lesson-1',
        sampleMindmapData,
        'user-1',
        mockSession,
      );

      expect(mockJobService.completeJob).toHaveBeenCalledWith(
        'mindmap-job-1',
        'lease-token-mindmap-123',
        expect.objectContaining({ mindmapId: 'mindmap-doc-1' }),
        mockSession,
      );

      expect(mockMsg.ack).toHaveBeenCalled();
    });
  });

  describe('Save as Draft', () => {
    it('should save draft mindmap without bumping revision', async () => {
      mockJobService.claimJob.mockResolvedValueOnce({
        job: { ...sampleMindmapJob, status: JobStatusEnum.PROCESSING, parameters: { saveAsDraft: true } },
        leaseToken: 'lease-token-mindmap-123',
      });

      await processor.processMindmapJob(mockMsg);

      expect(mockLessonMindmapRepo.saveDraftByLessonId).toHaveBeenCalledWith(
        'lesson-1',
        sampleMindmapData,
        'user-1',
        mockSession,
      );
      expect(mockLessonMindmapRepo.upsertOfficialByLessonId).not.toHaveBeenCalled();
      expect(mockJobService.completeJob).toHaveBeenCalled();
      expect(mockMsg.ack).toHaveBeenCalled();
    });
  });

  describe('Crash After Commit Before ACK', () => {
    it('should immediately ACK without calling AI if job status is already COMPLETED', async () => {
      mockJobRepo.findById.mockResolvedValueOnce({
        ...sampleMindmapJob,
        status: JobStatusEnum.COMPLETED,
      });

      await processor.processMindmapJob(mockMsg);

      expect(mockMsg.ack).toHaveBeenCalled();
      expect(mockJobService.claimJob).not.toHaveBeenCalled();
      expect(mockMindmapGenService.generateMindmapContent).not.toHaveBeenCalled();
    });
  });

  describe('Revision Guard: Target Changed', () => {
    it('should fail job with TARGET_CHANGED and non-retryable if instructor autosaved mindmap during AI run', async () => {
      mockLessonRepo.incrementOutputRevision.mockResolvedValueOnce(false);

      await processor.processMindmapJob(mockMsg);

      expect(mockJobService.failJob).toHaveBeenCalledWith(
        'mindmap-job-1',
        'lease-token-mindmap-123',
        expect.objectContaining({
          errorCode: 'TARGET_CHANGED',
          retryable: false,
        }),
      );
      expect(mockMsg.ack).toHaveBeenCalled();
    });
  });

  describe('Input Revision Mismatch', () => {
    it('should fail job with INPUT_CHANGED if transcript changed before processing', async () => {
      mockLessonRepo.findById.mockResolvedValueOnce({
        id: 'lesson-1',
        analysisInputRevision: 2,
        analysisOutputRevisions: { summary: 0, quiz: 0, mindmap: 0 },
      });

      await processor.processMindmapJob(mockMsg);

      expect(mockJobService.failJob).toHaveBeenCalledWith(
        'mindmap-job-1',
        'lease-token-mindmap-123',
        expect.objectContaining({
          errorCode: 'INPUT_CHANGED',
          retryable: false,
        }),
      );
      expect(mockMsg.ack).toHaveBeenCalled();
    });
  });

  describe('AI Quota 429 Rate Limit', () => {
    it('should mark job with retryable=true on transient API error', async () => {
      mockMindmapGenService.generateMindmapContent.mockRejectedValueOnce(
        Object.assign(new Error('Rate limit exceeded: quota exhausted'), { status: 429 }),
      );

      await processor.processMindmapJob(mockMsg);

      expect(mockJobService.failJob).toHaveBeenCalledWith(
        'mindmap-job-1',
        'lease-token-mindmap-123',
        expect.objectContaining({
          retryable: true,
        }),
      );
      expect(mockMsg.ack).toHaveBeenCalled();
    });
  });
});
