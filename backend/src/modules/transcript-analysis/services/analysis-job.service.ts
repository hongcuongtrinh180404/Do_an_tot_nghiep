import { Injectable, NotFoundException } from '@nestjs/common';
import { IUserProfile, IJob, RoleEnum, JobTypeEnum } from 'share-lib';
import { JobService } from '../../jobs/services/job.service.js';
import { JobManagementPolicy } from '../policies/job-management.policy.js';
import { GenerateSummaryDto } from '../dto/generate-summary.dto.js';
import { GenerateQuizDto } from '../dto/generate-quiz.dto.js';
import { GenerateMindmapDto } from '../dto/generate-mindmap.dto.js';

export interface EnqueueSummaryJobParams {
  lessonId: string;
  dto?: GenerateSummaryDto;
  idempotencyKey?: string | null;
  userId: string;
}

export interface EnqueueQuizJobParams {
  lessonId: string;
  dto?: GenerateQuizDto;
  idempotencyKey?: string | null;
  userId: string;
}

export interface EnqueueMindmapJobParams {
  lessonId: string;
  dto?: GenerateMindmapDto;
  idempotencyKey?: string | null;
  userId: string;
}

@Injectable()
export class AnalysisJobService {
  constructor(
    private readonly jobService: JobService,
    private readonly jobManagementPolicy: JobManagementPolicy,
  ) {}

  /**
   * Đưa tác vụ sinh tóm tắt bài học (Summary) vào hàng đợi Job bất đồng bộ
   */
  async enqueueSummaryJob(params: EnqueueSummaryJobParams): Promise<IJob> {
    const { lesson, course } = await this.jobManagementPolicy.verifyLessonAccess(
      params.lessonId,
      { id: params.userId, role: RoleEnum.INSTRUCTOR },
      { allowPendingApproval: false },
    );

    const inputRevision = lesson.analysisInputRevision ?? 0;
    const targetRevision = lesson.analysisOutputRevisions?.summary ?? 0;

    return this.jobService.createJob({
      type: JobTypeEnum.SUMMARY,
      lessonId: params.lessonId,
      courseId: course.id,
      requestedById: params.userId,
      idempotencyKey: params.idempotencyKey || null,
      parameters: (params.dto || {}) as Record<string, unknown>,
      inputRevision,
      targetRevision,
    });
  }

  /**
   * Đưa tác vụ sinh câu hỏi trắc nghiệm (Quiz) vào hàng đợi Job bất đồng bộ
   */
  async enqueueQuizJob(params: EnqueueQuizJobParams): Promise<IJob> {
    const { lesson, course } = await this.jobManagementPolicy.verifyLessonAccess(
      params.lessonId,
      { id: params.userId, role: RoleEnum.INSTRUCTOR },
      { allowPendingApproval: false },
    );

    const inputRevision = lesson.analysisInputRevision ?? 0;
    const targetRevision = lesson.analysisOutputRevisions?.quiz ?? 0;

    return this.jobService.createJob({
      type: JobTypeEnum.QUIZ,
      lessonId: params.lessonId,
      courseId: course.id,
      requestedById: params.userId,
      idempotencyKey: params.idempotencyKey || null,
      parameters: (params.dto || {}) as Record<string, unknown>,
      inputRevision,
      targetRevision,
    });
  }

  /**
   * Đưa tác vụ sinh sơ đồ tư duy (Mindmap) vào hàng đợi Job bất đồng bộ
   */
  async enqueueMindmapJob(params: EnqueueMindmapJobParams): Promise<IJob> {
    const { lesson, course } = await this.jobManagementPolicy.verifyLessonAccess(
      params.lessonId,
      { id: params.userId, role: RoleEnum.INSTRUCTOR },
      { allowPendingApproval: false },
    );

    const inputRevision = lesson.analysisInputRevision ?? 0;
    const targetRevision = lesson.analysisOutputRevisions?.mindmap ?? 0;

    return this.jobService.createJob({
      type: JobTypeEnum.MINDMAP,
      lessonId: params.lessonId,
      courseId: course.id,
      requestedById: params.userId,
      idempotencyKey: params.idempotencyKey || null,
      parameters: (params.dto || {}) as Record<string, unknown>,
      inputRevision,
      targetRevision,
    });
  }

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
