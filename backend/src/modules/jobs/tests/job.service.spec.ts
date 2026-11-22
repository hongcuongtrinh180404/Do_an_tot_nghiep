import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { JobStatusEnum, JobTypeEnum, JobPhaseEnum, IJob } from 'share-lib';
import { JobService } from '../services/job.service.js';
import { JobRepository } from '../repositories/job.repository.js';

describe('JobService (Unit Test)', () => {
  let service: JobService;
  let mockJobRepo: Partial<Record<keyof JobRepository, any>>;
  let mockCls: Partial<ClsService>;

  const mockJob: IJob = {
    id: 'job-123',
    type: JobTypeEnum.SUMMARY,
    lessonId: 'lesson-456',
    courseId: 'course-789',
    requestedById: 'user-001',
    correlationId: 'corr-abc',
    idempotencyKey: 'idem-key-1',
    requestHash: 'hash-abc',
    parameters: { saveAsDraft: false },
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
    mockJobRepo = {
      create: vi.fn().mockImplementation((payload) => Promise.resolve({ id: 'job-new', ...payload })),
      findById: vi.fn().mockResolvedValue(mockJob),
      findByIdempotencyKey: vi.fn().mockResolvedValue(null),
      findActiveByLessonAndType: vi.fn().mockResolvedValue(null),
      claimJobAtomic: vi.fn().mockResolvedValue({ ...mockJob, status: JobStatusEnum.PROCESSING, attempts: 1 }),
      renewLeaseAtomic: vi.fn().mockResolvedValue(true),
      update: vi.fn().mockImplementation((id, payload) => Promise.resolve({ ...mockJob, ...payload })),
      findRecentJobsByLesson: vi.fn().mockResolvedValue([mockJob]),
    };

    mockCls = {
      get: vi.fn((key) => (key === 'userId' ? 'user-001' : 'corr-cls')),
    };

    service = new JobService(mockJobRepo as unknown as JobRepository, mockCls as unknown as ClsService);
  });

  describe('createJob', () => {
    it('nên tạo Job mới thành công khi không có trùng lặp', async () => {
      const res = await service.createJob({
        type: JobTypeEnum.SUMMARY,
        lessonId: 'lesson-456',
        courseId: 'course-789',
        requestedById: 'user-001',
        parameters: { saveAsDraft: false },
      });

      expect(res).toBeDefined();
      expect(mockJobRepo.create).toHaveBeenCalled();
    });

    it('nên trả về Job hiện có khi trùng Idempotency-Key và cùng tham số', async () => {
      // Mock hash khớp nhau
      const computeHash = (service as any).computeHash({ saveAsDraft: false });
      mockJobRepo.findByIdempotencyKey = vi.fn().mockResolvedValue({
        ...mockJob,
        requestHash: computeHash,
      });

      const res = await service.createJob({
        type: JobTypeEnum.SUMMARY,
        lessonId: 'lesson-456',
        courseId: 'course-789',
        requestedById: 'user-001',
        idempotencyKey: 'idem-key-1',
        parameters: { saveAsDraft: false },
      });

      expect(res.id).toBe(mockJob.id);
      expect(mockJobRepo.create).not.toHaveBeenCalled();
    });

    it('nên ném ConflictException khi trùng Idempotency-Key nhưng khác tham số', async () => {
      mockJobRepo.findByIdempotencyKey = vi.fn().mockResolvedValue({
        ...mockJob,
        requestHash: 'different-hash',
      });

      await expect(
        service.createJob({
          type: JobTypeEnum.SUMMARY,
          lessonId: 'lesson-456',
          courseId: 'course-789',
          requestedById: 'user-001',
          idempotencyKey: 'idem-key-1',
          parameters: { saveAsDraft: true },
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('nên ném ConflictException khi đã có Job active cùng loại nhưng khác tham số', async () => {
      mockJobRepo.findActiveByLessonAndType = vi.fn().mockResolvedValue({
        ...mockJob,
        requestHash: 'old-hash',
      });

      await expect(
        service.createJob({
          type: JobTypeEnum.SUMMARY,
          lessonId: 'lesson-456',
          courseId: 'course-789',
          requestedById: 'user-001',
          parameters: { count: 10 },
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('claimJob', () => {
    it('nên claim thành công và trả về leaseToken', async () => {
      const res = await service.claimJob('job-123', 1, 'worker-1');
      expect(res).toBeDefined();
      expect(res?.job.status).toBe(JobStatusEnum.PROCESSING);
      expect(res?.leaseToken).toBeDefined();
    });

    it('nên trả về null khi không claim được atomic', async () => {
      mockJobRepo.claimJobAtomic = vi.fn().mockResolvedValue(null);
      const res = await service.claimJob('job-123', 1, 'worker-1');
      expect(res).toBeNull();
    });
  });

  describe('completeJob', () => {
    it('nên hoàn tất Job khi leaseToken hợp lệ', async () => {
      mockJobRepo.findById = vi.fn().mockResolvedValue({
        ...mockJob,
        status: JobStatusEnum.PROCESSING,
        leaseToken: 'valid-token',
      });

      const res = await service.completeJob('job-123', 'valid-token', { summaryId: 'sum-1' });
      expect(res.status).toBe(JobStatusEnum.COMPLETED);
      expect(res.active).toBe(false);
    });

    it('nên ném ConflictException khi leaseToken không khớp (Fencing violation)', async () => {
      mockJobRepo.findById = vi.fn().mockResolvedValue({
        ...mockJob,
        status: JobStatusEnum.PROCESSING,
        leaseToken: 'different-token',
      });

      await expect(
        service.completeJob('job-123', 'stale-token'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('failJob', () => {
    it('nên lên lịch retry khi retryable = true và còn lượt attempts', async () => {
      mockJobRepo.findById = vi.fn().mockResolvedValue({
        ...mockJob,
        attempts: 1,
        maxAttempts: 3,
        status: JobStatusEnum.PROCESSING,
        leaseToken: 'tok-1',
      });

      const res = await service.failJob('job-123', 'tok-1', {
        errorCode: 'RATE_LIMIT',
        errorMessage: 'Quota exceeded',
        retryable: true,
      });

      expect(res.status).toBe(JobStatusEnum.QUEUED);
      expect(res.phase).toBe(JobPhaseEnum.WAITING_RETRY);
    });

    it('nên đánh dấu FAILED vĩnh viễn khi đã hết lượt attempts', async () => {
      mockJobRepo.findById = vi.fn().mockResolvedValue({
        ...mockJob,
        attempts: 3,
        maxAttempts: 3,
        status: JobStatusEnum.PROCESSING,
        leaseToken: 'tok-1',
      });

      const res = await service.failJob('job-123', 'tok-1', {
        errorCode: 'RATE_LIMIT',
        errorMessage: 'Quota exceeded',
        retryable: true,
      });

      expect(res.status).toBe(JobStatusEnum.FAILED);
      expect(res.active).toBe(false);
    });
  });

  describe('retryManual', () => {
    it('nên tạo Job mới với retryOfJobId khi job cũ đã FAILED', async () => {
      mockJobRepo.findById = vi.fn().mockResolvedValue({
        ...mockJob,
        status: JobStatusEnum.FAILED,
        active: false,
      });

      const res = await service.retryManual('job-123', 'user-001');
      expect(res).toBeDefined();
      expect(mockJobRepo.create).toHaveBeenCalled();
      expect(mockJobRepo.update).toHaveBeenCalledWith('job-new', {
        retryOfJobId: 'job-123',
      });
    });

    it('nên ném ConflictException nếu job cũ chưa ở trạng thái FAILED', async () => {
      mockJobRepo.findById = vi.fn().mockResolvedValue({
        ...mockJob,
        status: JobStatusEnum.PROCESSING,
      });

      await expect(
        service.retryManual('job-123', 'user-001'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
