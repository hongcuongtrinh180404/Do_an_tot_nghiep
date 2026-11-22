import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import { createHash, randomUUID } from 'crypto';
import {
  IJob,
  JobStatusEnum,
  JobTypeEnum,
  JobPhaseEnum,
} from 'share-lib';
import { BaseService } from '../../base/services/base.service.js';
import { JobRepository } from '../repositories/job.repository.js';

export interface CreateJobParams {
  type: JobTypeEnum;
  lessonId: string;
  courseId: string;
  requestedById: string;
  correlationId?: string;
  idempotencyKey?: string | null;
  parameters?: Record<string, unknown>;
  inputRevision?: number;
  targetRevision?: number;
}

export interface FailJobParams {
  errorCode: string;
  errorMessage: string;
  retryable?: boolean;
  retryDelayMs?: number;
}

@Injectable()
export class JobService extends BaseService<IJob, string> {
  protected override readonly logger = new Logger(JobService.name);

  constructor(
    private readonly jobRepository: JobRepository,
    cls: ClsService,
  ) {
    super(jobRepository, cls, JobService.name);
  }

  /**
   * Tạo Job mới với cơ chế chống trùng hai lớp:
   *  - Lớp 1: Idempotency Key từ client.
   *  - Lớp 2: Kiểm tra Job đang active theo (lessonId, type).
   */
  async createJob(params: CreateJobParams, session?: ClientSession): Promise<IJob> {
    const correlationId = params.correlationId || this.getCorrelationId() || randomUUID();
    const parameters = params.parameters || {};
    const requestHash = this.computeHash(parameters);

    // 1. Kiểm tra Lớp 1: Idempotency Key
    if (params.idempotencyKey) {
      const existingKeyJob = await this.jobRepository.findByIdempotencyKey(
        params.idempotencyKey,
        session,
      );
      if (existingKeyJob) {
        if (existingKeyJob.requestHash && existingKeyJob.requestHash !== requestHash) {
          throw new ConflictException(
            'Yêu cầu bị từ chối: Trùng Idempotency-Key nhưng nội dung tham số khác nhau',
          );
        }
        this.logger.log(`[Job] Trùng Idempotency-Key="${params.idempotencyKey}". Trả về Job hiện có: ${existingKeyJob.id}`);
        return existingKeyJob;
      }
    }

    // 2. Kiểm tra Lớp 2: Job active cùng loại trên bài học
    const existingActiveJob = await this.jobRepository.findActiveByLessonAndType(
      params.lessonId,
      params.type,
      session,
    );

    if (existingActiveJob) {
      if (existingActiveJob.requestHash && existingActiveJob.requestHash === requestHash) {
        this.logger.log(`[Job] Đang có Job active cùng tham số cho bài học ${params.lessonId}. Tái sử dụng Job: ${existingActiveJob.id}`);
        return existingActiveJob;
      }
      throw new ConflictException(
        `Đang có một tác vụ ${params.type} đang chạy cho bài học này (Trạng thái: ${existingActiveJob.status})`,
      );
    }

    // 3. Tạo Job mới bền vững
    const newJobPayload: Partial<IJob> = {
      type: params.type,
      lessonId: params.lessonId,
      courseId: params.courseId,
      requestedById: params.requestedById,
      correlationId,
      idempotencyKey: params.idempotencyKey || null,
      requestHash,
      parameters,
      active: true,
      status: JobStatusEnum.QUEUED,
      phase: JobPhaseEnum.WAITING_DISPATCH,
      attempts: 0,
      maxAttempts: 3,
      nextRunAt: null,
      workerId: null,
      leaseToken: null,
      leaseExpiresAt: null,
      heartbeatAt: null,
      dispatchState: 'pending',
      dispatchSequence: 1,
      inputRevision: params.inputRevision ?? 0,
      targetRevision: params.targetRevision ?? 0,
    };

    const createdJob = await this.repository.create(newJobPayload, session);
    this.logger.log(`[Job] Đã tạo Job ${createdJob.id} [${createdJob.type}] cho bài học ${createdJob.lessonId} (Correlation: ${correlationId})`);
    return createdJob;
  }

  /**
   * Atomic Claim Job: Worker nhận quyền xử lý
   */
  async claimJob(
    jobId: string,
    dispatchSequence: number,
    workerId: string,
    leaseDurationMs = 90000,
  ): Promise<{ job: IJob; leaseToken: string } | null> {
    const leaseToken = randomUUID();
    const claimedJob = await this.jobRepository.claimJobAtomic(
      jobId,
      dispatchSequence,
      workerId,
      leaseToken,
      leaseDurationMs,
    );

    if (!claimedJob) {
      return null;
    }

    this.logger.log(
      `[Job] Worker "${workerId}" đã claim thành công Job ${jobId} (Lần ${claimedJob.attempts}/${claimedJob.maxAttempts}, LeaseToken: ${leaseToken.slice(0, 8)}...)`,
    );
    return { job: claimedJob, leaseToken };
  }

  /**
   * Gia hạn lease token khi Worker đang trong tiến trình gọi AI dài
   */
  async renewLease(jobId: string, leaseToken: string, extendMs = 90000): Promise<boolean> {
    return this.jobRepository.renewLeaseAtomic(jobId, leaseToken, extendMs);
  }

  /**
   * Hoàn tất Job thành công trong Transaction ngắn
   */
  async completeJob(
    jobId: string,
    leaseToken: string,
    resultRef?: Record<string, unknown>,
    session?: ClientSession,
  ): Promise<IJob> {
    const currentJob = await this.jobRepository.findById(jobId, session);
    if (!currentJob) {
      throw new NotFoundException(`Không tìm thấy Job ${jobId}`);
    }

    // Fencing Check: Kiểm tra leaseToken
    if (currentJob.leaseToken !== leaseToken || currentJob.status !== JobStatusEnum.PROCESSING) {
      throw new ConflictException(
        `Fencing Lỗi: LeaseToken không hợp lệ hoặc Job không còn ở trạng thái PROCESSING`,
      );
    }

    const updatedJob = await this.jobRepository.update(
      jobId,
      {
        status: JobStatusEnum.COMPLETED,
        phase: JobPhaseEnum.COMPLETED,
        active: false,
        resultRef: resultRef || null,
        completedAt: new Date(),
      },
      session,
    );

    if (!updatedJob) {
      throw new NotFoundException(`Cập nhật Job ${jobId} thất bại`);
    }

    this.logger.log(`[Job] Job ${jobId} đã hoàn tất thành công (COMPLETED).`);
    return updatedJob;
  }

  /**
   * Đánh dấu Job thất bại hoặc lên lịch retry nếu còn lượt
   */
  async failJob(
    jobId: string,
    leaseToken: string,
    params: FailJobParams,
    session?: ClientSession,
  ): Promise<IJob> {
    const currentJob = await this.jobRepository.findById(jobId, session);
    if (!currentJob) {
      throw new NotFoundException(`Không tìm thấy Job ${jobId}`);
    }

    const retryable = params.retryable ?? false;
    const canRetry = retryable && currentJob.attempts < currentJob.maxAttempts;

    if (canRetry) {
      const delayMs = params.retryDelayMs ?? (currentJob.attempts === 1 ? 30000 : 120000);
      const nextRunAt = new Date(Date.now() + delayMs);

      const updatedJob = await this.jobRepository.update(
        jobId,
        {
          status: JobStatusEnum.QUEUED,
          phase: JobPhaseEnum.WAITING_RETRY,
          nextRunAt,
          dispatchState: 'pending',
          dispatchSequence: currentJob.dispatchSequence + 1,
          workerId: null,
          leaseToken: null,
          errorCode: params.errorCode,
          errorMessage: params.errorMessage,
        },
        session,
      );

      this.logger.warn(
        `[Job] Job ${jobId} thất bại tạm thời [${params.errorCode}]. Lên lịch retry lần ${currentJob.attempts + 1} sau ${delayMs}ms.`,
      );
      return updatedJob!;
    }

    // Thất bại vĩnh viễn (Terminal failed)
    const updatedJob = await this.jobRepository.update(
      jobId,
      {
        status: JobStatusEnum.FAILED,
        phase: JobPhaseEnum.FAILED,
        active: false,
        failedAt: new Date(),
        errorCode: params.errorCode,
        errorMessage: params.errorMessage,
      },
      session,
    );

    this.logger.error(
      `[Job] Job ${jobId} thất bại vĩnh viễn [${params.errorCode}]: ${params.errorMessage}`,
    );
    return updatedJob!;
  }

  /**
   * Tạo lượt thử lại thủ công (Manual Retry) cho một Job đã thất bại
   */
  async retryManual(jobId: string, requestedById: string): Promise<IJob> {
    const originalJob = await this.jobRepository.findById(jobId);
    if (!originalJob) {
      throw new NotFoundException(`Không tìm thấy Job ${jobId}`);
    }

    if (originalJob.status !== JobStatusEnum.FAILED) {
      throw new ConflictException('Chỉ có thể thử lại các Job đã ở trạng thái thất bại (FAILED)');
    }

    // Kiểm tra xem hiện có Job active nào cùng loại đang chạy không
    const existingActive = await this.jobRepository.findActiveByLessonAndType(
      originalJob.lessonId,
      originalJob.type,
    );
    if (existingActive) {
      throw new ConflictException(
        `Đang có một tác vụ ${originalJob.type} khác đang chạy cho bài học này`,
      );
    }

    const newJob = await this.createJob({
      type: originalJob.type,
      lessonId: originalJob.lessonId,
      courseId: originalJob.courseId,
      requestedById,
      correlationId: `retry-${randomUUID()}`,
      parameters: originalJob.parameters,
      inputRevision: originalJob.inputRevision,
      targetRevision: originalJob.targetRevision,
    });

    // Gán tham chiếu retryOfJobId
    await this.jobRepository.update(newJob.id, {
      retryOfJobId: originalJob.id,
    });

    this.logger.log(`[Job] Đã tạo thủ công Job ${newJob.id} thử lại cho Job cũ ${jobId}`);
    return newJob;
  }

  /**
   * Lấy danh sách Job gần nhất theo bài học
   */
  async getRecentJobsByLesson(lessonId: string, limit = 10): Promise<IJob[]> {
    return this.jobRepository.findRecentJobsByLesson(lessonId, limit);
  }

  /**
   * Lấy chi tiết Job theo ID
   */
  async getJobById(jobId: string): Promise<IJob> {
    const job = await this.jobRepository.findById(jobId);
    if (!job) {
      throw new NotFoundException(`Không tìm thấy Job ${jobId}`);
    }
    return job;
  }

  private computeHash(payload: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }
}
