import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import {
  ILessonTranscript,
  LessonTranscriptionStatusEnum,
  LessonContentTypeEnum,
} from 'share-lib';
import { BaseService } from '../../base/index.js';
import { LessonTranscriptRepository } from '../repositories/lesson-transcript.repository.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { StorageService } from '../../storage/index.js';
import { AssemblyAiService } from '../../assemblyai/index.js';

@Injectable()
export class LessonTranscriptService extends BaseService<ILessonTranscript, string> {
  protected override readonly logger = new Logger(LessonTranscriptService.name);

  constructor(
    private readonly lessonTranscriptRepo: LessonTranscriptRepository,
    private readonly lessonRepo: LessonRepository,
    private readonly storageService: StorageService,
    private readonly assemblyAiService: AssemblyAiService,
    cls: ClsService,
  ) {
    super(lessonTranscriptRepo, cls, LessonTranscriptService.name);
  }

  /**
   * Lấy transcript chi tiết của bài học theo lessonId
   */
  async getTranscriptByLessonId(lessonId: string): Promise<ILessonTranscript> {
    const trimmedLessonId = lessonId?.trim();
    if (!trimmedLessonId) {
      throw new BadRequestException('ID bài học không được để trống');
    }

    const transcript = await this.lessonTranscriptRepo.findByLessonId(trimmedLessonId);
    if (!transcript) {
      throw new NotFoundException(`Không tìm thấy bản ghi transcript cho bài học ${trimmedLessonId}`);
    }

    return transcript;
  }

  /**
   * Kích hoạt tiến trình trích xuất transcript bất đồng bộ (Non-blocking)
   */
  triggerTranscription(lessonId: string, videoKeyOrUrl: string): void {
    const trimmedLessonId = lessonId?.trim();
    const trimmedKey = videoKeyOrUrl?.trim();
    if (!trimmedLessonId || !trimmedKey) {
      this.logger.warn(`Bỏ qua kích hoạt transcript do thiếu lessonId (${trimmedLessonId}) hoặc videoKey (${trimmedKey})`);
      return;
    }

    this.logger.log(`Bắt đầu xếp hàng trích xuất transcript cho bài học ${trimmedLessonId}`);

    // Cập nhật trạng thái ngay lập tức
    void (async () => {
      try {
        await this.lessonRepo.update(trimmedLessonId, {
          transcriptionStatus: LessonTranscriptionStatusEnum.TRANSCRIBING,
        });

        await this.lessonTranscriptRepo.upsertByLessonId(trimmedLessonId, {
          status: LessonTranscriptionStatusEnum.TRANSCRIBING,
          failureReason: null,
        });

        // Chạy tác vụ nền
        await this.processTranscriptionTask(trimmedLessonId, trimmedKey);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          `Tiến trình trích xuất transcript cho bài học ${trimmedLessonId} thất bại: ${errorMsg}`,
          err,
        );

        await this.lessonRepo.update(trimmedLessonId, {
          transcriptionStatus: LessonTranscriptionStatusEnum.FAILED,
        });

        await this.lessonTranscriptRepo.updateStatusByLessonId(
          trimmedLessonId,
          LessonTranscriptionStatusEnum.FAILED,
          errorMsg,
        );
      }
    })();
  }

  /**
   * Xử lý trích xuất: MinIO Stream -> AssemblyAI -> MongoDB
   */
  async processTranscriptionTask(lessonId: string, videoKeyOrUrl: string): Promise<void> {
    this.logger.log(`[Task] Đang lấy stream video từ MinIO cho bài học ${lessonId} (key: ${videoKeyOrUrl})...`);
    const audioStream = await this.storageService.getObjectStream(videoKeyOrUrl);

    this.logger.log(`[Task] Đang gửi stream tới AssemblyAI để trích xuất transcript bài giảng...`);
    const result = await this.assemblyAiService.transcribeStream(audioStream, {
      languageCode: 'vi',
    });

    this.logger.log(
      `[Task] AssemblyAI hoàn thành cho bài học ${lessonId}. Số câu: ${result.sentences.length}, độ dài: ${result.durationSeconds}s`,
    );

    // Lưu transcript hoàn chỉnh vào collection lesson_transcripts
    await this.lessonTranscriptRepo.upsertByLessonId(lessonId, {
      rawTranscript: result.rawTranscript,
      sentences: result.sentences,
      durationSeconds: result.durationSeconds,
      languageCode: result.languageCode,
      externalTranscriptId: result.transcriptId,
      status: LessonTranscriptionStatusEnum.READY,
      failureReason: null,
    });

    // Cập nhật trạng thái bài học và thời lượng video nếu có
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

  /**
   * Thử lại quy trình trích xuất transcript khi gặp lỗi
   */
  async retryTranscription(lessonId: string): Promise<void> {
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
    this.triggerTranscription(trimmedId, fileKey);
  }
}
