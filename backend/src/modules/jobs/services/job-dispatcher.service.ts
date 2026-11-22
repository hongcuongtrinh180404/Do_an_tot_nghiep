import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMqService } from '../../messaging/rabbitmq.service.js';
import { JobRepository } from '../repositories/job.repository.js';

export interface JobMessagePayload {
  version: number;
  jobId: string;
  dispatchSequence: number;
  type: string;
  correlationId: string;
}

@Injectable()
export class JobDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobDispatcherService.name);
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private isShuttingDown = false;

  constructor(
    private readonly jobRepository: JobRepository,
    private readonly rabbitMqService: RabbitMqService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.configService.get<number>('JOB_DISPATCH_INTERVAL_MS', 3000);
    this.logger.log(`[JobDispatcher] Khởi chạy Outbox Dispatcher (Chu kỳ: ${intervalMs}ms)...`);

    this.timer = setInterval(async () => {
      await this.dispatchPendingJobs();
    }, intervalMs);
  }

  onModuleDestroy(): void {
    this.isShuttingDown = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.logger.log('[JobDispatcher] Đã dừng Outbox Dispatcher an toàn.');
  }

  /**
   * Quét các Job có dispatchState = 'pending' và publish sang RabbitMQ
   */
  async dispatchPendingJobs(): Promise<number> {
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
        if (this.isShuttingDown) break;

        const routingKey = `ai.${job.type}`;
        const messagePayload: JobMessagePayload = {
          version: 1,
          jobId: job.id,
          dispatchSequence: job.dispatchSequence,
          type: job.type,
          correlationId: job.correlationId,
        };

        try {
          const published = await this.rabbitMqService.publish(
            routingKey,
            messagePayload,
            {
              correlationId: job.correlationId,
              messageId: `${job.id}-${job.dispatchSequence}`,
              mandatory: true,
            },
          );

          if (published) {
            await this.jobRepository.markDispatched(job.id, job.dispatchSequence);
            dispatchedCount++;
            this.logger.log(
              `[JobDispatcher] Đã dispatch thành công Job ${job.id} [${job.type}] -> RoutingKey: ${routingKey}`,
            );
          }
        } catch (pubErr: any) {
          this.logger.warn(
            `[JobDispatcher] Không thể dispatch Job ${job.id} sang RabbitMQ: ${pubErr?.message}. Sẽ thử lại ở chu kỳ tiếp theo.`,
          );
        }
      }
    } catch (err: any) {
      this.logger.error(`[JobDispatcher] Lỗi trong chu kỳ quét outbox: ${err?.message}`);
    } finally {
      this.isProcessing = false;
    }

    return dispatchedCount;
  }
}
