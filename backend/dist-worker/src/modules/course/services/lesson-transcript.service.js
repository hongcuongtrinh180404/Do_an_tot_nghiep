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
var LessonTranscriptService_1;
import { Injectable, Logger, NotFoundException, BadRequestException, Optional, } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { LessonTranscriptionStatusEnum, LessonContentTypeEnum, JobTypeEnum, } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { LessonTranscriptRepository } from '../repositories/lesson-transcript.repository.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
import { StorageService } from '../../storage/index.js';
import { AssemblyAiService } from '../../assemblyai/index.js';
import { AudioExtractorService } from './audio-extractor.service.js';
import { JobService } from '../../jobs/services/job.service.js';
let LessonTranscriptService = LessonTranscriptService_1 = class LessonTranscriptService extends BaseService {
    lessonTranscriptRepo;
    lessonRepo;
    storageService;
    assemblyAiService;
    audioExtractorService;
    jobService;
    sectionRepo;
    logger = new Logger(LessonTranscriptService_1.name);
    constructor(lessonTranscriptRepo, lessonRepo, storageService, assemblyAiService, audioExtractorService, cls, jobService, sectionRepo) {
        super(lessonTranscriptRepo, cls, LessonTranscriptService_1.name);
        this.lessonTranscriptRepo = lessonTranscriptRepo;
        this.lessonRepo = lessonRepo;
        this.storageService = storageService;
        this.assemblyAiService = assemblyAiService;
        this.audioExtractorService = audioExtractorService;
        this.jobService = jobService;
        this.sectionRepo = sectionRepo;
    }
    async getTranscriptByLessonId(lessonId) {
        const trimmedLessonId = lessonId?.trim();
        if (!trimmedLessonId) {
            throw new BadRequestException('ID bài học không được để trống');
        }
        const transcript = await this.lessonTranscriptRepo.findByLessonId(trimmedLessonId);
        if (!transcript) {
            const lesson = await this.lessonRepo.findById(trimmedLessonId);
            if (lesson &&
                (lesson.transcriptionStatus === LessonTranscriptionStatusEnum.TRANSCRIBING ||
                    lesson.transcriptionStatus === LessonTranscriptionStatusEnum.QUEUED)) {
                return {
                    id: '',
                    lessonId: trimmedLessonId,
                    rawTranscript: '',
                    sentences: [],
                    durationSeconds: lesson.content?.duration || 0,
                    languageCode: 'vi',
                    externalTranscriptId: null,
                    status: lesson.transcriptionStatus,
                    failureReason: null,
                };
            }
            throw new NotFoundException(`Không tìm thấy bản ghi transcript cho bài học ${trimmedLessonId}`);
        }
        return transcript;
    }
    triggerTranscription(lessonId, videoKeyOrUrl) {
        const trimmedLessonId = lessonId?.trim();
        const trimmedKey = videoKeyOrUrl?.trim();
        if (!trimmedLessonId || !trimmedKey) {
            this.logger.warn(`Bỏ qua kích hoạt transcript do thiếu lessonId (${trimmedLessonId}) hoặc videoKey (${trimmedKey})`);
            return;
        }
        this.logger.log(`Bắt đầu xếp hàng trích xuất transcript cho bài học ${trimmedLessonId}`);
        void (async () => {
            try {
                await this.lessonRepo.update(trimmedLessonId, {
                    transcriptionStatus: LessonTranscriptionStatusEnum.TRANSCRIBING,
                });
                await this.lessonTranscriptRepo.upsertByLessonId(trimmedLessonId, {
                    status: LessonTranscriptionStatusEnum.TRANSCRIBING,
                    failureReason: null,
                });
                await this.processTranscriptionTask(trimmedLessonId, trimmedKey);
            }
            catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                this.logger.error(`Tiến trình trích xuất transcript cho bài học ${trimmedLessonId} thất bại: ${errorMsg}`, err);
                await this.lessonRepo.update(trimmedLessonId, {
                    transcriptionStatus: LessonTranscriptionStatusEnum.FAILED,
                });
                await this.lessonTranscriptRepo.updateStatusByLessonId(trimmedLessonId, LessonTranscriptionStatusEnum.FAILED, errorMsg);
            }
        })();
    }
    async processTranscriptionTask(lessonId, videoKeyOrUrl) {
        this.logger.log(`[Task] Bắt đầu chuẩn bị nguồn video từ MinIO cho bài học ${lessonId} (key: ${videoKeyOrUrl})...`);
        const presignedVideoUrl = await this.storageService.getPresignedStreamUrl(videoKeyOrUrl, 3600);
        let tempAudioPath = null;
        try {
            this.logger.log(`[Task] Đang trích xuất audio MP3 tối ưu (16kHz, mono, 64kbps) qua FFmpeg cho bài học ${lessonId}...`);
            tempAudioPath = await this.audioExtractorService.extractMp3FromVideo(presignedVideoUrl, lessonId);
            this.logger.log(`[Task] Đang gửi tệp MP3 tới AssemblyAI để trích xuất transcript bài giảng...`);
            const result = await this.assemblyAiService.transcribeFile(tempAudioPath, {
                languageCode: 'vi',
            });
            this.logger.log(`[Task] AssemblyAI hoàn thành cho bài học ${lessonId}. Số câu: ${result.sentences.length}, độ dài: ${result.durationSeconds}s`);
            await this.lessonTranscriptRepo.upsertByLessonId(lessonId, {
                rawTranscript: result.rawTranscript,
                sentences: result.sentences,
                durationSeconds: result.durationSeconds,
                languageCode: result.languageCode,
                externalTranscriptId: result.transcriptId,
                status: LessonTranscriptionStatusEnum.READY,
                failureReason: null,
            });
            const lesson = await this.lessonRepo.findById(lessonId);
            if (lesson) {
                const updatedContent = lesson.content
                    ? { ...lesson.content, duration: result.durationSeconds }
                    : null;
                await this.lessonRepo.update(lessonId, {
                    transcriptionStatus: LessonTranscriptionStatusEnum.READY,
                    content: updatedContent,
                });
            }
            this.logger.log(`[Task] Đã lưu transcript thành công và chuyển trạng thái bài học ${lessonId} sang READY.`);
        }
        finally {
            if (tempAudioPath) {
                await this.audioExtractorService.cleanupTempFile(tempAudioPath);
            }
        }
    }
    async retryTranscription(lessonId) {
        const trimmedId = lessonId?.trim();
        if (!trimmedId) {
            throw new BadRequestException('ID bài học không được để trống');
        }
        const lesson = await this.lessonRepo.findById(trimmedId);
        if (!lesson) {
            throw new NotFoundException(`Không tìm thấy bài học với ID ${trimmedId}`);
        }
        if (lesson.content?.type !== LessonContentTypeEnum.VIDEO || !lesson.content?.url) {
            throw new BadRequestException('Bài học này không có nội dung video để trích xuất transcript');
        }
        const fileKey = lesson.content.publicId || lesson.content.url;
        if (this.jobService) {
            let courseId = '';
            if (this.sectionRepo && lesson.sectionId) {
                const section = await this.sectionRepo.findById(lesson.sectionId);
                courseId = section?.courseId || '';
            }
            const userId = this.getCurrentUserId() || lesson.createdById || 'system';
            await this.jobService.createJob({
                type: JobTypeEnum.TRANSCRIPTION,
                lessonId: trimmedId,
                courseId,
                requestedById: userId,
                parameters: { videoKey: fileKey },
            });
            await this.lessonRepo.update(trimmedId, {
                transcriptionStatus: LessonTranscriptionStatusEnum.QUEUED,
            });
            await this.lessonTranscriptRepo.upsertByLessonId(trimmedId, {
                status: LessonTranscriptionStatusEnum.QUEUED,
                failureReason: null,
            });
            return;
        }
        this.triggerTranscription(trimmedId, fileKey);
    }
};
LessonTranscriptService = LessonTranscriptService_1 = __decorate([
    Injectable(),
    __param(6, Optional()),
    __param(7, Optional()),
    __metadata("design:paramtypes", [LessonTranscriptRepository,
        LessonRepository,
        StorageService,
        AssemblyAiService,
        AudioExtractorService,
        ClsService,
        JobService,
        SectionRepository])
], LessonTranscriptService);
export { LessonTranscriptService };
//# sourceMappingURL=lesson-transcript.service.js.map