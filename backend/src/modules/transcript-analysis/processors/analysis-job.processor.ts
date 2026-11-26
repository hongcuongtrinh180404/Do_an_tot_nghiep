import {
  Injectable,
  Logger,
  OnModuleInit,
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import type { ClientSession, Connection } from 'mongoose';
import { randomUUID } from 'crypto';
import {
  JobTypeEnum,
  JobStatusEnum,
  RoleEnum,
  ILessonSummary,
  ILessonMindmap,
  LessonTranscriptionStatusEnum,
  type IJob,
} from 'share-lib';
import { RabbitMqService, RabbitMqMessage } from '../../messaging/rabbitmq.service.js';
import { RABBITMQ_CONSTANTS } from '../../messaging/rabbitmq-topology.js';
import { JobService } from '../../jobs/services/job.service.js';
import { JobRepository } from '../../jobs/repositories/job.repository.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonSummaryRepository } from '../../course/repositories/lesson-summary.repository.js';
import { LessonQuizRepository } from '../../course/repositories/lesson-quiz.repository.js';
import { LessonQuizDraftRepository } from '../../course/repositories/lesson-quiz-draft.repository.js';
import { LessonMindmapRepository } from '../../course/repositories/lesson-mindmap.repository.js';
import { SummaryGenerationService } from '../services/summary-generation.service.js';
import { QuizGenerationService } from '../services/quiz-generation.service.js';
import { MindmapAnalysisService } from '../services/mindmap-analysis.service.js';
import { JobManagementPolicy } from '../policies/job-management.policy.js';
import { GenerateSummaryDto } from '../dto/generate-summary.dto.js';
import { GenerateQuizDto } from '../dto/generate-quiz.dto.js';
import { GenerateMindmapDto } from '../dto/generate-mindmap.dto.js';
import { JobMessagePayload } from '../../jobs/services/job-dispatcher.service.js';
import { GeminiBaseException } from '../../gemini/gemini.errors.js';
import { BundleAnalysisService } from '../services/bundle-analysis.service.js';

@Injectable()
export class AnalysisJobProcessor implements OnModuleInit {
  private readonly logger = new Logger(AnalysisJobProcessor.name);

  constructor(
    private readonly rabbitMqService: RabbitMqService,
    private readonly configService: ConfigService,
    private readonly jobService: JobService,
    private readonly jobRepository: JobRepository,
    private readonly lessonRepo: LessonRepository,
    private readonly lessonSummaryRepo: LessonSummaryRepository,
    private readonly summaryGenerationService: SummaryGenerationService,
    private readonly quizGenerationService: QuizGenerationService,
    private readonly mindmapAnalysisService: MindmapAnalysisService,
    private readonly lessonQuizRepo: LessonQuizRepository,
    private readonly lessonQuizDraftRepo: LessonQuizDraftRepository,
    private readonly lessonMindmapRepo: LessonMindmapRepository,
    private readonly jobManagementPolicy: JobManagementPolicy,
    @InjectConnection() private readonly connection: Connection,
    private readonly bundleAnalysisService: BundleAnalysisService,
  ) { }

  async onModuleInit(): Promise<void> {
    if (process.env.IS_WORKER !== 'true') {
      this.logger.log(
        '[AnalysisJobProcessor] Đang chạy trong API context, bỏ qua đăng ký RabbitMQ consumer.',
      );
      return;
    }

    const queueName = this.configService.get<string>(
      'RABBITMQ_AI_QUEUE',
      RABBITMQ_CONSTANTS.QUEUE_AI,
    );
    const prefetch = this.configService.get<number>('AI_PREFETCH', 3);

    this.logger.log(
      `[AnalysisJobProcessor] Đăng ký consumer cho queue "${queueName}" (Prefetch: ${prefetch})...`,
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
   * Bộ điều phối xử lý message từ hàng đợi AI
   */
  async handleMessage(msg: RabbitMqMessage<JobMessagePayload>): Promise<void> {
    const payload = msg.content;
    if (!payload?.jobId || !payload?.type) {
      this.logger.warn(
        `[AnalysisJobProcessor] Bỏ qua message không hợp lệ (thiếu jobId hoặc type)`,
      );
      msg.ack();
      return;
    }

    if (payload.type === JobTypeEnum.SUMMARY) {
      await this.processSummaryJob(msg);
    } else if (payload.type === JobTypeEnum.QUIZ) {
      await this.processQuizJob(msg);
    } else if (payload.type === JobTypeEnum.MINDMAP) {
      await this.processMindmapJob(msg);
    } else if (payload.type === JobTypeEnum.ANALYSIS_BUNDLE) {
      await this.processBundleJob(msg);
    } else {
      this.logger.debug(
        `[AnalysisJobProcessor] Bỏ qua tác vụ chưa kích hoạt ở phase này: type="${payload.type}"`,
      );
      msg.ack();
    }
  }

  private async processBundleJob(msg: RabbitMqMessage<JobMessagePayload>): Promise<void> {
    const { jobId, dispatchSequence } = msg.content;
    const existing = await this.jobRepository.findById(jobId);
    if (existing?.type !== JobTypeEnum.ANALYSIS_BUNDLE) {
      msg.ack();
      return;
    }
    const claim = await this.jobService.claimJob(
      jobId, dispatchSequence, `worker-bundle-${process.pid}-${randomUUID()}`, 90000,
    );
    if (!claim) {
      msg.ack();
      return;
    }
    const { job, leaseToken } = claim;
    const heartbeat = setInterval(() => {
      void this.jobService.renewLease(jobId, leaseToken, 90000).catch((error: unknown) => {
        this.logger.warn(`Không thể gia hạn lease cho tác vụ phân tích ${jobId}: ${String(error)}`);
      });
    }, 20000);
    try {
      const bundle = await this.bundleAnalysisService.generate(job);
      await this.withBundleLease(jobId, leaseToken, async (session) => {
        const result = await this.bundleAnalysisService.persist(job, bundle, session);
        await this.jobService.completeJob(jobId, leaseToken, result, session);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Phân tích tự động thất bại cho tác vụ ${jobId}: ${message}`);
      await this.withBundleLease(jobId, leaseToken, async (session) => {
        await this.jobService.failJob(jobId, leaseToken, {
          errorCode: error instanceof ConflictException ? 'ANALYSIS_INPUT_CHANGED' : 'ANALYSIS_BUNDLE_FAILED',
          errorMessage: message,
          retryable: error instanceof UnprocessableEntityException ||
            (error instanceof GeminiBaseException && error.retryable),
        }, session);
      });
    } finally {
      clearInterval(heartbeat);
    }
    msg.ack();
  }

  private async withBundleLease(
    jobId: string,
    leaseToken: string,
    run: (session: ClientSession) => Promise<void>,
  ): Promise<void> {
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        const current = await this.jobRepository.findById(jobId, session);
        if (current?.status === JobStatusEnum.PROCESSING && current.leaseToken === leaseToken) {
          await run(session);
        }
      });
    } finally {
      await session.endSession();
    }
  }

  private async verifyAutomaticInput(job: IJob, session?: ClientSession): Promise<void> {
    const lesson = await this.jobManagementPolicy.verifyAutomaticAnalysis(job.lessonId, job.courseId, session);
    if ((lesson.analysisInputRevision ?? 0) !== job.inputRevision ||
      lesson.transcriptionStatus !== LessonTranscriptionStatusEnum.READY) {
      throw new ConflictException('Transcript đã thay đổi hoặc không còn sẵn sàng.');
    }
  }

  private async verifyJobAccess(job: IJob): Promise<void> {
    if (job.parameters?.automatic === true) {
      await this.verifyAutomaticInput(job);
    } else {
      await this.jobManagementPolicy.verifyLessonAccess(
        job.lessonId,
        { id: job.requestedById, role: RoleEnum.INSTRUCTOR },
        { allowPendingApproval: false },
      );
    }
  }

  private async claimOutputRevision(job: IJob, output: 'summary' | 'mindmap' | 'quiz', session: ClientSession) {
    if (job.parameters?.automatic === true) await this.verifyAutomaticInput(job, session);
    return this.lessonRepo.incrementOutputRevision(job.lessonId, output, job.targetRevision, session);
  }

  /**
   * Xử lý tác vụ sinh tóm tắt bài học (ai.summary)
   */
  async processSummaryJob(msg: RabbitMqMessage<JobMessagePayload>): Promise<void> {
    const { jobId, dispatchSequence } = msg.content;
    const workerId = `worker-${process.pid}-${randomUUID().slice(0, 8)}`;

    // 1. Kiểm tra trạng thái hiện thời của Job
    const existingJob = await this.jobRepository.findById(jobId);
    if (!existingJob) {
      this.logger.warn(`[AnalysisJobProcessor] Không tìm thấy Job ${jobId}. Gửi ACK.`);
      msg.ack();
      return;
    }

    // Failsafe Crash-after-commit: Job đã COMPLETED thì ACK ngay, không gọi AI lại
    if (existingJob.status === JobStatusEnum.COMPLETED) {
      this.logger.log(
        `[AnalysisJobProcessor] Job ${jobId} đã hoàn tất từ trước. Bỏ qua và gửi ACK.`,
      );
      msg.ack();
      return;
    }

    // 2. Atomic Claim Job
    const claim = await this.jobService.claimJob(jobId, dispatchSequence, workerId, 90000);
    if (!claim) {
      this.logger.warn(
        `[AnalysisJobProcessor] Claim thất bại cho Job ${jobId} (đã được worker khác claim hoặc obsolete sequence). Gửi ACK.`,
      );
      msg.ack();
      return;
    }

    const { job, leaseToken } = claim;

    // 3. Thiết lập Heartbeat timer định kỳ (mỗi 20s)
    const heartbeatTimer = setInterval(async () => {
      try {
        const renewed = await this.jobService.renewLease(job.id, leaseToken, 90000);
        if (!renewed) {
          this.logger.warn(`[AnalysisJobProcessor] Gia hạn lease thất bại cho Job ${job.id}`);
        }
      } catch (e: any) {
        this.logger.error(`[AnalysisJobProcessor] Lỗi gia hạn lease: ${e.message}`);
      }
    }, 20000);

    try {
      // 4. Kiểm tra điều kiện tiên quyết (Pre-checks)
      // a. Kiểm tra trạng thái khóa học qua Policy (chặn nếu PENDING_APPROVAL)
      try {
        await this.verifyJobAccess(job);
      } catch (policyErr: any) {
        if (policyErr instanceof ConflictException) {
          this.logger.warn(
            `[AnalysisJobProcessor] Khóa học bài học ${job.lessonId} đang chờ duyệt. Đánh dấu Job ${job.id} REJECTED_STATUS.`,
          );
          await this.jobService.failJob(job.id, leaseToken, {
            errorCode: 'REJECTED_STATUS',
            errorMessage:
              policyErr.message ||
              'Khóa học đang trong trạng thái chờ duyệt. Không thể phân tích bài học.',
            retryable: false,
          });
          msg.ack();
          return;
        }
        throw policyErr;
      }

      // b. Kiểm tra bài học và Revision Guard cho transcript
      const lesson = await this.lessonRepo.findById(job.lessonId);
      if (!lesson) {
        await this.jobService.failJob(job.id, leaseToken, {
          errorCode: 'LESSON_NOT_FOUND',
          errorMessage: 'Không tìm thấy bài học',
          retryable: false,
        });
        msg.ack();
        return;
      }

      if ((lesson.analysisInputRevision ?? 0) !== (job.inputRevision ?? 0)) {
        this.logger.warn(
          `[AnalysisJobProcessor] Transcript bài học ${job.lessonId} đã thay đổi (hiện tại: ${lesson.analysisInputRevision}, job: ${job.inputRevision}). Đánh dấu INPUT_CHANGED.`,
        );
        await this.jobService.failJob(job.id, leaseToken, {
          errorCode: 'INPUT_CHANGED',
          errorMessage: `Nội dung transcript bài học đã thay đổi (hiện tại: ${lesson.analysisInputRevision ?? 0}, lúc tạo: ${job.inputRevision ?? 0})`,
          retryable: false,
        });
        msg.ack();
        return;
      }

      // 5. Gọi AI Generator (Ngoại vi - KHÔNG MỞ TRANSACTION)
      const content = await this.summaryGenerationService.generateSummaryContent(
        job.lessonId,
        {
          dto: job.parameters as GenerateSummaryDto,
          expectedInputRevision: job.inputRevision,
        },
      );

      // 6. Short Atomic Transaction (< 100ms)
      const session = await this.connection.startSession();
      try {
        await session.withTransaction(async () => {
          // a. Fencing & Revision Guard: Kiểm tra revision tóm tắt có bị thay đổi không
          const bumped = await this.claimOutputRevision(job, 'summary', session);
          if (!bumped) {
            throw new ConflictException('TARGET_CHANGED');
          }

          // b. Lưu tóm tắt bài học
          const shouldSaveDraft = (job.parameters as any)?.saveAsDraft ?? false;
          let savedSummary: ILessonSummary;
          if (shouldSaveDraft) {
            savedSummary = await this.lessonSummaryRepo.saveDraftByLessonId(
              job.lessonId,
              content.summary,
              job.requestedById,
              session,
            );
          } else {
            savedSummary = await this.lessonSummaryRepo.upsertOfficialByLessonId(
              job.lessonId,
              content.summary,
              job.requestedById,
              session,
            );
          }

          // c. Đánh dấu Job hoàn tất với fencing check
          await this.jobService.completeJob(
            job.id,
            leaseToken,
            {
              summaryId: savedSummary.id,
              metadata: content.metadata,
            },
            session,
          );
        });
      } finally {
        await session.endSession();
      }

      // 7. Manual ACK về RabbitMQ
      msg.ack();
      this.logger.log(
        `[AnalysisJobProcessor] Đã hoàn tất xử lý tác vụ Summary cho Job ${job.id}`,
      );
    } catch (err: any) {
      this.logger.error(
        `[AnalysisJobProcessor] Lỗi khi xử lý Job ${job.id}: ${err.message}`,
        err.stack,
      );

      if (
        err.message === 'TARGET_CHANGED' ||
        (err instanceof ConflictException && err.message.includes('TARGET_CHANGED'))
      ) {
        await this.jobService.failJob(job.id, leaseToken, {
          errorCode: 'TARGET_CHANGED',
          errorMessage:
            'Bản tóm tắt đã bị thay đổi thủ công trong lúc AI đang xử lý',
          retryable: false,
        });
        msg.ack();
      } else if (this.isTransientError(err)) {
        await this.jobService.failJob(job.id, leaseToken, {
          errorCode: err.name || 'AI_TRANSIENT_ERROR',
          errorMessage: err.message,
          retryable: true,
        });
        msg.ack();
      } else {
        await this.jobService.failJob(job.id, leaseToken, {
          errorCode: err.name || 'AI_PERMANENT_ERROR',
          errorMessage: err.message,
          retryable: false,
        });
        msg.ack();
      }
    } finally {
      clearInterval(heartbeatTimer);
    }
  }

  /**
   * Xử lý tác vụ sinh câu hỏi trắc nghiệm (ai.quiz)
   */
  async processQuizJob(msg: RabbitMqMessage<JobMessagePayload>): Promise<void> {
    const { jobId, dispatchSequence } = msg.content;
    const workerId = `worker-${process.pid}-${randomUUID().slice(0, 8)}`;

    // 1. Kiểm tra trạng thái hiện thời của Job
    const existingJob = await this.jobRepository.findById(jobId);
    if (!existingJob) {
      this.logger.warn(`[AnalysisJobProcessor] Không tìm thấy Job ${jobId}. Gửi ACK.`);
      msg.ack();
      return;
    }

    // Failsafe Crash-after-commit: Job đã COMPLETED thì ACK ngay, không gọi AI lại
    if (existingJob.status === JobStatusEnum.COMPLETED) {
      this.logger.log(
        `[AnalysisJobProcessor] Job ${jobId} đã hoàn tất từ trước. Bỏ qua và gửi ACK.`,
      );
      msg.ack();
      return;
    }

    // 2. Atomic Claim Job
    const claim = await this.jobService.claimJob(jobId, dispatchSequence, workerId, 90000);
    if (!claim) {
      this.logger.warn(
        `[AnalysisJobProcessor] Claim thất bại cho Job ${jobId} (đã được worker khác claim hoặc obsolete sequence). Gửi ACK.`,
      );
      msg.ack();
      return;
    }

    const { job, leaseToken } = claim;

    // 3. Thiết lập Heartbeat timer định kỳ (mỗi 20s)
    const heartbeatTimer = setInterval(async () => {
      try {
        const renewed = await this.jobService.renewLease(job.id, leaseToken, 90000);
        if (!renewed) {
          this.logger.warn(`[AnalysisJobProcessor] Gia hạn lease thất bại cho Job ${job.id}`);
        }
      } catch (e: unknown) {
        const err = e as Error;
        this.logger.error(`[AnalysisJobProcessor] Lỗi gia hạn lease: ${err.message}`);
      }
    }, 20000);

    try {
      // 4. Kiểm tra điều kiện tiên quyết (Pre-checks)
      // a. Policy check: chặn nếu PENDING_APPROVAL
      try {
        await this.verifyJobAccess(job);
      } catch (policyErr: unknown) {
        if (policyErr instanceof ConflictException) {
          this.logger.warn(
            `[AnalysisJobProcessor] Khóa học bài học ${job.lessonId} đang chờ duyệt. Đánh dấu Job ${job.id} REJECTED_STATUS.`,
          );
          await this.jobService.failJob(job.id, leaseToken, {
            errorCode: 'REJECTED_STATUS',
            errorMessage:
              policyErr.message ||
              'Khóa học đang trong trạng thái chờ duyệt. Không thể phân tích bài học.',
            retryable: false,
          });
          msg.ack();
          return;
        }
        throw policyErr;
      }

      // b. Kiểm tra bài học và Revision Guard cho transcript
      const lesson = await this.lessonRepo.findById(job.lessonId);
      if (!lesson) {
        await this.jobService.failJob(job.id, leaseToken, {
          errorCode: 'LESSON_NOT_FOUND',
          errorMessage: 'Không tìm thấy bài học',
          retryable: false,
        });
        msg.ack();
        return;
      }

      if ((lesson.analysisInputRevision ?? 0) !== (job.inputRevision ?? 0)) {
        this.logger.warn(
          `[AnalysisJobProcessor] Transcript bài học ${job.lessonId} đã thay đổi (hiện tại: ${lesson.analysisInputRevision}, job: ${job.inputRevision}). Đánh dấu INPUT_CHANGED.`,
        );
        await this.jobService.failJob(job.id, leaseToken, {
          errorCode: 'INPUT_CHANGED',
          errorMessage: `Nội dung transcript bài học đã thay đổi (hiện tại: ${lesson.analysisInputRevision ?? 0}, lúc tạo: ${job.inputRevision ?? 0})`,
          retryable: false,
        });
        msg.ack();
        return;
      }

      // 5. Gọi AI Generator (Ngoại vi - KHÔNG MỞ TRANSACTION)
      const count = (job.parameters as GenerateQuizDto)?.count ?? 10;
      const content = await this.quizGenerationService.generateQuizContent(
        job.lessonId,
        {
          count,
          expectedInputRevision: job.inputRevision,
        },
      );

      // 6. Quy tắc an toàn 0 câu hỏi: nếu AI trả về 0 câu hỏi, hoàn tất Job nhưng không xóa quiz hiện tại
      if (!content.quizzes || content.quizzes.length === 0) {
        this.logger.warn(
          `[Zero-Quiz Safety Rule] AI trả về 0 câu hỏi cho bài học ${job.lessonId}. Giữ nguyên bộ quiz chính thức hiện có.`,
        );
        await this.jobService.completeJob(
          job.id,
          leaseToken,
          {
            count: 0,
            preservedExisting: true,
            metadata: content.metadata,
          },
        );
        msg.ack();
        return;
      }

      // 7. Short Atomic Transaction (< 100ms)
      const session = await this.connection.startSession();
      try {
        await session.withTransaction(async () => {
          // a. Fencing & Revision Guard: Kiểm tra revision quiz có bị thay đổi không
          const bumped = await this.claimOutputRevision(job, 'quiz', session);
          if (!bumped) {
            throw new ConflictException('TARGET_CHANGED');
          }

          // b. Lưu Quiz (hoặc nháp nếu có option)
          const shouldSaveDraft = (job.parameters as GenerateQuizDto)?.saveAsDraft ?? false;
          if (shouldSaveDraft) {
            await this.lessonQuizDraftRepo.saveDraftByLessonId(
              job.lessonId,
              content.quizzes,
              job.requestedById,
              session,
            );
          } else {
            const quizzesToInsert = content.quizzes.map((q) => ({
              timestamp: null,
              explanationTimestamp: q.explanationTimestamp,
              order: q.order,
              question: q.question,
              questionType: q.questionType,
              options: q.options.map((opt) => ({
                id: opt.id,
                label: opt.label,
                text: opt.text,
                isCorrect: opt.isCorrect,
              })),
              explanation: q.explanation || null,
            }));

            await this.lessonQuizRepo.replaceAllQuizzesForLesson(
              job.lessonId,
              quizzesToInsert,
              session,
            );

            await this.lessonQuizDraftRepo.clearDraftByLessonId(job.lessonId, session);
          }

          // c. Đánh dấu Job hoàn tất với fencing check
          await this.jobService.completeJob(
            job.id,
            leaseToken,
            {
              count: content.quizzes.length,
              metadata: content.metadata,
            },
            session,
          );
        });
      } finally {
        await session.endSession();
      }

      // 8. Manual ACK
      msg.ack();
      this.logger.log(
        `[AnalysisJobProcessor] Đã hoàn tất xử lý tác vụ Quiz cho Job ${job.id}`,
      );
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(
        `[AnalysisJobProcessor] Lỗi khi xử lý Quiz Job ${job.id}: ${error.message}`,
        error.stack,
      );

      if (
        error.message === 'TARGET_CHANGED' ||
        (error instanceof ConflictException && error.message.includes('TARGET_CHANGED'))
      ) {
        await this.jobService.failJob(job.id, leaseToken, {
          errorCode: 'TARGET_CHANGED',
          errorMessage: 'Dữ liệu Quiz đã bị thay đổi thủ công trong lúc AI đang xử lý',
          retryable: false,
        });
        msg.ack();
      } else if (this.isTransientError(error)) {
        await this.jobService.failJob(job.id, leaseToken, {
          errorCode: error.name || 'AI_TRANSIENT_ERROR',
          errorMessage: error.message,
          retryable: true,
        });
        msg.ack();
      } else {
        await this.jobService.failJob(job.id, leaseToken, {
          errorCode: error.name || 'AI_PERMANENT_ERROR',
          errorMessage: error.message,
          retryable: false,
        });
        msg.ack();
      }
    } finally {
      clearInterval(heartbeatTimer);
    }
  }

  /**
   * Xử lý tác vụ sinh sơ đồ tư duy (ai.mindmap)
   */
  async processMindmapJob(msg: RabbitMqMessage<JobMessagePayload>): Promise<void> {
    const { jobId, dispatchSequence } = msg.content;
    const workerId = `worker-${process.pid}-${randomUUID().slice(0, 8)}`;

    // 1. Kiểm tra trạng thái hiện thời của Job
    const existingJob = await this.jobRepository.findById(jobId);
    if (!existingJob) {
      this.logger.warn(`[AnalysisJobProcessor] Không tìm thấy Job ${jobId}. Gửi ACK.`);
      msg.ack();
      return;
    }

    // Failsafe Crash-after-commit: Job đã COMPLETED thì ACK ngay, không gọi AI lại
    if (existingJob.status === JobStatusEnum.COMPLETED) {
      this.logger.log(
        `[AnalysisJobProcessor] Job ${jobId} đã hoàn tất từ trước. Bỏ qua và gửi ACK.`,
      );
      msg.ack();
      return;
    }

    // 2. Atomic Claim Job
    const claim = await this.jobService.claimJob(jobId, dispatchSequence, workerId, 90000);
    if (!claim) {
      this.logger.warn(
        `[AnalysisJobProcessor] Claim thất bại cho Job ${jobId} (đã được worker khác claim hoặc obsolete sequence). Gửi ACK.`,
      );
      msg.ack();
      return;
    }

    const { job, leaseToken } = claim;

    // 3. Heartbeat timer (mỗi 20s)
    const heartbeatTimer = setInterval(async () => {
      try {
        const renewed = await this.jobService.renewLease(job.id, leaseToken, 90000);
        if (!renewed) {
          this.logger.warn(`[AnalysisJobProcessor] Gia hạn lease thất bại cho Job ${job.id}`);
        }
      } catch (e: unknown) {
        const err = e as Error;
        this.logger.error(`[AnalysisJobProcessor] Lỗi gia hạn lease: ${err.message}`);
      }
    }, 20000);

    try {
      // 4. Pre-checks
      // a. Policy check: chặn nếu PENDING_APPROVAL
      try {
        await this.verifyJobAccess(job);
      } catch (policyErr: unknown) {
        if (policyErr instanceof ConflictException) {
          this.logger.warn(
            `[AnalysisJobProcessor] Khóa học bài học ${job.lessonId} đang chờ duyệt. Đánh dấu Job ${job.id} REJECTED_STATUS.`,
          );
          await this.jobService.failJob(job.id, leaseToken, {
            errorCode: 'REJECTED_STATUS',
            errorMessage:
              policyErr.message ||
              'Khóa học đang trong trạng thái chờ duyệt. Không thể phân tích bài học.',
            retryable: false,
          });
          msg.ack();
          return;
        }
        throw policyErr;
      }

      // b. Kiểm tra bài học và Revision Guard cho transcript
      const lesson = await this.lessonRepo.findById(job.lessonId);
      if (!lesson) {
        await this.jobService.failJob(job.id, leaseToken, {
          errorCode: 'LESSON_NOT_FOUND',
          errorMessage: 'Không tìm thấy bài học',
          retryable: false,
        });
        msg.ack();
        return;
      }

      if ((lesson.analysisInputRevision ?? 0) !== (job.inputRevision ?? 0)) {
        this.logger.warn(
          `[AnalysisJobProcessor] Transcript bài học ${job.lessonId} đã thay đổi (hiện tại: ${lesson.analysisInputRevision}, job: ${job.inputRevision}). Đánh dấu INPUT_CHANGED.`,
        );
        await this.jobService.failJob(job.id, leaseToken, {
          errorCode: 'INPUT_CHANGED',
          errorMessage: `Nội dung transcript bài học đã thay đổi (hiện tại: ${lesson.analysisInputRevision ?? 0}, lúc tạo: ${job.inputRevision ?? 0})`,
          retryable: false,
        });
        msg.ack();
        return;
      }

      // 5. Gọi AI Generator (Ngoại vi - KHÔNG MỞ TRANSACTION)
      const content = await this.mindmapAnalysisService.generateMindmapContent(
        job.lessonId,
        {
          expectedInputRevision: job.inputRevision,
        },
      );

      // 6. Short Atomic Transaction (< 100ms)
      const session = await this.connection.startSession();
      try {
        await session.withTransaction(async () => {
          // a. Fencing & Revision Guard
          const bumped = await this.claimOutputRevision(job, 'mindmap', session);
          if (!bumped) {
            throw new ConflictException('TARGET_CHANGED');
          }

          // b. Lưu Mindmap
          const shouldSaveDraft = (job.parameters as GenerateMindmapDto)?.saveAsDraft ?? false;
          let savedMindmap: ILessonMindmap;
          if (shouldSaveDraft) {
            savedMindmap = await this.lessonMindmapRepo.saveDraftByLessonId(
              job.lessonId,
              content.mindmap,
              job.requestedById,
              session,
            );
          } else {
            savedMindmap = await this.lessonMindmapRepo.upsertOfficialByLessonId(
              job.lessonId,
              content.mindmap,
              job.requestedById,
              session,
            );
          }

          // c. Đánh dấu Job hoàn tất
          await this.jobService.completeJob(
            job.id,
            leaseToken,
            {
              mindmapId: savedMindmap.id,
              metadata: content.metadata,
            },
            session,
          );
        });
      } finally {
        await session.endSession();
      }

      // 7. Manual ACK
      msg.ack();
      this.logger.log(
        `[AnalysisJobProcessor] Đã hoàn tất xử lý tác vụ Mindmap cho Job ${job.id}`,
      );
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(
        `[AnalysisJobProcessor] Lỗi khi xử lý Mindmap Job ${job.id}: ${error.message}`,
        error.stack,
      );

      if (
        error.message === 'TARGET_CHANGED' ||
        (error instanceof ConflictException && error.message.includes('TARGET_CHANGED'))
      ) {
        await this.jobService.failJob(job.id, leaseToken, {
          errorCode: 'TARGET_CHANGED',
          errorMessage: 'Sơ đồ tư duy đã bị thay đổi thủ công trong lúc AI đang xử lý',
          retryable: false,
        });
        msg.ack();
      } else if (this.isTransientError(error)) {
        await this.jobService.failJob(job.id, leaseToken, {
          errorCode: error.name || 'AI_TRANSIENT_ERROR',
          errorMessage: error.message,
          retryable: true,
        });
        msg.ack();
      } else {
        await this.jobService.failJob(job.id, leaseToken, {
          errorCode: error.name || 'AI_PERMANENT_ERROR',
          errorMessage: error.message,
          retryable: false,
        });
        msg.ack();
      }
    } finally {
      clearInterval(heartbeatTimer);
    }
  }

  /**
   * Phân loại lỗi mạng/quota tạm thời cần retry
   */
  public isTransientError(err: unknown): boolean {
    const errorObj = err as { message?: string; status?: number; statusCode?: number } | undefined;
    const message = errorObj?.message || '';
    const status = errorObj?.status || errorObj?.statusCode || 0;

    if (status === 429 || status === 502 || status === 503 || status === 504) {
      return true;
    }

    const transientKeywords = [
      'rate limit',
      'resource_exhausted',
      'quota',
      'timeout',
      'etimedout',
      'econnreset',
      'und_err_connect_timeout',
    ];

    return transientKeywords.some((kw) => message.toLowerCase().includes(kw));
  }
}
