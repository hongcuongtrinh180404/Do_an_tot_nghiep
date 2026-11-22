import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { JobTypeEnum, JobStatusEnum, JobPhaseEnum, IJob } from 'share-lib';
import { JobDispatcherService, JobMessagePayload } from '../services/job-dispatcher.service.js';
import { JobRepository } from '../repositories/job.repository.js';
import { RabbitMqService } from '../../messaging/rabbitmq.service.js';

describe('JobDispatcherService (Unit Test)', () => {
  let dispatcher: JobDispatcherService;
  let mockJobRepo: Partial<Record<keyof JobRepository, ReturnType<typeof vi.fn>>>;
  let mockRabbitMqService: Partial<Record<keyof RabbitMqService, ReturnType<typeof vi.fn>>>;
  let mockConfigService: Partial<Record<keyof ConfigService, ReturnType<typeof vi.fn>>>;

  const mockPendingJob: IJob = {
    id: 'job-pending-1',
    type: JobTypeEnum.SUMMARY,
    lessonId: 'lesson-1',
    courseId: 'course-1',
    requestedById: 'user-1',
    correlationId: 'corr-uuid-1',
    parameters: {},
    active: true,
    status: JobStatusEnum.QUEUED,
    phase: JobPhaseEnum.WAITING_DISPATCH,
    attempts: 0,
    maxAttempts: 3,
    dispatchState: 'pending',
    dispatchSequence: 1,
    inputRevision: 0,
    targetRevision: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.useFakeTimers();

    mockJobRepo = {
      findPendingDispatches: vi.fn().mockResolvedValue([mockPendingJob]),
      markDispatched: vi.fn().mockResolvedValue(mockPendingJob),
    };

    mockRabbitMqService = {
      publish: vi.fn().mockResolvedValue(true),
    };

    mockConfigService = {
      get: vi.fn((key: string, defaultVal: number) => {
        if (key === 'JOB_DISPATCH_INTERVAL_MS') return 3000;
        return defaultVal;
      }),
    };

    dispatcher = new JobDispatcherService(
      mockJobRepo as unknown as JobRepository,
      mockRabbitMqService as unknown as RabbitMqService,
      mockConfigService as unknown as ConfigService,
    );
  });

  afterEach(() => {
    dispatcher.onModuleDestroy();
    vi.useRealTimers();
  });

  describe('Lifecycle (onModuleInit & onModuleDestroy)', () => {
    it('nên khởi chạy timer khi onModuleInit và xóa timer khi onModuleDestroy', () => {
      // Arrange & Act
      dispatcher.onModuleInit();

      // Assert
      expect(mockConfigService.get).toHaveBeenCalledWith('JOB_DISPATCH_INTERVAL_MS', 3000);

      // Clean up
      dispatcher.onModuleDestroy();
    });
  });

  describe('dispatchPendingJobs', () => {
    it('nên trả về 0 khi không có job nào chờ dispatch', async () => {
      // Arrange
      mockJobRepo.findPendingDispatches = vi.fn().mockResolvedValue([]);

      // Act
      const count = await dispatcher.dispatchPendingJobs();

      // Assert
      expect(count).toBe(0);
      expect(mockRabbitMqService.publish).not.toHaveBeenCalled();
      expect(mockJobRepo.markDispatched).not.toHaveBeenCalled();
    });

    it('nên publish sang RabbitMQ và đánh dấu dispatched khi có job chờ', async () => {
      // Arrange & Act
      const count = await dispatcher.dispatchPendingJobs();

      // Assert
      expect(count).toBe(1);
      const expectedPayload: JobMessagePayload = {
        version: 1,
        jobId: mockPendingJob.id,
        dispatchSequence: mockPendingJob.dispatchSequence,
        type: mockPendingJob.type,
        correlationId: mockPendingJob.correlationId,
      };

      expect(mockRabbitMqService.publish).toHaveBeenCalledWith(
        'ai.summary',
        expectedPayload,
        {
          correlationId: mockPendingJob.correlationId,
          messageId: `${mockPendingJob.id}-${mockPendingJob.dispatchSequence}`,
          mandatory: true,
        },
      );
      expect(mockJobRepo.markDispatched).toHaveBeenCalledWith(
        mockPendingJob.id,
        mockPendingJob.dispatchSequence,
      );
    });

    it('không nên đánh dấu dispatched nếu RabbitMQ publish trả về false', async () => {
      // Arrange
      mockRabbitMqService.publish = vi.fn().mockResolvedValue(false);

      // Act
      const count = await dispatcher.dispatchPendingJobs();

      // Assert
      expect(count).toBe(0);
      expect(mockJobRepo.markDispatched).not.toHaveBeenCalled();
    });

    it('nên xử lý lỗi khi publish bị ném exception mà không làm crash scanner', async () => {
      // Arrange
      mockRabbitMqService.publish = vi.fn().mockRejectedValue(new Error('Broker connection lost'));

      // Act
      const count = await dispatcher.dispatchPendingJobs();

      // Assert
      expect(count).toBe(0);
      expect(mockJobRepo.markDispatched).not.toHaveBeenCalled();
    });

    it('không nên quét chồng chéo khi lần quét trước chưa hoàn tất (isProcessing)', async () => {
      // Arrange
      mockJobRepo.findPendingDispatches = vi.fn().mockImplementation(async () => {
        // Giả lập tác vụ quét tốn thời gian
        await new Promise((resolve) => setTimeout(resolve, 50));
        return [mockPendingJob];
      });

      // Act: kích hoạt 2 lần quét song song
      const p1 = dispatcher.dispatchPendingJobs();
      const p2 = dispatcher.dispatchPendingJobs();

      // Cho phép timer chạy để hoàn tất promise
      vi.advanceTimersByTime(100);
      const [count1, count2] = await Promise.all([p1, p2]);

      // Assert: Lần 2 bị bỏ qua vì lần 1 đang processing
      expect(count1).toBe(1);
      expect(count2).toBe(0);
    });
  });
});
