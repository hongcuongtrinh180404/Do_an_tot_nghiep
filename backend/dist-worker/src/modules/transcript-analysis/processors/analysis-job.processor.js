var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AnalysisJobProcessor_1;
import { Injectable, Logger, ConflictException, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { JobTypeEnum, JobStatusEnum, RoleEnum, } from 'share-lib';
import { RabbitMqService } from '../../messaging/rabbitmq.service.js';
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
let AnalysisJobProcessor = AnalysisJobProcessor_1 = class AnalysisJobProcessor {
    rabbitMqService;
    configService;
    jobService;
    jobRepository;
    lessonRepo;
    lessonSummaryRepo;
    summaryGenerationService;
    quizGenerationService;
    mindmapAnalysisService;
    lessonQuizRepo;
    lessonQuizDraftRepo;
    lessonMindmapRepo;
    jobManagementPolicy;
    connection;
    logger = new Logger(AnalysisJobProcessor_1.name);
    constructor(rabbitMqService, configService, jobService, jobRepository, lessonRepo, lessonSummaryRepo, summaryGenerationService, quizGenerationService, mindmapAnalysisService, lessonQuizRepo, lessonQuizDraftRepo, lessonMindmapRepo, jobManagementPolicy, connection) {
        this.rabbitMqService = rabbitMqService;
        this.configService = configService;
        this.jobService = jobService;
        this.jobRepository = jobRepository;
        this.lessonRepo = lessonRepo;
        this.lessonSummaryRepo = lessonSummaryRepo;
        this.summaryGenerationService = summaryGenerationService;
        this.quizGenerationService = quizGenerationService;
        this.mindmapAnalysisService = mindmapAnalysisService;
        this.lessonQuizRepo = lessonQuizRepo;
        this.lessonQuizDraftRepo = lessonQuizDraftRepo;
        this.lessonMindmapRepo = lessonMindmapRepo;
        this.jobManagementPolicy = jobManagementPolicy;
        this.connection = connection;
    }
    async onModuleInit() {
        if (process.env.IS_WORKER !== 'true') {
            this.logger.log('[AnalysisJobProcessor] Đang chạy trong API context, bỏ qua đăng ký RabbitMQ consumer.');
            return;
        }
        const queueName = this.configService.get('RABBITMQ_AI_QUEUE', RABBITMQ_CONSTANTS.QUEUE_AI);
        const prefetch = this.configService.get('AI_PREFETCH', 1);
        this.logger.log(`[AnalysisJobProcessor] Đăng ký consumer cho queue "${queueName}" (Prefetch: ${prefetch})...`);
        await this.rabbitMqService.createConsumer(queueName, async (msg) => {
            await this.handleMessage(msg);
        }, { prefetch });
    }
    async handleMessage(msg) {
        const payload = msg.content;
        if (!payload?.jobId || !payload?.type) {
            this.logger.warn(`[AnalysisJobProcessor] Bỏ qua message không hợp lệ (thiếu jobId hoặc type)`);
            msg.ack();
            return;
        }
        if (payload.type === JobTypeEnum.SUMMARY) {
            await this.processSummaryJob(msg);
        }
        else if (payload.type === JobTypeEnum.QUIZ) {
            await this.processQuizJob(msg);
        }
        else if (payload.type === JobTypeEnum.MINDMAP) {
            await this.processMindmapJob(msg);
        }
        else {
            this.logger.debug(`[AnalysisJobProcessor] Bỏ qua tác vụ chưa kích hoạt ở phase này: type="${payload.type}"`);
            msg.ack();
        }
    }
    async processSummaryJob(msg) {
        const { jobId, dispatchSequence } = msg.content;
        const workerId = `worker-${process.pid}-${randomUUID().slice(0, 8)}`;
        const existingJob = await this.jobRepository.findById(jobId);
        if (!existingJob) {
            this.logger.warn(`[AnalysisJobProcessor] Không tìm thấy Job ${jobId}. Gửi ACK.`);
            msg.ack();
            return;
        }
        if (existingJob.status === JobStatusEnum.COMPLETED) {
            this.logger.log(`[AnalysisJobProcessor] Job ${jobId} đã hoàn tất từ trước. Bỏ qua và gửi ACK.`);
            msg.ack();
            return;
        }
        const claim = await this.jobService.claimJob(jobId, dispatchSequence, workerId, 90000);
        if (!claim) {
            this.logger.warn(`[AnalysisJobProcessor] Claim thất bại cho Job ${jobId} (đã được worker khác claim hoặc obsolete sequence). Gửi ACK.`);
            msg.ack();
            return;
        }
        const { job, leaseToken } = claim;
        const heartbeatTimer = setInterval(async () => {
            try {
                const renewed = await this.jobService.renewLease(job.id, leaseToken, 90000);
                if (!renewed) {
                    this.logger.warn(`[AnalysisJobProcessor] Gia hạn lease thất bại cho Job ${job.id}`);
                }
            }
            catch (e) {
                this.logger.error(`[AnalysisJobProcessor] Lỗi gia hạn lease: ${e.message}`);
            }
        }, 20000);
        try {
            try {
                await this.jobManagementPolicy.verifyLessonAccess(job.lessonId, { id: job.requestedById, role: RoleEnum.INSTRUCTOR }, { allowPendingApproval: false });
            }
            catch (policyErr) {
                if (policyErr instanceof ConflictException) {
                    this.logger.warn(`[AnalysisJobProcessor] Khóa học bài học ${job.lessonId} đang chờ duyệt. Đánh dấu Job ${job.id} REJECTED_STATUS.`);
                    await this.jobService.failJob(job.id, leaseToken, {
                        errorCode: 'REJECTED_STATUS',
                        errorMessage: policyErr.message ||
                            'Khóa học đang trong trạng thái chờ duyệt. Không thể phân tích bài học.',
                        retryable: false,
                    });
                    msg.ack();
                    return;
                }
                throw policyErr;
            }
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
                this.logger.warn(`[AnalysisJobProcessor] Transcript bài học ${job.lessonId} đã thay đổi (hiện tại: ${lesson.analysisInputRevision}, job: ${job.inputRevision}). Đánh dấu INPUT_CHANGED.`);
                await this.jobService.failJob(job.id, leaseToken, {
                    errorCode: 'INPUT_CHANGED',
                    errorMessage: `Nội dung transcript bài học đã thay đổi (hiện tại: ${lesson.analysisInputRevision ?? 0}, lúc tạo: ${job.inputRevision ?? 0})`,
                    retryable: false,
                });
                msg.ack();
                return;
            }
            const content = await this.summaryGenerationService.generateSummaryContent(job.lessonId, {
                dto: job.parameters,
                expectedInputRevision: job.inputRevision,
            });
            const session = await this.connection.startSession();
            try {
                await session.withTransaction(async () => {
                    const bumped = await this.lessonRepo.incrementOutputRevision(job.lessonId, 'summary', job.targetRevision, session);
                    if (!bumped) {
                        throw new ConflictException('TARGET_CHANGED');
                    }
                    const shouldSaveDraft = job.parameters?.saveAsDraft ?? false;
                    let savedSummary;
                    if (shouldSaveDraft) {
                        savedSummary = await this.lessonSummaryRepo.saveDraftByLessonId(job.lessonId, content.summary, job.requestedById, session);
                    }
                    else {
                        savedSummary = await this.lessonSummaryRepo.upsertOfficialByLessonId(job.lessonId, content.summary, job.requestedById, session);
                    }
                    await this.jobService.completeJob(job.id, leaseToken, {
                        summaryId: savedSummary.id,
                        metadata: content.metadata,
                    }, session);
                });
            }
            finally {
                await session.endSession();
            }
            msg.ack();
            this.logger.log(`[AnalysisJobProcessor] Đã hoàn tất xử lý tác vụ Summary cho Job ${job.id}`);
        }
        catch (err) {
            this.logger.error(`[AnalysisJobProcessor] Lỗi khi xử lý Job ${job.id}: ${err.message}`, err.stack);
            if (err.message === 'TARGET_CHANGED' ||
                (err instanceof ConflictException && err.message.includes('TARGET_CHANGED'))) {
                await this.jobService.failJob(job.id, leaseToken, {
                    errorCode: 'TARGET_CHANGED',
                    errorMessage: 'Bản tóm tắt đã bị thay đổi thủ công trong lúc AI đang xử lý',
                    retryable: false,
                });
                msg.ack();
            }
            else if (this.isTransientError(err)) {
                await this.jobService.failJob(job.id, leaseToken, {
                    errorCode: err.name || 'AI_TRANSIENT_ERROR',
                    errorMessage: err.message,
                    retryable: true,
                });
                msg.ack();
            }
            else {
                await this.jobService.failJob(job.id, leaseToken, {
                    errorCode: err.name || 'AI_PERMANENT_ERROR',
                    errorMessage: err.message,
                    retryable: false,
                });
                msg.ack();
            }
        }
        finally {
            clearInterval(heartbeatTimer);
        }
    }
    async processQuizJob(msg) {
        const { jobId, dispatchSequence } = msg.content;
        const workerId = `worker-${process.pid}-${randomUUID().slice(0, 8)}`;
        const existingJob = await this.jobRepository.findById(jobId);
        if (!existingJob) {
            this.logger.warn(`[AnalysisJobProcessor] Không tìm thấy Job ${jobId}. Gửi ACK.`);
            msg.ack();
            return;
        }
        if (existingJob.status === JobStatusEnum.COMPLETED) {
            this.logger.log(`[AnalysisJobProcessor] Job ${jobId} đã hoàn tất từ trước. Bỏ qua và gửi ACK.`);
            msg.ack();
            return;
        }
        const claim = await this.jobService.claimJob(jobId, dispatchSequence, workerId, 90000);
        if (!claim) {
            this.logger.warn(`[AnalysisJobProcessor] Claim thất bại cho Job ${jobId} (đã được worker khác claim hoặc obsolete sequence). Gửi ACK.`);
            msg.ack();
            return;
        }
        const { job, leaseToken } = claim;
        const heartbeatTimer = setInterval(async () => {
            try {
                const renewed = await this.jobService.renewLease(job.id, leaseToken, 90000);
                if (!renewed) {
                    this.logger.warn(`[AnalysisJobProcessor] Gia hạn lease thất bại cho Job ${job.id}`);
                }
            }
            catch (e) {
                const err = e;
                this.logger.error(`[AnalysisJobProcessor] Lỗi gia hạn lease: ${err.message}`);
            }
        }, 20000);
        try {
            try {
                await this.jobManagementPolicy.verifyLessonAccess(job.lessonId, { id: job.requestedById, role: RoleEnum.INSTRUCTOR }, { allowPendingApproval: false });
            }
            catch (policyErr) {
                if (policyErr instanceof ConflictException) {
                    this.logger.warn(`[AnalysisJobProcessor] Khóa học bài học ${job.lessonId} đang chờ duyệt. Đánh dấu Job ${job.id} REJECTED_STATUS.`);
                    await this.jobService.failJob(job.id, leaseToken, {
                        errorCode: 'REJECTED_STATUS',
                        errorMessage: policyErr.message ||
                            'Khóa học đang trong trạng thái chờ duyệt. Không thể phân tích bài học.',
                        retryable: false,
                    });
                    msg.ack();
                    return;
                }
                throw policyErr;
            }
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
                this.logger.warn(`[AnalysisJobProcessor] Transcript bài học ${job.lessonId} đã thay đổi (hiện tại: ${lesson.analysisInputRevision}, job: ${job.inputRevision}). Đánh dấu INPUT_CHANGED.`);
                await this.jobService.failJob(job.id, leaseToken, {
                    errorCode: 'INPUT_CHANGED',
                    errorMessage: `Nội dung transcript bài học đã thay đổi (hiện tại: ${lesson.analysisInputRevision ?? 0}, lúc tạo: ${job.inputRevision ?? 0})`,
                    retryable: false,
                });
                msg.ack();
                return;
            }
            const count = job.parameters?.count ?? 10;
            const content = await this.quizGenerationService.generateQuizContent(job.lessonId, {
                count,
                expectedInputRevision: job.inputRevision,
            });
            if (!content.quizzes || content.quizzes.length === 0) {
                this.logger.warn(`[Zero-Quiz Safety Rule] AI trả về 0 câu hỏi cho bài học ${job.lessonId}. Giữ nguyên bộ quiz chính thức hiện có.`);
                await this.jobService.completeJob(job.id, leaseToken, {
                    count: 0,
                    preservedExisting: true,
                    metadata: content.metadata,
                });
                msg.ack();
                return;
            }
            const session = await this.connection.startSession();
            try {
                await session.withTransaction(async () => {
                    const bumped = await this.lessonRepo.incrementOutputRevision(job.lessonId, 'quiz', job.targetRevision, session);
                    if (!bumped) {
                        throw new ConflictException('TARGET_CHANGED');
                    }
                    const shouldSaveDraft = job.parameters?.saveAsDraft ?? false;
                    if (shouldSaveDraft) {
                        await this.lessonQuizDraftRepo.saveDraftByLessonId(job.lessonId, content.quizzes, job.requestedById, session);
                    }
                    else {
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
                        await this.lessonQuizRepo.replaceAllQuizzesForLesson(job.lessonId, quizzesToInsert, session);
                        await this.lessonQuizDraftRepo.clearDraftByLessonId(job.lessonId, session);
                    }
                    await this.jobService.completeJob(job.id, leaseToken, {
                        count: content.quizzes.length,
                        metadata: content.metadata,
                    }, session);
                });
            }
            finally {
                await session.endSession();
            }
            msg.ack();
            this.logger.log(`[AnalysisJobProcessor] Đã hoàn tất xử lý tác vụ Quiz cho Job ${job.id}`);
        }
        catch (err) {
            const error = err;
            this.logger.error(`[AnalysisJobProcessor] Lỗi khi xử lý Quiz Job ${job.id}: ${error.message}`, error.stack);
            if (error.message === 'TARGET_CHANGED' ||
                (error instanceof ConflictException && error.message.includes('TARGET_CHANGED'))) {
                await this.jobService.failJob(job.id, leaseToken, {
                    errorCode: 'TARGET_CHANGED',
                    errorMessage: 'Dữ liệu Quiz đã bị thay đổi thủ công trong lúc AI đang xử lý',
                    retryable: false,
                });
                msg.ack();
            }
            else if (this.isTransientError(error)) {
                await this.jobService.failJob(job.id, leaseToken, {
                    errorCode: error.name || 'AI_TRANSIENT_ERROR',
                    errorMessage: error.message,
                    retryable: true,
                });
                msg.ack();
            }
            else {
                await this.jobService.failJob(job.id, leaseToken, {
                    errorCode: error.name || 'AI_PERMANENT_ERROR',
                    errorMessage: error.message,
                    retryable: false,
                });
                msg.ack();
            }
        }
        finally {
            clearInterval(heartbeatTimer);
        }
    }
    async processMindmapJob(msg) {
        const { jobId, dispatchSequence } = msg.content;
        const workerId = `worker-${process.pid}-${randomUUID().slice(0, 8)}`;
        const existingJob = await this.jobRepository.findById(jobId);
        if (!existingJob) {
            this.logger.warn(`[AnalysisJobProcessor] Không tìm thấy Job ${jobId}. Gửi ACK.`);
            msg.ack();
            return;
        }
        if (existingJob.status === JobStatusEnum.COMPLETED) {
            this.logger.log(`[AnalysisJobProcessor] Job ${jobId} đã hoàn tất từ trước. Bỏ qua và gửi ACK.`);
            msg.ack();
            return;
        }
        const claim = await this.jobService.claimJob(jobId, dispatchSequence, workerId, 90000);
        if (!claim) {
            this.logger.warn(`[AnalysisJobProcessor] Claim thất bại cho Job ${jobId} (đã được worker khác claim hoặc obsolete sequence). Gửi ACK.`);
            msg.ack();
            return;
        }
        const { job, leaseToken } = claim;
        const heartbeatTimer = setInterval(async () => {
            try {
                const renewed = await this.jobService.renewLease(job.id, leaseToken, 90000);
                if (!renewed) {
                    this.logger.warn(`[AnalysisJobProcessor] Gia hạn lease thất bại cho Job ${job.id}`);
                }
            }
            catch (e) {
                const err = e;
                this.logger.error(`[AnalysisJobProcessor] Lỗi gia hạn lease: ${err.message}`);
            }
        }, 20000);
        try {
            try {
                await this.jobManagementPolicy.verifyLessonAccess(job.lessonId, { id: job.requestedById, role: RoleEnum.INSTRUCTOR }, { allowPendingApproval: false });
            }
            catch (policyErr) {
                if (policyErr instanceof ConflictException) {
                    this.logger.warn(`[AnalysisJobProcessor] Khóa học bài học ${job.lessonId} đang chờ duyệt. Đánh dấu Job ${job.id} REJECTED_STATUS.`);
                    await this.jobService.failJob(job.id, leaseToken, {
                        errorCode: 'REJECTED_STATUS',
                        errorMessage: policyErr.message ||
                            'Khóa học đang trong trạng thái chờ duyệt. Không thể phân tích bài học.',
                        retryable: false,
                    });
                    msg.ack();
                    return;
                }
                throw policyErr;
            }
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
                this.logger.warn(`[AnalysisJobProcessor] Transcript bài học ${job.lessonId} đã thay đổi (hiện tại: ${lesson.analysisInputRevision}, job: ${job.inputRevision}). Đánh dấu INPUT_CHANGED.`);
                await this.jobService.failJob(job.id, leaseToken, {
                    errorCode: 'INPUT_CHANGED',
                    errorMessage: `Nội dung transcript bài học đã thay đổi (hiện tại: ${lesson.analysisInputRevision ?? 0}, lúc tạo: ${job.inputRevision ?? 0})`,
                    retryable: false,
                });
                msg.ack();
                return;
            }
            const content = await this.mindmapAnalysisService.generateMindmapContent(job.lessonId, {
                expectedInputRevision: job.inputRevision,
            });
            const session = await this.connection.startSession();
            try {
                await session.withTransaction(async () => {
                    const bumped = await this.lessonRepo.incrementOutputRevision(job.lessonId, 'mindmap', job.targetRevision, session);
                    if (!bumped) {
                        throw new ConflictException('TARGET_CHANGED');
                    }
                    const shouldSaveDraft = job.parameters?.saveAsDraft ?? false;
                    let savedMindmap;
                    if (shouldSaveDraft) {
                        savedMindmap = await this.lessonMindmapRepo.saveDraftByLessonId(job.lessonId, content.mindmap, job.requestedById, session);
                    }
                    else {
                        savedMindmap = await this.lessonMindmapRepo.upsertOfficialByLessonId(job.lessonId, content.mindmap, job.requestedById, session);
                    }
                    await this.jobService.completeJob(job.id, leaseToken, {
                        mindmapId: savedMindmap.id,
                        metadata: content.metadata,
                    }, session);
                });
            }
            finally {
                await session.endSession();
            }
            msg.ack();
            this.logger.log(`[AnalysisJobProcessor] Đã hoàn tất xử lý tác vụ Mindmap cho Job ${job.id}`);
        }
        catch (err) {
            const error = err;
            this.logger.error(`[AnalysisJobProcessor] Lỗi khi xử lý Mindmap Job ${job.id}: ${error.message}`, error.stack);
            if (error.message === 'TARGET_CHANGED' ||
                (error instanceof ConflictException && error.message.includes('TARGET_CHANGED'))) {
                await this.jobService.failJob(job.id, leaseToken, {
                    errorCode: 'TARGET_CHANGED',
                    errorMessage: 'Sơ đồ tư duy đã bị thay đổi thủ công trong lúc AI đang xử lý',
                    retryable: false,
                });
                msg.ack();
            }
            else if (this.isTransientError(error)) {
                await this.jobService.failJob(job.id, leaseToken, {
                    errorCode: error.name || 'AI_TRANSIENT_ERROR',
                    errorMessage: error.message,
                    retryable: true,
                });
                msg.ack();
            }
            else {
                await this.jobService.failJob(job.id, leaseToken, {
                    errorCode: error.name || 'AI_PERMANENT_ERROR',
                    errorMessage: error.message,
                    retryable: false,
                });
                msg.ack();
            }
        }
        finally {
            clearInterval(heartbeatTimer);
        }
    }
    isTransientError(err) {
        const errorObj = err;
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
};
AnalysisJobProcessor = AnalysisJobProcessor_1 = __decorate([
    Injectable(),
    __param(13, InjectConnection()),
    __metadata("design:paramtypes", [RabbitMqService,
        ConfigService,
        JobService,
        JobRepository,
        LessonRepository,
        LessonSummaryRepository,
        SummaryGenerationService,
        QuizGenerationService,
        MindmapAnalysisService,
        LessonQuizRepository,
        LessonQuizDraftRepository,
        LessonMindmapRepository,
        JobManagementPolicy, Function])
], AnalysisJobProcessor);
export { AnalysisJobProcessor };
//# sourceMappingURL=analysis-job.processor.js.map