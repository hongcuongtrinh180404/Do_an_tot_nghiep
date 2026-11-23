var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var JobService_1;
import { Injectable, Logger, NotFoundException, ConflictException, } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { createHash, randomUUID } from 'crypto';
import { JobStatusEnum, JobPhaseEnum, } from 'share-lib';
import { BaseService } from '../../base/services/base.service.js';
import { JobRepository } from '../repositories/job.repository.js';
let JobService = JobService_1 = class JobService extends BaseService {
    jobRepository;
    logger = new Logger(JobService_1.name);
    constructor(jobRepository, cls) {
        super(jobRepository, cls, JobService_1.name);
        this.jobRepository = jobRepository;
    }
    async createJob(params, session) {
        const correlationId = params.correlationId || this.getCorrelationId() || randomUUID();
        const parameters = params.parameters || {};
        const requestHash = this.computeHash(parameters);
        if (params.idempotencyKey) {
            const existingKeyJob = await this.jobRepository.findByIdempotencyKey(params.idempotencyKey, session);
            if (existingKeyJob) {
                if (existingKeyJob.requestHash && existingKeyJob.requestHash !== requestHash) {
                    throw new ConflictException('Yêu cầu bị từ chối: Trùng Idempotency-Key nhưng nội dung tham số khác nhau');
                }
                this.logger.log(`[Job] Trùng Idempotency-Key="${params.idempotencyKey}". Trả về Job hiện có: ${existingKeyJob.id}`);
                return existingKeyJob;
            }
        }
        const existingActiveJob = await this.jobRepository.findActiveByLessonAndType(params.lessonId, params.type, session);
        if (existingActiveJob) {
            if (existingActiveJob.requestHash && existingActiveJob.requestHash === requestHash) {
                this.logger.log(`[Job] Đang có Job active cùng tham số cho bài học ${params.lessonId}. Tái sử dụng Job: ${existingActiveJob.id}`);
                return existingActiveJob;
            }
            throw new ConflictException(`Đang có một tác vụ ${params.type} đang chạy cho bài học này (Trạng thái: ${existingActiveJob.status})`);
        }
        const newJobPayload = {
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
    async claimJob(jobId, dispatchSequence, workerId, leaseDurationMs = 90000) {
        const leaseToken = randomUUID();
        const claimedJob = await this.jobRepository.claimJobAtomic(jobId, dispatchSequence, workerId, leaseToken, leaseDurationMs);
        if (!claimedJob) {
            return null;
        }
        this.logger.log(`[Job] Worker "${workerId}" đã claim thành công Job ${jobId} (Lần ${claimedJob.attempts}/${claimedJob.maxAttempts}, LeaseToken: ${leaseToken.slice(0, 8)}...)`);
        return { job: claimedJob, leaseToken };
    }
    async renewLease(jobId, leaseToken, extendMs = 90000) {
        return this.jobRepository.renewLeaseAtomic(jobId, leaseToken, extendMs);
    }
    async completeJob(jobId, leaseToken, resultRef, session) {
        const currentJob = await this.jobRepository.findById(jobId, session);
        if (!currentJob) {
            throw new NotFoundException(`Không tìm thấy Job ${jobId}`);
        }
        if (currentJob.leaseToken !== leaseToken || currentJob.status !== JobStatusEnum.PROCESSING) {
            throw new ConflictException(`Fencing Lỗi: LeaseToken không hợp lệ hoặc Job không còn ở trạng thái PROCESSING`);
        }
        const updatedJob = await this.jobRepository.update(jobId, {
            status: JobStatusEnum.COMPLETED,
            phase: JobPhaseEnum.COMPLETED,
            active: false,
            resultRef: resultRef || null,
            completedAt: new Date(),
        }, session);
        if (!updatedJob) {
            throw new NotFoundException(`Cập nhật Job ${jobId} thất bại`);
        }
        this.logger.log(`[Job] Job ${jobId} đã hoàn tất thành công (COMPLETED).`);
        return updatedJob;
    }
    async updateCheckpoint(jobId, leaseToken, checkpoint, session) {
        const currentJob = await this.jobRepository.findById(jobId, session);
        if (!currentJob) {
            throw new NotFoundException(`Không tìm thấy Job ${jobId}`);
        }
        if (currentJob.leaseToken !== leaseToken || currentJob.status !== JobStatusEnum.PROCESSING) {
            throw new ConflictException(`Fencing Lỗi: LeaseToken không hợp lệ hoặc Job không còn ở trạng thái PROCESSING khi updateCheckpoint`);
        }
        const updatedParameters = {
            ...(currentJob.parameters || {}),
            ...checkpoint,
        };
        const updatedJob = await this.jobRepository.update(jobId, {
            parameters: updatedParameters,
        }, session);
        if (!updatedJob) {
            throw new NotFoundException(`Cập nhật checkpoint cho Job ${jobId} thất bại`);
        }
        this.logger.log(`[Job] Đã lưu checkpoint cho Job ${jobId}: ${JSON.stringify(Object.keys(checkpoint))}`);
        return updatedJob;
    }
    async failJob(jobId, leaseToken, params, session) {
        const currentJob = await this.jobRepository.findById(jobId, session);
        if (!currentJob) {
            throw new NotFoundException(`Không tìm thấy Job ${jobId}`);
        }
        const retryable = params.retryable ?? false;
        const canRetry = retryable && currentJob.attempts < currentJob.maxAttempts;
        if (canRetry) {
            const delayMs = params.retryDelayMs ?? (currentJob.attempts === 1 ? 30000 : 120000);
            const nextRunAt = new Date(Date.now() + delayMs);
            const updatedJob = await this.jobRepository.update(jobId, {
                status: JobStatusEnum.QUEUED,
                phase: JobPhaseEnum.WAITING_RETRY,
                nextRunAt,
                dispatchState: 'pending',
                dispatchSequence: currentJob.dispatchSequence + 1,
                workerId: null,
                leaseToken: null,
                errorCode: params.errorCode,
                errorMessage: params.errorMessage,
            }, session);
            this.logger.warn(`[Job] Job ${jobId} thất bại tạm thời [${params.errorCode}]. Lên lịch retry lần ${currentJob.attempts + 1} sau ${delayMs}ms.`);
            return updatedJob;
        }
        const updatedJob = await this.jobRepository.update(jobId, {
            status: JobStatusEnum.FAILED,
            phase: JobPhaseEnum.FAILED,
            active: false,
            failedAt: new Date(),
            errorCode: params.errorCode,
            errorMessage: params.errorMessage,
        }, session);
        this.logger.error(`[Job] Job ${jobId} thất bại vĩnh viễn [${params.errorCode}]: ${params.errorMessage}`);
        return updatedJob;
    }
    async retryManual(jobId, requestedById) {
        const originalJob = await this.jobRepository.findById(jobId);
        if (!originalJob) {
            throw new NotFoundException(`Không tìm thấy Job ${jobId}`);
        }
        if (originalJob.status !== JobStatusEnum.FAILED) {
            throw new ConflictException('Chỉ có thể thử lại các Job đã ở trạng thái thất bại (FAILED)');
        }
        const existingActive = await this.jobRepository.findActiveByLessonAndType(originalJob.lessonId, originalJob.type);
        if (existingActive) {
            throw new ConflictException(`Đang có một tác vụ ${originalJob.type} khác đang chạy cho bài học này`);
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
        await this.jobRepository.update(newJob.id, {
            retryOfJobId: originalJob.id,
        });
        this.logger.log(`[Job] Đã tạo thủ công Job ${newJob.id} thử lại cho Job cũ ${jobId}`);
        return newJob;
    }
    async getRecentJobsByLesson(lessonId, limit = 10) {
        return this.jobRepository.findRecentJobsByLesson(lessonId, limit);
    }
    async getJobById(jobId) {
        const job = await this.jobRepository.findById(jobId);
        if (!job) {
            throw new NotFoundException(`Không tìm thấy Job ${jobId}`);
        }
        return job;
    }
    computeHash(payload) {
        return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    }
};
JobService = JobService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [JobRepository,
        ClsService])
], JobService);
export { JobService };
//# sourceMappingURL=job.service.js.map