import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Connection } from 'mongoose';
import { JobTypeEnum, JobStatusEnum, JobPhaseEnum, IJob, QuizQuestionTypeEnum } from 'share-lib';
import { AnalysisJobProcessor } from '../processors/analysis-job.processor.js';
import { RabbitMqService, RabbitMqMessage } from '../../messaging/rabbitmq.service.js';
import { JobService } from '../../jobs/services/job.service.js';
import { JobRepository } from '../../jobs/repositories/job.repository.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonQuizRepository } from '../../course/repositories/lesson-quiz.repository.js';
import { LessonQuizDraftRepository } from '../../course/repositories/lesson-quiz-draft.repository.js';
import { QuizGenerationService } from '../services/quiz-generation.service.js';
import { JobManagementPolicy } from '../policies/job-management.policy.js';
import { JobMessagePayload } from '../../jobs/services/job-dispatcher.service.js';

describe('AnalysisJobProcessor - Quiz Job', () => {
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
  let mockLessonQuizRepo: {
    replaceAllQuizzesForLesson: ReturnType<typeof vi.fn>;
  };
  let mockLessonQuizDraftRepo: {
    saveDraftByLessonId: ReturnType<typeof vi.fn>;
    clearDraftByLessonId: ReturnType<typeof vi.fn>;
  };
  let mockQuizGenService: {
    generateQuizContent: ReturnType<typeof vi.fn>;
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

  const sampleQuizJob: IJob = {
    id: 'quiz-job-1',
    type: JobTypeEnum.QUIZ,
    lessonId: 'lesson-1',
    courseId: 'course-1',
    requestedById: 'user-1',
    correlationId: 'corr-quiz-1',
    parameters: { count: 10, saveAsDraft: false },
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
    jobId: 'quiz-job-1',
    dispatchSequence: 1,
    type: JobTypeEnum.QUIZ,
    correlationId: 'corr-quiz-1',
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
        job: { ...sampleQuizJob, status: JobStatusEnum.PROCESSING },
        leaseToken: 'lease-token-quiz-123',
      }),
      renewLease: vi.fn().mockResolvedValue(true),
      completeJob: vi.fn().mockResolvedValue({
        ...sampleQuizJob,
        status: JobStatusEnum.COMPLETED,
      }),
      failJob: vi.fn().mockResolvedValue({
        ...sampleQuizJob,
        status: JobStatusEnum.FAILED,
      }),
    };
    mockJobRepo = {
      findById: vi.fn().mockResolvedValue(sampleQuizJob),
    };
    mockLessonRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 'lesson-1',
        analysisInputRevision: 0,
        analysisOutputRevisions: { summary: 0, quiz: 0, mindmap: 0 },
      }),
      incrementOutputRevision: vi.fn().mockResolvedValue(true),
    };
    mockLessonQuizRepo = {
      replaceAllQuizzesForLesson: vi.fn().mockResolvedValue(true),
    };
    mockLessonQuizDraftRepo = {
      saveDraftByLessonId: vi.fn().mockResolvedValue({ id: 'draft-1' }),
      clearDraftByLessonId: vi.fn().mockResolvedValue(true),
    };
    mockQuizGenService = {
      generateQuizContent: vi.fn().mockResolvedValue({
        quizzes: [
          {
            order: 0,
            question: 'Câu hỏi kiểm tra 1?',
            questionType: QuizQuestionTypeEnum.SINGLE_CHOICE,
            options: [
              { id: 'opt-a', label: 'A', text: 'Đáp án A', isCorrect: true },
              { id: 'opt-b', label: 'B', text: 'Đáp án B', isCorrect: false },
            ],
            explanation: 'Giải thích 1',
            explanationTimestamp: 45,
            timestamp: null,
          },
        ],
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
      mockQuizGenService as unknown as QuizGenerationService,
      {} as never, // mindmapAnalysisService
      mockLessonQuizRepo as unknown as LessonQuizRepository,
      mockLessonQuizDraftRepo as unknown as LessonQuizDraftRepository,
      {} as never, // lessonMindmapRepo
      mockJobPolicy as unknown as JobManagementPolicy,
      mockConnection as unknown as Connection,
      {} as never,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Happy Path: Replace All Quizzes', () => {
    it('should claim job, generate quiz outside transaction, commit in session with null timestamp, bump revision and ACK', async () => {
      await processor.processQuizJob(mockMsg);

      expect(mockJobService.claimJob).toHaveBeenCalledWith(
        'quiz-job-1',
        1,
        expect.stringContaining('worker-'),
        90000,
      );

      expect(mockQuizGenService.generateQuizContent).toHaveBeenCalledWith(
        'lesson-1',
        {
          count: 10,
          expectedInputRevision: 0,
        },
      );

      expect(mockConnection.startSession).toHaveBeenCalled();
      expect(mockLessonRepo.incrementOutputRevision).toHaveBeenCalledWith(
        'lesson-1',
        'quiz',
        0,
        mockSession,
      );

      expect(mockLessonQuizRepo.replaceAllQuizzesForLesson).toHaveBeenCalledWith(
        'lesson-1',
        expect.arrayContaining([
          expect.objectContaining({
            timestamp: null,
            explanationTimestamp: 45,
          }),
        ]),
        mockSession,
      );
      expect(mockLessonQuizDraftRepo.clearDraftByLessonId).toHaveBeenCalledWith('lesson-1', mockSession);

      expect(mockJobService.completeJob).toHaveBeenCalledWith(
        'quiz-job-1',
        'lease-token-quiz-123',
        expect.objectContaining({ count: 1 }),
        mockSession,
      );

      expect(mockMsg.ack).toHaveBeenCalled();
    });
  });

  describe('Zero-Quiz Safety Rule', () => {
    it('should complete job with preservedExisting=true and NOT delete official quizzes if AI returns 0 questions', async () => {
      mockQuizGenService.generateQuizContent.mockResolvedValueOnce({
        quizzes: [],
        model: 'gemini-2.5-flash',
      });

      await processor.processQuizJob(mockMsg);

      expect(mockLessonQuizRepo.replaceAllQuizzesForLesson).not.toHaveBeenCalled();
      expect(mockJobService.completeJob).toHaveBeenCalledWith(
        'quiz-job-1',
        'lease-token-quiz-123',
        expect.objectContaining({ count: 0, preservedExisting: true }),
      );
      expect(mockMsg.ack).toHaveBeenCalled();
    });
  });

  describe('Save as Draft', () => {
    it('should save draft quizzes without replacing official quizzes', async () => {
      mockJobService.claimJob.mockResolvedValueOnce({
        job: { ...sampleQuizJob, status: JobStatusEnum.PROCESSING, parameters: { count: 5, saveAsDraft: true } },
        leaseToken: 'lease-token-quiz-123',
      });

      await processor.processQuizJob(mockMsg);

      expect(mockLessonQuizDraftRepo.saveDraftByLessonId).toHaveBeenCalled();
      expect(mockLessonQuizRepo.replaceAllQuizzesForLesson).not.toHaveBeenCalled();
      expect(mockJobService.completeJob).toHaveBeenCalled();
      expect(mockMsg.ack).toHaveBeenCalled();
    });
  });

  describe('Crash After Commit Before ACK', () => {
    it('should immediately ACK without calling AI if job status is already COMPLETED', async () => {
      mockJobRepo.findById.mockResolvedValueOnce({
        ...sampleQuizJob,
        status: JobStatusEnum.COMPLETED,
      });

      await processor.processQuizJob(mockMsg);

      expect(mockMsg.ack).toHaveBeenCalled();
      expect(mockJobService.claimJob).not.toHaveBeenCalled();
      expect(mockQuizGenService.generateQuizContent).not.toHaveBeenCalled();
    });
  });

  describe('Revision Guard: Target Changed', () => {
    it('should fail job with TARGET_CHANGED and non-retryable if instructor updated quizzes during AI generation', async () => {
      mockLessonRepo.incrementOutputRevision.mockResolvedValueOnce(false);

      await processor.processQuizJob(mockMsg);

      expect(mockJobService.failJob).toHaveBeenCalledWith(
        'quiz-job-1',
        'lease-token-quiz-123',
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
        analysisInputRevision: 3,
        analysisOutputRevisions: { summary: 0, quiz: 0, mindmap: 0 },
      });

      await processor.processQuizJob(mockMsg);

      expect(mockJobService.failJob).toHaveBeenCalledWith(
        'quiz-job-1',
        'lease-token-quiz-123',
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
      mockQuizGenService.generateQuizContent.mockRejectedValueOnce(
        Object.assign(new Error('Rate limit exceeded: quota exhausted'), { status: 429 }),
      );

      await processor.processQuizJob(mockMsg);

      expect(mockJobService.failJob).toHaveBeenCalledWith(
        'quiz-job-1',
        'lease-token-quiz-123',
        expect.objectContaining({
          retryable: true,
        }),
      );
      expect(mockMsg.ack).toHaveBeenCalled();
    });
  });
});
