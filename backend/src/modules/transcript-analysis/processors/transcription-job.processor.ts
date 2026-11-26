import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { randomUUID } from 'crypto';
import {
  JobTypeEnum,
  JobStatusEnum,
  LessonTranscriptionStatusEnum,
} from 'share-lib';
import { RabbitMqService, RabbitMqMessage } from '../../messaging/rabbitmq.service.js';
import { RABBITMQ_CONSTANTS } from '../../messaging/rabbitmq-topology.js';
import { JobService } from '../../jobs/services/job.service.js';
import { JobRepository } from '../../jobs/repositories/job.repository.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonTranscriptRepository } from '../../course/repositories/lesson-transcript.repository.js';
import { AudioExtractorService } from '../../course/services/audio-extractor.service.js';
import { AssemblyAiService } from '../../assemblyai/assemblyai.service.js';
import { StorageService } from '../../storage/storage.service.js';
import { JobMessagePayload } from '../../jobs/services/job-dispatcher.service.js';
import { AutomaticAnalysisService } from '../services/automatic-analysis.service.js';

@Injectable()
export class TranscriptionJobProcessor implements OnModuleInit {
  private readonly logger = new Logger(TranscriptionJobProcessor.name);

  constructor(
    private readonly rabbitMqService: RabbitMqService,
    private readonly configService: ConfigService,
    private readonly jobService: JobService,
    private readonly jobRepository: JobRepository,
    private readonly lessonRepo: LessonRepository,
    private readonly lessonTranscriptRepo: LessonTranscriptRepository,
    private readonly audioExtractorService: AudioExtractorService,
    private readonly assemblyAiService: AssemblyAiService,
    private readonly storageService: StorageService,
    @InjectConnection() private readonly connection: Connection,
    private readonly automaticAnalysis: AutomaticAnalysisService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.IS_WORKER !== 'true') {
      this.logger.log(
        '[TranscriptionJobProcessor] Đang chạy trong API context, bỏ qua đăng ký RabbitMQ consumer.',
      );
      return;
    }

    const queueName = this.configService.get<string>(
      'RABBITMQ_TRANSCRIPTION_QUEUE',
      RABBITMQ_CONSTANTS.QUEUE_TRANSCRIPTION,
    );
    const prefetch = this.configService.get<number>('TRANSCRIPTION_PREFETCH', 1);

    this.logger.log(
      `[TranscriptionJobProcessor] Đăng ký consumer cho queue "${queueName}" (Prefetch: ${prefetch})...`,
    );

    await this.rabbitMqService.createConsumer<JobMessagePayload>(
      queueName,
      async (msg) => {
        await this.handleMessage(msg);
      },
      { prefetch },
    );
  }

  /**
   * Bộ điều phối xử lý message từ hàng đợi transcription
   */
  async handleMessage(msg: RabbitMqMessage<JobMessagePayload>): Promise<void> {
    const payload = msg.content;
    if (!payload?.jobId || payload?.type !== JobTypeEnum.TRANSCRIPTION) {
      this.logger.warn(
        `[TranscriptionJobProcessor] Bỏ qua message không hợp lệ (jobId: ${payload?.jobId}, type: ${payload?.type})`,
      );
      msg.ack();
      return;
    }

    await this.processTranscriptionJob(msg);
  }

  /**
   * Xử lý tác vụ trích xuất transcript từ video
   */
  async processTranscriptionJob(msg: RabbitMqMessage<JobMessagePayload>): Promise<void> {
    const { jobId, dispatchSequence } = msg.content;
    const workerId = `worker-transcription-${process.pid}-${randomUUID().slice(0, 8)}`;

    // 1. Kiểm tra trạng thái hiện thời của Job
    const existingJob = await this.jobRepository.findById(jobId);
    if (!existingJob) {
      this.logger.warn(`[TranscriptionJobProcessor] Không tìm thấy Job ${jobId}. Gửi ACK.`);
      msg.ack();
      return;
    }

    // Failsafe Crash-after-commit: Job đã COMPLETED thì ACK ngay, không chạy lại
    if (existingJob.status === JobStatusEnum.COMPLETED) {
      this.logger.log(
        `[TranscriptionJobProcessor] Job ${jobId} đã hoàn tất từ trước. Bỏ qua và gửi ACK.`,
      );
      msg.ack();
      return;
    }

    // 2. Atomic Claim Job với lease 120s
    const claim = await this.jobService.claimJob(jobId, dispatchSequence, workerId, 120000);
    if (!claim) {
      this.logger.warn(
        `[TranscriptionJobProcessor] Claim thất bại cho Job ${jobId} (đã được worker khác claim hoặc obsolete sequence). Gửi ACK.`,
      );
      msg.ack();
      return;
    }

    const { job, leaseToken } = claim;

    // 3. Thiết lập Heartbeat timer định kỳ (mỗi 25s)
    const heartbeatTimer = setInterval(async () => {
      try {
        const renewed = await this.jobService.renewLease(job.id, leaseToken, 120000);
        if (!renewed) {
          this.logger.warn(`[TranscriptionJobProcessor] Gia hạn lease thất bại cho Job ${job.id}`);
        }
      } catch (e: unknown) {
        const errMessage = e instanceof Error ? e.message : String(e);
        this.logger.error(`[TranscriptionJobProcessor] Lỗi gia hạn lease: ${errMessage}`);
      }
    }, 25000);

    let tempMp3Path: string | null = null;

    try {
      // 4. Pre-checks: Kiểm tra bài học tồn tại
      const lesson = await this.lessonRepo.findById(job.lessonId);
      if (!lesson) {
        await this.jobService.failJob(job.id, leaseToken, {
          errorCode: 'LESSON_NOT_FOUND',
          errorMessage: 'Không tìm thấy bài học tương ứng với tác vụ transcript',
          retryable: false,
        });
        msg.ack();
        return;
      }

      // Cập nhật trạng thái bài học và transcript sang TRANSCRIBING
      await this.lessonRepo.update(job.lessonId, {
        transcriptionStatus: LessonTranscriptionStatusEnum.TRANSCRIBING,
      });
      await this.lessonTranscriptRepo.upsertByLessonId(job.lessonId, {
        status: LessonTranscriptionStatusEnum.TRANSCRIBING,
        failureReason: null,
      });

      // 5. Kiểm tra Checkpoint bền vững: Đã submit AssemblyAI chưa?
      let externalTranscriptId: string | null =
        typeof job.parameters?.externalTranscriptId === 'string'
          ? (job.parameters.externalTranscriptId as string).trim()
          : null;

      if (!externalTranscriptId) {
        // Chưa có checkpoint -> Cần trích xuất MP3 và upload submit AssemblyAI
        const videoKey =
          (job.parameters?.videoKey as string) ||
          lesson.content?.publicId ||
          lesson.content?.url;

        if (!videoKey) {
          await this.jobService.failJob(job.id, leaseToken, {
            errorCode: 'VIDEO_SOURCE_MISSING',
            errorMessage: 'Bài học không có thông tin nguồn video (publicId hoặc url)',
            retryable: false,
          });
          await this.lessonRepo.update(job.lessonId, {
            transcriptionStatus: LessonTranscriptionStatusEnum.FAILED,
          });
          await this.lessonTranscriptRepo.updateStatusByLessonId(
            job.lessonId,
            LessonTranscriptionStatusEnum.FAILED,
            'Nguồn video bị thiếu',
          );
          msg.ack();
          return;
        }

        let presignedVideoUrl = videoKey;
        if (!videoKey.startsWith('http://') && !videoKey.startsWith('https://')) {
          presignedVideoUrl = await this.storageService.getPresignedStreamUrl(videoKey, 3600);
        }

        // a. FFmpeg tách MP3 qua Semaphore
        tempMp3Path = await this.audioExtractorService.extractMp3FromVideo(
          presignedVideoUrl,
          job.lessonId,
        );

        // b. Upload và Submit AssemblyAI
        const languageCode = (job.parameters?.languageCode as string) || 'vi';
        externalTranscriptId = await this.assemblyAiService.submitTranscriptFile(tempMp3Path, {
          languageCode,
        });

        // c. Lưu Checkpoint ngay lập tức
        await this.jobService.updateCheckpoint(job.id, leaseToken, {
          externalTranscriptId,
        });

        // d. Xóa tệp MP3 tạm ngay sau khi submit thành công
        await this.audioExtractorService.cleanupTempFile(tempMp3Path);
        tempMp3Path = null;
      } else {
        this.logger.log(
          `[TranscriptionJobProcessor] Resume từ Checkpoint: externalTranscriptId="${externalTranscriptId}" cho Job ${job.id}. Bỏ qua FFmpeg và upload!`,
        );
      }

      // 6. Polling AssemblyAI với timeout 15 phút
      const result = await this.assemblyAiService.pollTranscript(externalTranscriptId);

      // 7. Short Atomic Transaction (< 100ms) để commit toàn bộ dữ liệu
      const session = await this.connection.startSession();
      try {
        await session.withTransaction(async () => {
          // a. Upsert LessonTranscript
          await this.lessonTranscriptRepo.upsertByLessonId(
            job.lessonId,
            {
              rawTranscript: result.rawTranscript,
              sentences: result.sentences,
              durationSeconds: result.durationSeconds,
              languageCode: result.languageCode,
              externalTranscriptId: result.transcriptId,
              status: LessonTranscriptionStatusEnum.READY,
              failureReason: null,
            },
            session,
          );

          // b. Cập nhật Lesson: transcriptionStatus READY, duration, và tăng analysisInputRevision
          const currentLesson = await this.lessonRepo.findById(job.lessonId, session);
          const updatedContent = currentLesson?.content
            ? { ...currentLesson.content, duration: result.durationSeconds }
            : null;

          const lessonUpdatePayload: Record<string, unknown> = {
            transcriptionStatus: LessonTranscriptionStatusEnum.READY,
          };
          if (updatedContent) {
            lessonUpdatePayload.content = updatedContent;
          }

          await this.lessonRepo.update(job.lessonId, lessonUpdatePayload, session);
          const revision = await this.lessonRepo.incrementInputRevision(job.lessonId, session);

          // Commit the three independent outbox jobs with the READY transcript.
          if (revision != null &&
            (result.rawTranscript.trim() || result.sentences.some((sentence) => sentence.text.trim()))) {
            await this.automaticAnalysis.enqueueMissing({
              lessonId: job.lessonId,
              courseId: job.courseId,
              requestedById: job.requestedById,
              inputRevision: revision,
            }, currentLesson?.analysisOutputRevisions, session);
          }

          // c. Complete Job
          await this.jobService.completeJob(
            job.id,
            leaseToken,
            {
              transcriptId: result.transcriptId,
              durationSeconds: result.durationSeconds,
              sentenceCount: result.sentences.length,
            },
            session,
          );
        });
      } finally {
        await session.endSession();
      }

      this.logger.log(
        `[TranscriptionJobProcessor] Hoàn tất trích xuất transcript thành công cho bài học ${job.lessonId} (Job: ${job.id})`,
      );
      msg.ack();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `[TranscriptionJobProcessor] Lỗi khi xử lý Job transcript ${job.id}: ${errorMsg}`,
        err,
      );

      // Phân loại lỗi
      const isTransient =
        errorMsg.includes('ECONNRESET') ||
        errorMsg.includes('ETIMEDOUT') ||
        errorMsg.includes('503') ||
        errorMsg.includes('502') ||
        errorMsg.includes('429') ||
        errorMsg.includes('timed out');

      await this.jobService.failJob(job.id, leaseToken, {
        errorCode: isTransient ? 'TRANSCRIPTION_TRANSIENT_ERROR' : 'TRANSCRIPTION_FAILED',
        errorMessage: errorMsg,
        retryable: isTransient,
      });

      if (!isTransient) {
        // Đánh dấu FAILED vĩnh viễn
        await this.lessonRepo.update(job.lessonId, {
          transcriptionStatus: LessonTranscriptionStatusEnum.FAILED,
        });
        await this.lessonTranscriptRepo.updateStatusByLessonId(
          job.lessonId,
          LessonTranscriptionStatusEnum.FAILED,
          errorMsg,
        );
      }

      msg.ack();
    } finally {
      clearInterval(heartbeatTimer);
      if (tempMp3Path) {
        await this.audioExtractorService.cleanupTempFile(tempMp3Path);
      }
    }
  }
}
