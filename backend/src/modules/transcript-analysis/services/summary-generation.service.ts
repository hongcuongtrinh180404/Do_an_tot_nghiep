import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ClientSession } from 'mongoose';
import {
  ILessonSummary,
  ILessonSummaryData,
  LessonTranscriptionStatusEnum,
} from 'share-lib';
import { GeminiService } from '../../gemini/index.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonTranscriptRepository } from '../../course/repositories/lesson-transcript.repository.js';
import { LessonSummaryRepository } from '../../course/repositories/lesson-summary.repository.js';
import { SummaryValidator } from '../validators/summary.validator.js';
import { GenerateSummaryDto } from '../dto/generate-summary.dto.js';
import { UpdateLessonSummaryDto } from '../dto/update-summary.dto.js';

export interface ValidatedSummaryContent {
  lessonId: string;
  lessonTitle: string;
  summary: ILessonSummaryData;
  metadata: {
    model: string;
    keyIndex: number;
    maskedKey: string;
    executionTimeMs: number;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
  currentInputRevision: number;
  currentOutputRevision: number;
}

export interface SummaryGenerationResponse {
  lessonId: string;
  summary: ILessonSummaryData;
  metadata: {
    model: string;
    keyIndex: number;
    maskedKey: string;
    executionTimeMs: number;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
}

export interface PersistSummaryOptions {
  saveAsDraft?: boolean;
  expectedRevision?: number;
  userId?: string;
  session?: ClientSession;
}

@Injectable()
export class SummaryGenerationService {
  private readonly logger = new Logger(SummaryGenerationService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly lessonRepo: LessonRepository,
    private readonly lessonTranscriptRepo: LessonTranscriptRepository,
    private readonly lessonSummaryRepo: LessonSummaryRepository,
  ) {}

  /**
   * Định dạng transcript với mốc giây để Gemini trích xuất timestamp cho các ý chính
   */
  public formatTranscriptWithTimestamps(
    sentences: Array<{ text: string; start: number; end: number }>,
    rawTranscript: string,
  ): string {
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

  /**
   * Xây dựng Prompt tóm tắt bài học tiếng Việt
   */
  public buildSummaryPrompt(
    lessonTitle: string,
    durationSeconds: number,
    formattedTranscript: string,
  ): string {
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

  /**
   * BƯỚC 1: Sinh và kiểm tra hợp lệ bản tóm tắt (Thuần túy tính toán + gọi AI ngoại vi, KHÔNG mở DB transaction)
   */
  async generateSummaryContent(
    lessonId: string,
    options?: {
      dto?: GenerateSummaryDto;
      expectedInputRevision?: number;
    },
  ): Promise<ValidatedSummaryContent> {
    const trimmedLessonId = lessonId?.trim();
    if (!trimmedLessonId) {
      throw new BadRequestException('ID bài học không được để trống.');
    }

    // 1. Kiểm tra bài học
    const lesson = await this.lessonRepo.findById(trimmedLessonId);
    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${trimmedLessonId}`);
    }

    // 2. Kiểm tra input revision nếu có yêu cầu
    if (
      typeof options?.expectedInputRevision === 'number' &&
      (lesson.analysisInputRevision ?? 0) !== options.expectedInputRevision
    ) {
      throw new ConflictException(
        `INPUT_CHANGED: Nội dung transcript bài học đã thay đổi (hiện tại: ${lesson.analysisInputRevision ?? 0}, yêu cầu: ${options.expectedInputRevision})`,
      );
    }

    // 3. Lấy transcript
    const transcript = await this.lessonTranscriptRepo.findByLessonId(trimmedLessonId);
    if (!transcript) {
      throw new BadRequestException(
        `Bài học "${lesson.title}" chưa có dữ liệu transcript. Vui lòng trích xuất transcript trước.`,
      );
    }

    if (transcript.status !== LessonTranscriptionStatusEnum.READY) {
      throw new BadRequestException(
        `Trạng thái trích xuất transcript là: ${transcript.status}. Chưa sẵn sàng để phân tích AI.`,
      );
    }

    const durationSeconds =
      transcript.durationSeconds || lesson.content?.duration || 600;

    const formattedTranscript = this.formatTranscriptWithTimestamps(
      transcript.sentences,
      transcript.rawTranscript,
    );

    if (!formattedTranscript) {
      throw new BadRequestException('Nội dung transcript rỗng, không đủ dữ liệu để phân tích.');
    }

    this.logger.log(
      `Bắt đầu sinh bản tóm tắt (Summary) cho bài học ${trimmedLessonId} ("${lesson.title}").`,
    );

    // 4. Xây dựng prompt
    const prompt = this.buildSummaryPrompt(
      lesson.title,
      durationSeconds,
      formattedTranscript,
    );

    // 5. Gọi Gemini
    const geminiResult = await this.geminiService.generateJson<ILessonSummaryData>(
      prompt,
      {
        temperature: 0.25,
      },
    );

    // 6. Kiểm tra tính hợp lệ
    SummaryValidator.validateOrFail(geminiResult.data, durationSeconds);

    return {
      lessonId: trimmedLessonId,
      lessonTitle: lesson.title,
      summary: geminiResult.data,
      metadata: {
        model: geminiResult.model,
        keyIndex: geminiResult.keyIndex,
        maskedKey: geminiResult.maskedKey,
        executionTimeMs: geminiResult.executionTimeMs,
        usage: geminiResult.usage,
      },
      currentInputRevision: lesson.analysisInputRevision ?? 0,
      currentOutputRevision: lesson.analysisOutputRevisions?.summary ?? 0,
    };
  }

  /**
   * BƯỚC 2: Lưu vào DB có session (Chạy trong transaction ngắn)
   */
  async persistSummaryWithSession(
    lessonId: string,
    summaryData: ILessonSummaryData,
    options: PersistSummaryOptions,
  ): Promise<ILessonSummary> {
    const trimmedLessonId = lessonId?.trim();
    if (!trimmedLessonId) {
      throw new BadRequestException('ID bài học không được để trống.');
    }

    // 1. Kiểm tra và tăng revision có điều kiện (nếu có expectedRevision)
    if (typeof options.expectedRevision === 'number') {
      const revisionUpdated = await this.lessonRepo.incrementOutputRevision(
        trimmedLessonId,
        'summary',
        options.expectedRevision,
        options.session,
      );
      if (!revisionUpdated) {
        throw new ConflictException(
          'TARGET_CHANGED: Bản tóm tắt bài học đã bị thay đổi bởi thao tác khác',
        );
      }
    } else {
      await this.lessonRepo.incrementOutputRevision(
        trimmedLessonId,
        'summary',
        undefined,
        options.session,
      );
    }

    // 2. Lưu vào LessonSummary collection
    const shouldSaveDraft = options.saveAsDraft ?? false;
    if (shouldSaveDraft) {
      const draftResult = options.session
        ? await this.lessonSummaryRepo.saveDraftByLessonId(
            trimmedLessonId,
            summaryData,
            options.userId,
            options.session,
          )
        : await this.lessonSummaryRepo.saveDraftByLessonId(
            trimmedLessonId,
            summaryData,
            options.userId,
          );
      this.logger.log(`Đã lưu bản nháp Summary cho bài học ${trimmedLessonId}`);
      return draftResult;
    }

    const officialResult = options.session
      ? await this.lessonSummaryRepo.upsertOfficialByLessonId(
          trimmedLessonId,
          summaryData,
          options.userId,
          options.session,
        )
      : await this.lessonSummaryRepo.upsertOfficialByLessonId(
          trimmedLessonId,
          summaryData,
          options.userId,
        );
    this.logger.log(`Đã lưu bản tóm tắt chính thức cho bài học ${trimmedLessonId}`);
    return officialResult;
  }

  /**
   * Sinh bản tóm tắt bài học từ transcript (đường đồng bộ truyền thống)
   */
  async generateSummary(
    lessonId: string,
    dto?: GenerateSummaryDto,
    userId?: string,
  ): Promise<SummaryGenerationResponse> {
    const validatedContent = await this.generateSummaryContent(lessonId, { dto });

    await this.persistSummaryWithSession(lessonId, validatedContent.summary, {
      saveAsDraft: dto?.saveAsDraft ?? false,
      userId,
    });

    return {
      lessonId: validatedContent.lessonId,
      summary: validatedContent.summary,
      metadata: validatedContent.metadata,
    };
  }

  /**
   * Cập nhật trực tiếp bản tóm tắt bài học chính thức do giảng viên chỉnh sửa
   */
  async updateSummary(
    lessonId: string,
    dto: UpdateLessonSummaryDto,
    userId?: string,
  ): Promise<ILessonSummary> {
    const trimmedLessonId = lessonId?.trim();
    if (!trimmedLessonId) {
      throw new BadRequestException('ID bài học không được để trống.');
    }

    const lesson = await this.lessonRepo.findById(trimmedLessonId);
    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${trimmedLessonId}`);
    }

    const summaryData: ILessonSummaryData = {
      title: dto.title.trim(),
      overview: dto.overview.trim(),
      keyPoints: dto.keyPoints.map((point) => ({
        title: point.title.trim(),
        content: point.content.trim(),
        timestamp:
          point.timestamp !== undefined && point.timestamp !== null
            ? Math.max(0, Math.floor(point.timestamp))
            : undefined,
      })),
    };

    const updated = await this.lessonSummaryRepo.upsertOfficialByLessonId(
      trimmedLessonId,
      summaryData,
      userId,
    );

    // Tăng revision để vô hiệu hóa các worker cũ đang chạy ngầm
    await this.lessonRepo.incrementOutputRevision(trimmedLessonId, 'summary');

    this.logger.log(
      `Giảng viên đã cập nhật trực tiếp bản tóm tắt bài học ${trimmedLessonId}`,
    );
    return updated;
  }

  /**
   * Lấy tóm tắt hiện tại của bài học (gồm bản chính thức và bản nháp nếu có)
   */
  async getSummary(lessonId: string): Promise<ILessonSummary | null> {
    const trimmedId = lessonId?.trim();
    if (!trimmedId) {
      throw new BadRequestException('ID bài học không được để trống.');
    }

    return this.lessonSummaryRepo.findByLessonId(trimmedId);
  }

  /**
   * Áp dụng bản nháp Summary thành kết quả chính thức cho bài học
   */
  async applyDraft(lessonId: string, userId?: string): Promise<ILessonSummary> {
    const trimmedId = lessonId?.trim();
    if (!trimmedId) {
      throw new BadRequestException('ID bài học không được để trống.');
    }

    const applied = await this.lessonSummaryRepo.applyDraftByLessonId(
      trimmedId,
      userId,
    );

    if (!applied) {
      throw new BadRequestException(
        'Không tìm thấy bản nháp Summary nào để áp dụng cho bài học này.',
      );
    }

    // Tăng revision khi apply draft
    await this.lessonRepo.incrementOutputRevision(trimmedId, 'summary');

    this.logger.log(`Đã áp dụng bản nháp Summary thành chính thức cho bài học ${trimmedId}`);
    return applied;
  }
}
