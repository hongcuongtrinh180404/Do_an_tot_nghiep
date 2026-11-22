import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { RoleEnum, JobStatusEnum, JobTypeEnum, JobPhaseEnum, IJob, IUserProfile } from 'share-lib';
import { AnalysisJobService } from '../services/analysis-job.service.js';
import { JobService } from '../../jobs/services/job.service.js';
import { JobManagementPolicy } from '../policies/job-management.policy.js';

describe('AnalysisJobService (Unit Test)', () => {
  let service: AnalysisJobService;
  let mockJobService: Partial<Record<keyof JobService, ReturnType<typeof vi.fn>>>;
  let mockPolicy: Partial<Record<keyof JobManagementPolicy, ReturnType<typeof vi.fn>>>;

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
    status: JobStatusEnum.FAILED,
    phase: JobPhaseEnum.WAITING_DISPATCH,
    attempts: 3,
    maxAttempts: 3,
    dispatchState: 'dispatched',
    dispatchSequence: 1,
    inputRevision: 0,
    targetRevision: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockJobService = {
      getRecentJobsByLesson: vi.fn().mockResolvedValue([mockJob]),
      getJobById: vi.fn().mockResolvedValue(mockJob),
      retryManual: vi.fn().mockResolvedValue({
        ...mockJob,
        id: 'job-new-200',
        status: JobStatusEnum.QUEUED,
        active: true,
      }),
    };

    mockPolicy = {
      verifyLessonAccess: vi.fn().mockResolvedValue({
        lesson: { id: 'lesson-100' },
        section: { id: 'section-100' },
        course: { id: 'course-100' },
      }),
    };

    service = new AnalysisJobService(
      mockJobService as unknown as JobService,
      mockPolicy as unknown as JobManagementPolicy,
    );
  });

  describe('getRecentJobs', () => {
    it('nên xác thực quyền với allowPendingApproval = true và lấy danh sách jobs', async () => {
      // Act
      const res = await service.getRecentJobs('lesson-100', mockUser, 5);

      // Assert
      expect(mockPolicy.verifyLessonAccess).toHaveBeenCalledWith('lesson-100', mockUser, {
        allowPendingApproval: true,
      });
      expect(mockJobService.getRecentJobsByLesson).toHaveBeenCalledWith('lesson-100', 5);
      expect(res).toEqual([mockJob]);
    });
  });

  describe('getJobById', () => {
    it('nên trả về Job khi bài học khớp', async () => {
      // Act
      const res = await service.getJobById('lesson-100', 'job-100', mockUser);

      // Assert
      expect(mockPolicy.verifyLessonAccess).toHaveBeenCalledWith('lesson-100', mockUser, {
        allowPendingApproval: true,
      });
      expect(mockJobService.getJobById).toHaveBeenCalledWith('job-100');
      expect(res).toEqual(mockJob);
    });

    it('nên ném NotFoundException nếu Job không thuộc về lessonId được yêu cầu', async () => {
      // Arrange
      mockJobService.getJobById = vi.fn().mockResolvedValue({
        ...mockJob,
        lessonId: 'other-lesson',
      });

      // Act & Assert
      await expect(
        service.getJobById('lesson-100', 'job-100', mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('retryJob', () => {
    it('nên xác thực quyền với allowPendingApproval = false và gọi retryManual', async () => {
      // Act
      const res = await service.retryJob('lesson-100', 'job-100', mockUser);

      // Assert
      expect(mockPolicy.verifyLessonAccess).toHaveBeenCalledWith('lesson-100', mockUser, {
        allowPendingApproval: false,
      });
      expect(mockJobService.retryManual).toHaveBeenCalledWith('job-100', mockUser.id);
      expect(res.id).toBe('job-new-200');
    });

    it('nên ném NotFoundException khi Job không thuộc về lessonId khi retry', async () => {
      // Arrange
      mockJobService.getJobById = vi.fn().mockResolvedValue({
        ...mockJob,
        lessonId: 'other-lesson',
      });

      // Act & Assert
      await expect(
        service.retryJob('lesson-100', 'job-100', mockUser),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
