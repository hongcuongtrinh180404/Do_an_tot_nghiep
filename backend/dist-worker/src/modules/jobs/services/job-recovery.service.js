var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var JobRecoveryService_1;
import { Injectable, Logger, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobStatusEnum, JobPhaseEnum } from 'share-lib';
import { JobRepository } from '../repositories/job.repository.js';
let JobRecoveryService = JobRecoveryService_1 = class JobRecoveryService {
    jobRepository;
    configService;
    logger = new Logger(JobRecoveryService_1.name);
    timer = null;
    isProcessing = false;
    isShuttingDown = false;
    constructor(jobRepository, configService) {
        this.jobRepository = jobRepository;
        this.configService = configService;
    }
    onModuleInit() {
        const intervalMs = this.configService.get('JOB_RECOVERY_INTERVAL_MS', 30000);
        this.logger.log(`[JobRecovery] Khởi chạy Lease Recovery Scanner (Chu kỳ: ${intervalMs}ms)...`);
        this.timer = setInterval(async () => {
            await this.recoverExpiredJobs();
        }, intervalMs);
    }
    onModuleDestroy() {
        this.isShuttingDown = true;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.logger.log('[JobRecovery] Đã dừng Lease Recovery Scanner an toàn.');
    }
    async recoverExpiredJobs() {
        if (this.isProcessing || this.isShuttingDown) {
            return 0;
        }
        this.isProcessing = true;
        let recoveredCount = 0;
        try {
            const now = new Date();
            const expiredJobs = await this.jobRepository.findExpiredLeases(now, 10);
            if (!expiredJobs || expiredJobs.length === 0) {
                return 0;
            }
            this.logger.warn(`[JobRecovery] Phát hiện ${expiredJobs.length} job(s) bị quá hạn lease! Đang phục hồi...`);
            for (const job of expiredJobs) {
                if (this.isShuttingDown)
                    break;
                try {
                    await this.jobRepository.update(job.id, {
                        status: JobStatusEnum.QUEUED,
                        phase: JobPhaseEnum.WAITING_RETRY,
                        dispatchState: 'pending',
                        dispatchSequence: job.dispatchSequence + 1,
                        workerId: null,
                        leaseToken: null,
                        leaseExpiresAt: null,
                        heartbeatAt: null,
                    });
                    recoveredCount++;
                    this.logger.log(`[JobRecovery] Đã phục hồi thành công Job ${job.id} [${job.type}] (Worker cũ: ${job.workerId || 'N/A'}, Attempts: ${job.attempts}/${job.maxAttempts})`);
                }
                catch (recoverErr) {
                    this.logger.error(`[JobRecovery] Lỗi khi phục hồi Job ${job.id}: ${recoverErr?.message}`);
                }
            }
        }
        catch (err) {
            this.logger.error(`[JobRecovery] Lỗi trong chu kỳ quét lease: ${err?.message}`);
        }
        finally {
            this.isProcessing = false;
        }
        return recoveredCount;
    }
};
JobRecoveryService = JobRecoveryService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [JobRepository,
        ConfigService])
], JobRecoveryService);
export { JobRecoveryService };
//# sourceMappingURL=job-recovery.service.js.map