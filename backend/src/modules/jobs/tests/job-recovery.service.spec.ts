import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { JobTypeEnum, JobStatusEnum, JobPhaseEnum, IJob } from 'share-lib';
import { JobRecoveryService } from '../services/job-recovery.service.js';
import { JobRepository } from '../repositories/job.repository.js';

describe('JobRecoveryService (Unit Test)', () => {
  let recovery: JobRecoveryService;
  let mockJobRepo: Partial<Record<keyof JobRepository, ReturnType<typeof vi.fn>>>;
  let mockConfigService: Partial<Record<keyof ConfigService, ReturnType<typeof vi.fn>>>;

  const mockExpiredJob: IJob = {
    id: 'job-expired-1',
    type: JobTypeEnum.SUMMARY,
    lessonId: 'lesson-1',
    courseId: 'course-1',
    requestedById: 'user-1',
    correlationId: 'corr-uuid-1',
    parameters: {},
    active: true,
    status: JobStatusEnum.PROCESSING,
    phase: JobPhaseEnum.WAITING_DISPATCH,
    attempts: 1,
    maxAttempts: 3,
    dispatchState: 'published',
    dispatchSequence: 1,
    inputRevision: 0,
    targetRevision: 0,
    workerId: 'worker-dead-1',
    leaseToken: 'lease-expired-token',
    leaseExpiresAt: new Date(Date.now() - 60000), // đã quá hạn 1 phút
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.useFakeTimers();

    mockJobRepo = {
      findExpiredLeases: vi.fn().mockResolvedValue([mockExpiredJob]),
      update: vi.fn().mockResolvedValue({ ...mockExpiredJob, status: JobStatusEnum.QUEUED }),
    };

    mockConfigService = {
      get: vi.fn((key: string, defaultVal: number) => {
        if (key === 'JOB_RECOVERY_INTERVAL_MS') return 30000;
        return defaultVal;
      }),
    };

    recovery = new JobRecoveryService(
      mockJobRepo as unknown as JobRepository,
      mockConfigService as unknown as ConfigService,
    );
  });

  afterEach(() => {
    recovery.onModuleDestroy();
    vi.useRealTimers();
  });

  describe('Lifecycle (onModuleInit & onModuleDestroy)', () => {
    it('nên khởi chạy timer khi onModuleInit và xóa timer khi onModuleDestroy', () => {
      // Arrange & Act
      recovery.onModuleInit();

      // Assert
      expect(mockConfigService.get).toHaveBeenCalledWith('JOB_RECOVERY_INTERVAL_MS', 30000);

      // Clean up
      recovery.onModuleDestroy();
    });
  });

  describe('recoverExpiredJobs', () => {
    it('nên trả về 0 khi không có job nào bị quá hạn lease', async () => {
      // Arrange
      mockJobRepo.findExpiredLeases = vi.fn().mockResolvedValue([]);

      // Act
      const count = await recovery.recoverExpiredJobs();

      // Assert
      expect(count).toBe(0);
      expect(mockJobRepo.update).not.toHaveBeenCalled();
    });

    it('nên phục hồi job quá hạn về trạng thái QUEUED và tăng dispatchSequence', async () => {
      // Arrange & Act
      const count = await recovery.recoverExpiredJobs();

      // Assert
      expect(count).toBe(1);
      expect(mockJobRepo.update).toHaveBeenCalledWith(
        mockExpiredJob.id,
        {
          status: JobStatusEnum.QUEUED,
          phase: JobPhaseEnum.WAITING_RETRY,
          dispatchState: 'pending',
          dispatchSequence: mockExpiredJob.dispatchSequence + 1,
          workerId: null,
          leaseToken: null,
          leaseExpiresAt: null,
          heartbeatAt: null,
        },
      );
    });

    it('nên bắt lỗi và tiếp tục xử lý các job khác nếu một job cập nhật thất bại', async () => {
      // Arrange
      const mockJob2: IJob = {
        ...mockExpiredJob,
        id: 'job-expired-2',
      };
      mockJobRepo.findExpiredLeases = vi.fn().mockResolvedValue([mockExpiredJob, mockJob2]);

      // Job 1 thất bại, Job 2 thành công
      mockJobRepo.update = vi.fn()
        .mockRejectedValueOnce(new Error('Mongo network timeout'))
        .mockResolvedValueOnce({ ...mockJob2, status: JobStatusEnum.QUEUED });

      // Act
      const count = await recovery.recoverExpiredJobs();

      // Assert
      expect(count).toBe(1); // 1 trong 2 được phục hồi thành công
      expect(mockJobRepo.update).toHaveBeenCalledTimes(2);
    });

    it('không nên quét chồng chéo khi lần quét trước chưa xong (isProcessing)', async () => {
      // Arrange
      mockJobRepo.findExpiredLeases = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return [mockExpiredJob];
      });

      // Act
      const p1 = recovery.recoverExpiredJobs();
      const p2 = recovery.recoverExpiredJobs();

      vi.advanceTimersByTime(100);
      const [count1, count2] = await Promise.all([p1, p2]);

      // Assert
      expect(count1).toBe(1);
      expect(count2).toBe(0);
    });
  });
});
