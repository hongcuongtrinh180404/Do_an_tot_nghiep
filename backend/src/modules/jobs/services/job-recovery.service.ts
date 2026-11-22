import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobStatusEnum, JobPhaseEnum } from 'share-lib';
import { JobRepository } from '../repositories/job.repository.js';

@Injectable()
export class JobRecoveryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobRecoveryService.name);
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private isShuttingDown = false;

  constructor(
    private readonly jobRepository: JobRepository,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    const intervalMs = this.configService.get<number>('JOB_RECOVERY_INTERVAL_MS', 30000);
    this.logger.log(`[JobRecovery] Khởi chạy Lease Recovery Scanner (Chu kỳ: ${intervalMs}ms)...`);

    this.timer = setInterval(async () => {
      await this.recoverExpiredJobs();
    }, intervalMs);
  }

  onModuleDestroy(): void {
    this.isShuttingDown = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.logger.log('[JobRecovery] Đã dừng Lease Recovery Scanner an toàn.');
  }

  /**
   * Quét và phục hồi các Job bị quá hạn lease (Worker crash, mất mạng, OOM)
   */
  async recoverExpiredJobs(): Promise<number> {
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
        if (this.isShuttingDown) break;

        try {
          // Trả job về hàng đợi để worker khác xử lý
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
          this.logger.log(
            `[JobRecovery] Đã phục hồi thành công Job ${job.id} [${job.type}] (Worker cũ: ${job.workerId || 'N/A'}, Attempts: ${job.attempts}/${job.maxAttempts})`,
          );
        } catch (recoverErr: any) {
          this.logger.error(
            `[JobRecovery] Lỗi khi phục hồi Job ${job.id}: ${recoverErr?.message}`,
          );
        }
      }
    } catch (err: any) {
      this.logger.error(`[JobRecovery] Lỗi trong chu kỳ quét lease: ${err?.message}`);
    } finally {
      this.isProcessing = false;
    }

    return recoveredCount;
  }
}
