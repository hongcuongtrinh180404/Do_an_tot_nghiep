import { Injectable, NotFoundException } from '@nestjs/common';
import { IUserProfile, IJob } from 'share-lib';
import { JobService } from '../../jobs/services/job.service.js';
import { JobManagementPolicy } from '../policies/job-management.policy.js';

@Injectable()
export class AnalysisJobService {
  constructor(
    private readonly jobService: JobService,
    private readonly jobManagementPolicy: JobManagementPolicy,
  ) {}

  /**
   * Lấy danh sách Job của bài học (cho phép xem kể cả khi khóa học PENDING_APPROVAL)
   */
  async getRecentJobs(
    lessonId: string,
    user: Pick<IUserProfile, 'id' | 'role'>,
    limit = 10,
  ): Promise<IJob[]> {
    await this.jobManagementPolicy.verifyLessonAccess(lessonId, user, {
      allowPendingApproval: true,
    });

    return this.jobService.getRecentJobsByLesson(lessonId, limit);
  }

  /**
   * Lấy chi tiết Job theo ID
   */
  async getJobById(
    lessonId: string,
    jobId: string,
    user: Pick<IUserProfile, 'id' | 'role'>,
  ): Promise<IJob> {
    await this.jobManagementPolicy.verifyLessonAccess(lessonId, user, {
      allowPendingApproval: true,
    });

    const job = await this.jobService.getJobById(jobId);
    if (job.lessonId !== lessonId) {
      throw new NotFoundException(`Job ${jobId} không thuộc bài học ${lessonId}`);
    }

    return job;
  }

  /**
   * Yêu cầu retry thủ công một Job đã thất bại
   */
  async retryJob(
    lessonId: string,
    jobId: string,
    user: Pick<IUserProfile, 'id' | 'role'>,
  ): Promise<IJob> {
    // Không cho phép retry khi khóa học đang chờ duyệt
    await this.jobManagementPolicy.verifyLessonAccess(lessonId, user, {
      allowPendingApproval: false,
    });

    const job = await this.jobService.getJobById(jobId);
    if (job.lessonId !== lessonId) {
      throw new NotFoundException(`Job ${jobId} không thuộc bài học ${lessonId}`);
    }

    return this.jobService.retryManual(jobId, user.id);
  }
}
