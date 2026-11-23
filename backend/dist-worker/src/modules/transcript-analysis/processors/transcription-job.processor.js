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
var TranscriptionJobProcessor_1;
import { Injectable, Logger, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { JobTypeEnum, JobStatusEnum, LessonTranscriptionStatusEnum, } from 'share-lib';
import { RabbitMqService } from '../../messaging/rabbitmq.service.js';
import { RABBITMQ_CONSTANTS } from '../../messaging/rabbitmq-topology.js';
import { JobService } from '../../jobs/services/job.service.js';
import { JobRepository } from '../../jobs/repositories/job.repository.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonTranscriptRepository } from '../../course/repositories/lesson-transcript.repository.js';
import { AudioExtractorService } from '../../course/services/audio-extractor.service.js';
import { AssemblyAiService } from '../../assemblyai/assemblyai.service.js';
import { StorageService } from '../../storage/storage.service.js';
let TranscriptionJobProcessor = TranscriptionJobProcessor_1 = class TranscriptionJobProcessor {
    rabbitMqService;
    configService;
    jobService;
    jobRepository;
    lessonRepo;
    lessonTranscriptRepo;
    audioExtractorService;
    assemblyAiService;
    storageService;
    connection;
    logger = new Logger(TranscriptionJobProcessor_1.name);
    constructor(rabbitMqService, configService, jobService, jobRepository, lessonRepo, lessonTranscriptRepo, audioExtractorService, assemblyAiService, storageService, connection) {
        this.rabbitMqService = rabbitMqService;
        this.configService = configService;
        this.jobService = jobService;
        this.jobRepository = jobRepository;
        this.lessonRepo = lessonRepo;
        this.lessonTranscriptRepo = lessonTranscriptRepo;
        this.audioExtractorService = audioExtractorService;
        this.assemblyAiService = assemblyAiService;
        this.storageService = storageService;
        this.connection = connection;
    }
    async onModuleInit() {
        if (process.env.IS_WORKER !== 'true') {
            this.logger.log('[TranscriptionJobProcessor] Đang chạy trong API context, bỏ qua đăng ký RabbitMQ consumer.');
            return;
        }
        const queueName = this.configService.get('RABBITMQ_TRANSCRIPTION_QUEUE', RABBITMQ_CONSTANTS.QUEUE_TRANSCRIPTION);
        const prefetch = this.configService.get('TRANSCRIPTION_PREFETCH', 1);
        this.logger.log(`[TranscriptionJobProcessor] Đăng ký consumer cho queue "${queueName}" (Prefetch: ${prefetch})...`);
        await this.rabbitMqService.createConsumer(queueName, async (msg) => {
            await this.handleMessage(msg);
        }, { prefetch });
    }
    async handleMessage(msg) {
        const payload = msg.content;
        if (!payload?.jobId || payload?.type !== JobTypeEnum.TRANSCRIPTION) {
            this.logger.warn(`[TranscriptionJobProcessor] Bỏ qua message không hợp lệ (jobId: ${payload?.jobId}, type: ${payload?.type})`);
            msg.ack();
            return;
        }
        await this.processTranscriptionJob(msg);
    }
    async processTranscriptionJob(msg) {
        const { jobId, dispatchSequence } = msg.content;
        const workerId = `worker-transcription-${process.pid}-${randomUUID().slice(0, 8)}`;
        const existingJob = await this.jobRepository.findById(jobId);
        if (!existingJob) {
            this.logger.warn(`[TranscriptionJobProcessor] Không tìm thấy Job ${jobId}. Gửi ACK.`);
            msg.ack();
            return;
        }
        if (existingJob.status === JobStatusEnum.COMPLETED) {
            this.logger.log(`[TranscriptionJobProcessor] Job ${jobId} đã hoàn tất từ trước. Bỏ qua và gửi ACK.`);
            msg.ack();
            return;
        }
        const claim = await this.jobService.claimJob(jobId, dispatchSequence, workerId, 120000);
        if (!claim) {
            this.logger.warn(`[TranscriptionJobProcessor] Claim thất bại cho Job ${jobId} (đã được worker khác claim hoặc obsolete sequence). Gửi ACK.`);
            msg.ack();
            return;
        }
        const { job, leaseToken } = claim;
        const heartbeatTimer = setInterval(async () => {
            try {
                const renewed = await this.jobService.renewLease(job.id, leaseToken, 120000);
                if (!renewed) {
                    this.logger.warn(`[TranscriptionJobProcessor] Gia hạn lease thất bại cho Job ${job.id}`);
                }
            }
            catch (e) {
                const errMessage = e instanceof Error ? e.message : String(e);
                this.logger.error(`[TranscriptionJobProcessor] Lỗi gia hạn lease: ${errMessage}`);
            }
        }, 25000);
        let tempMp3Path = null;
        try {
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
            await this.lessonRepo.update(job.lessonId, {
                transcriptionStatus: LessonTranscriptionStatusEnum.TRANSCRIBING,
            });
            await this.lessonTranscriptRepo.upsertByLessonId(job.lessonId, {
                status: LessonTranscriptionStatusEnum.TRANSCRIBING,
                failureReason: null,
            });
            let externalTranscriptId = typeof job.parameters?.externalTranscriptId === 'string'
                ? job.parameters.externalTranscriptId.trim()
                : null;
            if (!externalTranscriptId) {
                const videoKey = job.parameters?.videoKey ||
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
                    await this.lessonTranscriptRepo.updateStatusByLessonId(job.lessonId, LessonTranscriptionStatusEnum.FAILED, 'Nguồn video bị thiếu');
                    msg.ack();
                    return;
                }
                let presignedVideoUrl = videoKey;
                if (!videoKey.startsWith('http://') && !videoKey.startsWith('https://')) {
                    presignedVideoUrl = await this.storageService.getPresignedStreamUrl(videoKey, 3600);
                }
                tempMp3Path = await this.audioExtractorService.extractMp3FromVideo(presignedVideoUrl, job.lessonId);
                const languageCode = job.parameters?.languageCode || 'vi';
                externalTranscriptId = await this.assemblyAiService.submitTranscriptFile(tempMp3Path, {
                    languageCode,
                });
                await this.jobService.updateCheckpoint(job.id, leaseToken, {
                    externalTranscriptId,
                });
                await this.audioExtractorService.cleanupTempFile(tempMp3Path);
                tempMp3Path = null;
            }
            else {
                this.logger.log(`[TranscriptionJobProcessor] Resume từ Checkpoint: externalTranscriptId="${externalTranscriptId}" cho Job ${job.id}. Bỏ qua FFmpeg và upload!`);
            }
            const result = await this.assemblyAiService.pollTranscript(externalTranscriptId);
            const session = await this.connection.startSession();
            try {
                await session.withTransaction(async () => {
                    await this.lessonTranscriptRepo.upsertByLessonId(job.lessonId, {
                        rawTranscript: result.rawTranscript,
                        sentences: result.sentences,
                        durationSeconds: result.durationSeconds,
                        languageCode: result.languageCode,
                        externalTranscriptId: result.transcriptId,
                        status: LessonTranscriptionStatusEnum.READY,
                        failureReason: null,
                    }, session);
                    const currentLesson = await this.lessonRepo.findById(job.lessonId, session);
                    const updatedContent = currentLesson?.content
                        ? { ...currentLesson.content, duration: result.durationSeconds }
                        : null;
                    const lessonUpdatePayload = {
                        transcriptionStatus: LessonTranscriptionStatusEnum.READY,
                    };
                    if (updatedContent) {
                        lessonUpdatePayload.content = updatedContent;
                    }
                    await this.lessonRepo.update(job.lessonId, lessonUpdatePayload, session);
                    await this.lessonRepo.incrementInputRevision(job.lessonId, session);
                    await this.jobService.completeJob(job.id, leaseToken, {
                        transcriptId: result.transcriptId,
                        durationSeconds: result.durationSeconds,
                        sentenceCount: result.sentences.length,
                    }, session);
                });
            }
            finally {
                await session.endSession();
            }
            this.logger.log(`[TranscriptionJobProcessor] Hoàn tất trích xuất transcript thành công cho bài học ${job.lessonId} (Job: ${job.id})`);
            msg.ack();
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            this.logger.error(`[TranscriptionJobProcessor] Lỗi khi xử lý Job transcript ${job.id}: ${errorMsg}`, err);
            const isTransient = errorMsg.includes('ECONNRESET') ||
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
                await this.lessonRepo.update(job.lessonId, {
                    transcriptionStatus: LessonTranscriptionStatusEnum.FAILED,
                });
                await this.lessonTranscriptRepo.updateStatusByLessonId(job.lessonId, LessonTranscriptionStatusEnum.FAILED, errorMsg);
            }
            msg.ack();
        }
        finally {
            clearInterval(heartbeatTimer);
            if (tempMp3Path) {
                await this.audioExtractorService.cleanupTempFile(tempMp3Path);
            }
        }
    }
};
TranscriptionJobProcessor = TranscriptionJobProcessor_1 = __decorate([
    Injectable(),
    __param(9, InjectConnection()),
    __metadata("design:paramtypes", [RabbitMqService,
        ConfigService,
        JobService,
        JobRepository,
        LessonRepository,
        LessonTranscriptRepository,
        AudioExtractorService,
        AssemblyAiService,
        StorageService, Function])
], TranscriptionJobProcessor);
export { TranscriptionJobProcessor };
//# sourceMappingURL=transcription-job.processor.js.map