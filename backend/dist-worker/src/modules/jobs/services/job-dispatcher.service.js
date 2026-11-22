var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var JobDispatcherService_1;
import { Injectable, Logger, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMqService } from '../../messaging/rabbitmq.service.js';
import { JobRepository } from '../repositories/job.repository.js';
let JobDispatcherService = JobDispatcherService_1 = class JobDispatcherService {
    jobRepository;
    rabbitMqService;
    configService;
    logger = new Logger(JobDispatcherService_1.name);
    timer = null;
    isProcessing = false;
    isShuttingDown = false;
    constructor(jobRepository, rabbitMqService, configService) {
        this.jobRepository = jobRepository;
        this.rabbitMqService = rabbitMqService;
        this.configService = configService;
    }
    onModuleInit() {
        const intervalMs = this.configService.get('JOB_DISPATCH_INTERVAL_MS', 3000);
        this.logger.log(`[JobDispatcher] Khởi chạy Outbox Dispatcher (Chu kỳ: ${intervalMs}ms)...`);
        this.timer = setInterval(async () => {
            await this.dispatchPendingJobs();
        }, intervalMs);
    }
    onModuleDestroy() {
        this.isShuttingDown = true;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.logger.log('[JobDispatcher] Đã dừng Outbox Dispatcher an toàn.');
    }
    async dispatchPendingJobs() {
        if (this.isProcessing || this.isShuttingDown) {
            return 0;
        }
        this.isProcessing = true;
        let dispatchedCount = 0;
        try {
            const pendingJobs = await this.jobRepository.findPendingDispatches(10, new Date());
            if (!pendingJobs || pendingJobs.length === 0) {
                return 0;
            }
            this.logger.debug(`[JobDispatcher] Tìm thấy ${pendingJobs.length} job(s) đang chờ dispatch.`);
            for (const job of pendingJobs) {
                if (this.isShuttingDown)
                    break;
                const routingKey = `ai.${job.type}`;
                const messagePayload = {
                    version: 1,
                    jobId: job.id,
                    dispatchSequence: job.dispatchSequence,
                    type: job.type,
                    correlationId: job.correlationId,
                };
                try {
                    const published = await this.rabbitMqService.publish(routingKey, messagePayload, {
                        correlationId: job.correlationId,
                        messageId: `${job.id}-${job.dispatchSequence}`,
                        mandatory: true,
                    });
                    if (published) {
                        await this.jobRepository.markDispatched(job.id, job.dispatchSequence);
                        dispatchedCount++;
                        this.logger.log(`[JobDispatcher] Đã dispatch thành công Job ${job.id} [${job.type}] -> RoutingKey: ${routingKey}`);
                    }
                }
                catch (pubErr) {
                    this.logger.warn(`[JobDispatcher] Không thể dispatch Job ${job.id} sang RabbitMQ: ${pubErr?.message}. Sẽ thử lại ở chu kỳ tiếp theo.`);
                }
            }
        }
        catch (err) {
            this.logger.error(`[JobDispatcher] Lỗi trong chu kỳ quét outbox: ${err?.message}`);
        }
        finally {
            this.isProcessing = false;
        }
        return dispatchedCount;
    }
};
JobDispatcherService = JobDispatcherService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [JobRepository,
        RabbitMqService,
        ConfigService])
], JobDispatcherService);
export { JobDispatcherService };
//# sourceMappingURL=job-dispatcher.service.js.map