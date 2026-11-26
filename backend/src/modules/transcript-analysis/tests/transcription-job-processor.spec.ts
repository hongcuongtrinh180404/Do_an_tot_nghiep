import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { Connection } from 'mongoose';
import {
  JobTypeEnum,
  JobStatusEnum,
  JobPhaseEnum,
  LessonTranscriptionStatusEnum,
  IJob,
} from 'share-lib';
import { TranscriptionJobProcessor } from '../processors/transcription-job.processor.js';
import { RabbitMqService, RabbitMqMessage } from '../../messaging/rabbitmq.service.js';
import { JobService } from '../../jobs/services/job.service.js';
import { JobRepository } from '../../jobs/repositories/job.repository.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonTranscriptRepository } from '../../course/repositories/lesson-transcript.repository.js';
import { AudioExtractorService } from '../../course/services/audio-extractor.service.js';
import { AssemblyAiService } from '../../assemblyai/assemblyai.service.js';
import { StorageService } from '../../storage/storage.service.js';
import { JobMessagePayload } from '../../jobs/services/job-dispatcher.service.js';
import { AutomaticAnalysisService } from '../services/automatic-analysis.service.js';

describe('TranscriptionJobProcessor', () => {
  let processor: TranscriptionJobProcessor;
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
    updateCheckpoint: ReturnType<typeof vi.fn>;
  };
  let mockJobRepo: {
    findById: ReturnType<typeof vi.fn>;
  };
  let enqueueMissing: ReturnType<typeof vi.fn>;
  let mockLessonRepo: {
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    incrementInputRevision: ReturnType<typeof vi.fn>;
  };
  let mockLessonTranscriptRepo: {
    upsertByLessonId: ReturnType<typeof vi.fn>;
    updateStatusByLessonId: ReturnType<typeof vi.fn>;
  };
  let mockAudioExtractorService: {
    extractMp3FromVideo: ReturnType<typeof vi.fn>;
    cleanupTempFile: ReturnType<typeof vi.fn>;
  };
  let mockAssemblyAiService: {
    submitTranscriptFile: ReturnType<typeof vi.fn>;
    pollTranscript: ReturnType<typeof vi.fn>;
  };
  let mockStorageService: {
    getPresignedStreamUrl: ReturnType<typeof vi.fn>;
  };
  let mockConnection: {
    startSession: ReturnType<typeof vi.fn>;
  };
  let mockSession: {
    withTransaction: ReturnType<typeof vi.fn>;
    endSession: ReturnType<typeof vi.fn>;
  };

  const sampleJob: IJob = {
    id: 'job-transcription-1',
    type: JobTypeEnum.TRANSCRIPTION,
    lessonId: 'lesson-1',
    courseId: 'course-1',
    requestedById: 'user-1',
    correlationId: 'corr-1',
    parameters: { videoKey: 'videos/sample.mp4' },
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
    jobId: 'job-transcription-1',
    dispatchSequence: 1,
    type: JobTypeEnum.TRANSCRIPTION,
    correlationId: 'corr-1',
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
        job: { ...sampleJob, status: JobStatusEnum.PROCESSING },
        leaseToken: 'lease-token-123',
      }),
      renewLease: vi.fn().mockResolvedValue(true),
      completeJob: vi.fn().mockResolvedValue({ ...sampleJob, status: JobStatusEnum.COMPLETED }),
      failJob: vi.fn().mockResolvedValue({ ...sampleJob, status: JobStatusEnum.FAILED }),
      updateCheckpoint: vi.fn().mockResolvedValue({ ...sampleJob }),
    };
    mockJobRepo = {
      findById: vi.fn().mockResolvedValue(sampleJob),
    };
    enqueueMissing = vi.fn();
    mockLessonRepo = {
      findById: vi.fn().mockResolvedValue({
        id: 'lesson-1',
        title: 'Sample Lesson',
        content: { url: 'https://cdn.example.com/video.mp4', duration: 0 },
        transcriptionStatus: LessonTranscriptionStatusEnum.QUEUED,
        analysisInputRevision: 0,
      }),
      update: vi.fn().mockResolvedValue(true),
      incrementInputRevision: vi.fn().mockResolvedValue(1),
    };
    mockLessonTranscriptRepo = {
      upsertByLessonId: vi.fn().mockResolvedValue({}),
      updateStatusByLessonId: vi.fn().mockResolvedValue({}),
    };
    mockAudioExtractorService = {
      extractMp3FromVideo: vi.fn().mockResolvedValue('/tmp/audio-lesson-1.mp3'),
      cleanupTempFile: vi.fn().mockResolvedValue(undefined),
    };
    mockAssemblyAiService = {
      submitTranscriptFile: vi.fn().mockResolvedValue('assemblyai-transcript-id-999'),
      pollTranscript: vi.fn().mockResolvedValue({
        transcriptId: 'assemblyai-transcript-id-999',
        rawTranscript: 'Xin chào các bạn đến với khóa học.',
        sentences: [{ text: 'Xin chào các bạn đến với khóa học.', start: 0, end: 3500 }],
        durationSeconds: 120,
        languageCode: 'vi',
      }),
    };
    mockStorageService = {
      getPresignedStreamUrl: vi.fn().mockResolvedValue('https://minio.local/presigned-url'),
    };
    mockSession = {
      withTransaction: vi.fn().mockImplementation(async (cb: () => Promise<void>) => {
        await cb();
      }),
      endSession: vi.fn().mockResolvedValue(undefined),
    };
    mockConnection = {
      startSession: vi.fn().mockResolvedValue(mockSession),
    };

    mockMsg = {
      content: { ...sampleMsgPayload },
      ack: vi.fn(),
      nack: vi.fn(),
      fields: {} as never,
      properties: {} as never,
    };

    processor = new TranscriptionJobProcessor(
      mockRabbitMqService as unknown as RabbitMqService,
      mockConfigService as unknown as ConfigService,
      mockJobService as unknown as JobService,
      mockJobRepo as unknown as JobRepository,
      mockLessonRepo as unknown as LessonRepository,
      mockLessonTranscriptRepo as unknown as LessonTranscriptRepository,
      mockAudioExtractorService as unknown as AudioExtractorService,
      mockAssemblyAiService as unknown as AssemblyAiService,
      mockStorageService as unknown as StorageService,
      mockConnection as unknown as Connection,
      { enqueueMissing } as unknown as AutomaticAnalysisService,
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('onModuleInit', () => {
    it('bỏ qua đăng ký consumer khi không phải worker (IS_WORKER != true)', async () => {
      delete process.env.IS_WORKER;
      await processor.onModuleInit();
      expect(mockRabbitMqService.createConsumer).not.toHaveBeenCalled();
    });

    it('đăng ký consumer với queue transcription khi IS_WORKER = true', async () => {
      process.env.IS_WORKER = 'true';
      await processor.onModuleInit();
      expect(mockRabbitMqService.createConsumer).toHaveBeenCalledWith(
        'mindly.transcription.v1',
        expect.any(Function),
        { prefetch: 1 },
      );
      delete process.env.IS_WORKER;
    });
  });

  describe('handleMessage validation', () => {
    it('bỏ qua và ACK nếu message không có jobId', async () => {
      mockMsg.content = { ...sampleMsgPayload, jobId: '' };
      await processor.handleMessage(mockMsg);
      expect(mockMsg.ack).toHaveBeenCalled();
      expect(mockJobRepo.findById).not.toHaveBeenCalled();
    });

    it('bỏ qua và ACK nếu type không phải TRANSCRIPTION', async () => {
      mockMsg.content = { ...sampleMsgPayload, type: JobTypeEnum.SUMMARY };
      await processor.handleMessage(mockMsg);
      expect(mockMsg.ack).toHaveBeenCalled();
      expect(mockJobRepo.findById).not.toHaveBeenCalled();
    });
  });

  describe('processTranscriptionJob - Happy Path', () => {
    it('thực hiện trích xuất âm thanh, upload AssemblyAI, lưu checkpoint, poll và commit thành công', async () => {
      await processor.processTranscriptionJob(mockMsg);

      // 1. Claim Job
      expect(mockJobService.claimJob).toHaveBeenCalledWith(
        'job-transcription-1',
        1,
        expect.stringContaining('worker-transcription-'),
        120000,
      );

      // 2. FFmpeg trích xuất âm thanh
      expect(mockAudioExtractorService.extractMp3FromVideo).toHaveBeenCalledWith(
        'https://minio.local/presigned-url',
        'lesson-1',
      );

      // 3. Submit AssemblyAI
      expect(mockAssemblyAiService.submitTranscriptFile).toHaveBeenCalledWith(
        '/tmp/audio-lesson-1.mp3',
        { languageCode: 'vi' },
      );

      // 4. Lưu Checkpoint
      expect(mockJobService.updateCheckpoint).toHaveBeenCalledWith(
        'job-transcription-1',
        'lease-token-123',
        { externalTranscriptId: 'assemblyai-transcript-id-999' },
      );

      // 5. Cleanup tệp MP3 tạm sau khi upload
      expect(mockAudioExtractorService.cleanupTempFile).toHaveBeenCalledWith('/tmp/audio-lesson-1.mp3');

      // 6. Polling transcript
      expect(mockAssemblyAiService.pollTranscript).toHaveBeenCalledWith('assemblyai-transcript-id-999');

      // 7. Atomic transaction commit
      expect(mockConnection.startSession).toHaveBeenCalled();
      expect(mockLessonTranscriptRepo.upsertByLessonId).toHaveBeenCalledWith(
        'lesson-1',
        expect.objectContaining({
          rawTranscript: 'Xin chào các bạn đến với khóa học.',
          status: LessonTranscriptionStatusEnum.READY,
          durationSeconds: 120,
        }),
        mockSession,
      );
      expect(mockLessonRepo.update).toHaveBeenCalledWith(
        'lesson-1',
        expect.objectContaining({
          transcriptionStatus: LessonTranscriptionStatusEnum.READY,
          content: expect.objectContaining({ duration: 120 }),
        }),
        mockSession,
      );
      expect(mockLessonRepo.incrementInputRevision).toHaveBeenCalledWith('lesson-1', mockSession);
      expect(enqueueMissing).toHaveBeenCalledExactlyOnceWith({
        lessonId: 'lesson-1',
        courseId: 'course-1',
        requestedById: 'user-1',
        inputRevision: 1,
      }, undefined, mockSession);
      expect(mockJobService.completeJob).toHaveBeenCalledWith(
        'job-transcription-1',
        'lease-token-123',
        expect.objectContaining({
          transcriptId: 'assemblyai-transcript-id-999',
          durationSeconds: 120,
          sentenceCount: 1,
        }),
        mockSession,
      );

      // 8. ACK message
      expect(mockMsg.ack).toHaveBeenCalled();
    });

    it('marks an empty transcript ready without scheduling an AI request', async () => {
      mockAssemblyAiService.pollTranscript.mockResolvedValueOnce({
        transcriptId: 'assemblyai-transcript-empty',
        rawTranscript: ' ',
        sentences: [],
        durationSeconds: 60,
        languageCode: 'vi',
      });

      await processor.processTranscriptionJob(mockMsg);

      expect(enqueueMissing).not.toHaveBeenCalled();
      expect(mockJobService.completeJob).toHaveBeenCalled();
      expect(mockMsg.ack).toHaveBeenCalled();
    });
  });

  describe('processTranscriptionJob - Checkpoint Resume', () => {
    it('bỏ qua FFmpeg và upload khi đã có externalTranscriptId trong parameters', async () => {
      mockJobService.claimJob.mockResolvedValueOnce({
        job: {
          ...sampleJob,
          status: JobStatusEnum.PROCESSING,
          parameters: {
            videoKey: 'videos/sample.mp4',
            externalTranscriptId: 'checkpoint-transcript-id-777',
          },
        },
        leaseToken: 'lease-token-123',
      });

      await processor.processTranscriptionJob(mockMsg);

      // Bỏ qua FFmpeg và submit
      expect(mockAudioExtractorService.extractMp3FromVideo).not.toHaveBeenCalled();
      expect(mockAssemblyAiService.submitTranscriptFile).not.toHaveBeenCalled();

      // Trực tiếp poll ID từ checkpoint
      expect(mockAssemblyAiService.pollTranscript).toHaveBeenCalledWith('checkpoint-transcript-id-777');
      expect(mockJobService.completeJob).toHaveBeenCalled();
      expect(mockMsg.ack).toHaveBeenCalled();
    });
  });

  describe('processTranscriptionJob - Crash After Commit', () => {
    it('ACK ngay và bỏ qua xử lý nếu Job đã ở trạng thái COMPLETED', async () => {
      mockJobRepo.findById.mockResolvedValueOnce({
        ...sampleJob,
        status: JobStatusEnum.COMPLETED,
      });

      await processor.processTranscriptionJob(mockMsg);

      expect(mockMsg.ack).toHaveBeenCalled();
      expect(mockJobService.claimJob).not.toHaveBeenCalled();
    });
  });

  describe('processTranscriptionJob - Error Scenarios', () => {
    it('thất bại không retry (permanent) nếu không tìm thấy bài học', async () => {
      mockLessonRepo.findById.mockResolvedValueOnce(null);

      await processor.processTranscriptionJob(mockMsg);

      expect(mockJobService.failJob).toHaveBeenCalledWith(
        'job-transcription-1',
        'lease-token-123',
        expect.objectContaining({
          errorCode: 'LESSON_NOT_FOUND',
          retryable: false,
        }),
      );
      expect(mockMsg.ack).toHaveBeenCalled();
    });

    it('thất bại không retry (permanent) nếu bài học thiếu nguồn video', async () => {
      mockJobRepo.findById.mockResolvedValueOnce({
        ...sampleJob,
        parameters: {},
      });
      mockJobService.claimJob.mockResolvedValueOnce({
        job: {
          ...sampleJob,
          parameters: {},
          status: JobStatusEnum.PROCESSING,
        },
        leaseToken: 'lease-token-123',
      });
      mockLessonRepo.findById.mockResolvedValueOnce({
        id: 'lesson-1',
        content: null,
      });

      await processor.processTranscriptionJob(mockMsg);

      expect(mockJobService.failJob).toHaveBeenCalledWith(
        'job-transcription-1',
        'lease-token-123',
        expect.objectContaining({
          errorCode: 'VIDEO_SOURCE_MISSING',
          retryable: false,
        }),
      );
      expect(mockLessonRepo.update).toHaveBeenCalledWith('lesson-1', {
        transcriptionStatus: LessonTranscriptionStatusEnum.FAILED,
      });
      expect(mockMsg.ack).toHaveBeenCalled();
    });

    it('thất bại có retry (transient) khi mạng gặp sự cố timeout (ETIMEDOUT)', async () => {
      mockAssemblyAiService.pollTranscript.mockRejectedValueOnce(
        new Error('AssemblyAI request timed out: ETIMEDOUT'),
      );

      await processor.processTranscriptionJob(mockMsg);

      expect(mockJobService.failJob).toHaveBeenCalledWith(
        'job-transcription-1',
        'lease-token-123',
        expect.objectContaining({
          errorCode: 'TRANSCRIPTION_TRANSIENT_ERROR',
          retryable: true,
        }),
      );
      expect(mockMsg.ack).toHaveBeenCalled();
    });

    it('dọn dẹp file tạm trong khối finally nếu gặp lỗi sau khi đã extract', async () => {
      mockAssemblyAiService.submitTranscriptFile.mockRejectedValueOnce(
        new Error('Upload failed with 500 Internal Server Error'),
      );

      await processor.processTranscriptionJob(mockMsg);

      expect(mockAudioExtractorService.cleanupTempFile).toHaveBeenCalledWith('/tmp/audio-lesson-1.mp3');
      expect(mockMsg.ack).toHaveBeenCalled();
    });
  });
});
