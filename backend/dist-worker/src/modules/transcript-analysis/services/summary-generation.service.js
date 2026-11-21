var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SummaryGenerationService_1;
import { Injectable, Logger, NotFoundException, BadRequestException, } from '@nestjs/common';
import { LessonTranscriptionStatusEnum, } from 'share-lib';
import { GeminiService } from '../../gemini/index.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonTranscriptRepository } from '../../course/repositories/lesson-transcript.repository.js';
import { LessonSummaryRepository } from '../../course/repositories/lesson-summary.repository.js';
import { SummaryValidator } from '../validators/summary.validator.js';
let SummaryGenerationService = SummaryGenerationService_1 = class SummaryGenerationService {
    geminiService;
    lessonRepo;
    lessonTranscriptRepo;
    lessonSummaryRepo;
    logger = new Logger(SummaryGenerationService_1.name);
    constructor(geminiService, lessonRepo, lessonTranscriptRepo, lessonSummaryRepo) {
        this.geminiService = geminiService;
        this.lessonRepo = lessonRepo;
        this.lessonTranscriptRepo = lessonTranscriptRepo;
        this.lessonSummaryRepo = lessonSummaryRepo;
    }
    formatTranscriptWithTimestamps(sentences, rawTranscript) {
        if (sentences && sentences.length > 0) {
            return sentences
                .map((s) => {
                const startSec = Math.floor(s.start / 1000);
                const mins = Math.floor(startSec / 60)
                    .toString()
                    .padStart(2, '0');
                const secs = (startSec % 60).toString().padStart(2, '0');
                return `[${mins}:${secs} - ${startSec}s] ${s.text.trim()}`;
            })
                .join('\n');
        }
        return rawTranscript?.trim() || '';
    }
    buildSummaryPrompt(lessonTitle, durationSeconds, formattedTranscript) {
        return `Bạn là một chuyên gia tổng hợp kiến thức và sư phạm trực tuyến.
Nhiệm vụ của bạn là phân tích transcript video bài giảng và tạo ra một BẢN TÓM TẮT BÀI HỌC (Summary) toàn diện, súc tích và dễ hiểu.

THÔNG TIN BÀI GIẢNG:
- Tiêu đề bài học: "${lessonTitle}"
- Thời lượng video: ${durationSeconds} giây

QUY TẮC CẤU TRÚC BẢN TÓM TẮT BẮT BUỘC:
1. "title": Tiêu đề súc tích của bản tóm tắt bài học (thường là hoặc liên quan đến tiêu đề bài học).
2. "overview": Đoạn văn tổng quan súc tích từ 2 đến 4 câu, giới thiệu mục tiêu và giá trị cốt lõi bài học mang lại.
3. "keyPoints": Mảng từ 3 đến 8 ý chính then chốt được truyền tải trong bài học. Mỗi ý chính gồm:
   - "title": Tiêu đề ngắn gọn của ý chính (dưới 10 từ).
   - "content": Diễn giải chi tiết nội dung ý chính (từ 1 đến 3 câu hoàn chỉnh).
   - "timestamp": Mốc thời gian (tính bằng GIÂY, số nguyên từ 0 đến ${durationSeconds}) trong video bắt đầu đề cập đến ý đó để người học tiện tua lại.

ĐỊNH DẠNG ĐẦU RA (BẮT BUỘC LÀ JSON THUẦN HỢP LỆ, KHÔNG CÓ TRƯỜNG CONCLUSION):
{
  "title": "${lessonTitle}",
  "overview": "Đoạn văn tổng quan bài học...",
  "keyPoints": [
    {
      "title": "Tên ý chính 1",
      "content": "Nội dung diễn giải ý chính 1...",
      "timestamp": 15
    },
    {
      "title": "Tên ý chính 2",
      "content": "Nội dung diễn giải ý chính 2...",
      "timestamp": 60
    }
  ]
}

TRANSCRIPT BÀI GIẢNG CÓ MỐC THỜI GIAN:
${formattedTranscript}`;
    }
    async generateSummary(lessonId, dto, userId) {
        const trimmedLessonId = lessonId?.trim();
        if (!trimmedLessonId) {
            throw new BadRequestException('ID bài học không được để trống.');
        }
        const lesson = await this.lessonRepo.findById(trimmedLessonId);
        if (!lesson) {
            throw new NotFoundException(`Không tìm thấy bài học với ID: ${trimmedLessonId}`);
        }
        const transcript = await this.lessonTranscriptRepo.findByLessonId(trimmedLessonId);
        if (!transcript) {
            throw new BadRequestException(`Bài học "${lesson.title}" chưa có dữ liệu transcript. Vui lòng trích xuất transcript trước.`);
        }
        if (transcript.status !== LessonTranscriptionStatusEnum.READY) {
            throw new BadRequestException(`Trạng thái trích xuất transcript là: ${transcript.status}. Chưa sẵn sàng để phân tích AI.`);
        }
        const durationSeconds = transcript.durationSeconds || lesson.content?.duration || 600;
        const formattedTranscript = this.formatTranscriptWithTimestamps(transcript.sentences, transcript.rawTranscript);
        if (!formattedTranscript) {
            throw new BadRequestException('Nội dung transcript rỗng, không đủ dữ liệu để phân tích.');
        }
        this.logger.log(`Bắt đầu sinh bản tóm tắt (Summary) cho bài học ${trimmedLessonId} ("${lesson.title}").`);
        const prompt = this.buildSummaryPrompt(lesson.title, durationSeconds, formattedTranscript);
        const geminiResult = await this.geminiService.generateJson(prompt, {
            temperature: 0.25,
        });
        SummaryValidator.validateOrFail(geminiResult.data, durationSeconds);
        const shouldSaveDraft = dto?.saveAsDraft ?? false;
        if (shouldSaveDraft) {
            await this.lessonSummaryRepo.saveDraftByLessonId(trimmedLessonId, geminiResult.data, userId);
            this.logger.log(`Đã lưu bản nháp Summary cho bài học ${trimmedLessonId}`);
        }
        else {
            await this.lessonSummaryRepo.upsertOfficialByLessonId(trimmedLessonId, geminiResult.data, userId);
            this.logger.log(`Đã lưu bản tóm tắt chính thức cho bài học ${trimmedLessonId}`);
        }
        return {
            lessonId: trimmedLessonId,
            summary: geminiResult.data,
            metadata: {
                model: geminiResult.model,
                keyIndex: geminiResult.keyIndex,
                maskedKey: geminiResult.maskedKey,
                executionTimeMs: geminiResult.executionTimeMs,
                usage: geminiResult.usage,
            },
        };
    }
    async updateSummary(lessonId, dto, userId) {
        const trimmedLessonId = lessonId?.trim();
        if (!trimmedLessonId) {
            throw new BadRequestException('ID bài học không được để trống.');
        }
        const lesson = await this.lessonRepo.findById(trimmedLessonId);
        if (!lesson) {
            throw new NotFoundException(`Không tìm thấy bài học với ID: ${trimmedLessonId}`);
        }
        const summaryData = {
            title: dto.title.trim(),
            overview: dto.overview.trim(),
            keyPoints: dto.keyPoints.map((point) => ({
                title: point.title.trim(),
                content: point.content.trim(),
                timestamp: point.timestamp !== undefined && point.timestamp !== null
                    ? Math.max(0, Math.floor(point.timestamp))
                    : undefined,
            })),
        };
        const updated = await this.lessonSummaryRepo.upsertOfficialByLessonId(trimmedLessonId, summaryData, userId);
        this.logger.log(`Giảng viên đã cập nhật trực tiếp bản tóm tắt bài học ${trimmedLessonId}`);
        return updated;
    }
    async getSummary(lessonId) {
        const trimmedId = lessonId?.trim();
        if (!trimmedId) {
            throw new BadRequestException('ID bài học không được để trống.');
        }
        return this.lessonSummaryRepo.findByLessonId(trimmedId);
    }
    async applyDraft(lessonId, userId) {
        const trimmedId = lessonId?.trim();
        if (!trimmedId) {
            throw new BadRequestException('ID bài học không được để trống.');
        }
        const applied = await this.lessonSummaryRepo.applyDraftByLessonId(trimmedId, userId);
        if (!applied) {
            throw new BadRequestException('Không tìm thấy bản nháp Summary nào để áp dụng cho bài học này.');
        }
        this.logger.log(`Đã áp dụng bản nháp Summary thành chính thức cho bài học ${trimmedId}`);
        return applied;
    }
};
SummaryGenerationService = SummaryGenerationService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [GeminiService,
        LessonRepository,
        LessonTranscriptRepository,
        LessonSummaryRepository])
], SummaryGenerationService);
export { SummaryGenerationService };
//# sourceMappingURL=summary-generation.service.js.map