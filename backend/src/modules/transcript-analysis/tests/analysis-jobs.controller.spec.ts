import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoleEnum, JobStatusEnum, JobTypeEnum, JobPhaseEnum, IJob, IUserProfile } from 'share-lib';
import { AnalysisJobsController } from '../analysis-jobs.controller.js';
import { AnalysisJobService } from '../services/analysis-job.service.js';

describe('AnalysisJobsController (Unit Test)', () => {
  let controller: AnalysisJobsController;
  let mockAnalysisJobService: Partial<Record<keyof AnalysisJobService, ReturnType<typeof vi.fn>>>;

  const mockUser: Pick<IUserProfile, 'id' | 'role'> = {
    id: 'instructor-1',
    role: RoleEnum.INSTRUCTOR,
  };

  const mockJob: IJob = {
    id: 'job-100',
    type: JobTypeEnum.SUMMARY,
    lessonId: 'lesson-100',
    courseId: 'course-100',
    requestedById: 'instructor-1',
    correlationId: 'corr-100',
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
    mockAnalysisJobService = {
      getRecentJobs: vi.fn().mockResolvedValue([mockJob]),
      getJobById: vi.fn().mockResolvedValue(mockJob),
      retryJob: vi.fn().mockResolvedValue({
        ...mockJob,
        id: 'job-retry-200',
        retryOfJobId: 'job-100',
      }),
    };

    controller = new AnalysisJobsController(
      mockAnalysisJobService as unknown as AnalysisJobService,
    );
  });

  describe('getLessonJobs', () => {
    it('nên trả về ApiResponse.success với danh sách jobs', async () => {
      // Act
      const res = await controller.getLessonJobs('lesson-100', mockUser, 5);

      // Assert
      expect(res.success).toBe(true);
      expect(res.data).toEqual([mockJob]);
      expect(mockAnalysisJobService.getRecentJobs).toHaveBeenCalledWith(
        'lesson-100',
        mockUser,
        5,
      );
    });

    it('nên mặc định limit = 10 nếu query param không được truyền', async () => {
      // Act
      const res = await controller.getLessonJobs('lesson-100', mockUser, undefined);

      // Assert
      expect(res.success).toBe(true);
      expect(mockAnalysisJobService.getRecentJobs).toHaveBeenCalledWith(
        'lesson-100',
        mockUser,
        10,
      );
    });
  });

  describe('getJobDetail', () => {
    it('nên trả về ApiResponse.success với chi tiết job', async () => {
      // Act
      const res = await controller.getJobDetail('lesson-100', 'job-100', mockUser);

      // Assert
      expect(res.success).toBe(true);
      expect(res.data).toEqual(mockJob);
      expect(mockAnalysisJobService.getJobById).toHaveBeenCalledWith(
        'lesson-100',
        'job-100',
        mockUser,
      );
    });
  });

  describe('retryJob', () => {
    it('nên trả về ApiResponse.accepted (202 Accepted) khi yêu cầu retry', async () => {
      // Act
      const res = await controller.retryJob('lesson-100', 'job-100', mockUser);

      // Assert
      expect(res.success).toBe(true);
      expect(res.data?.id).toBe('job-retry-200');
      expect(mockAnalysisJobService.retryJob).toHaveBeenCalledWith(
        'lesson-100',
        'job-100',
        mockUser,
      );
    });
  });
});
