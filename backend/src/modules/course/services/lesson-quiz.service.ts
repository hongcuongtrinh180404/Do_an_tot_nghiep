import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ILessonQuiz } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { LessonQuizRepository } from '../repositories/lesson-quiz.repository.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { SyncLessonQuizzesAtTimestampDto } from '../dto/sync-lesson-quizzes.dto.js';

@Injectable()
export class LessonQuizService extends BaseService<ILessonQuiz, string> {
  protected override readonly logger = new Logger(LessonQuizService.name);

  constructor(
    private readonly lessonQuizRepo: LessonQuizRepository,
    private readonly lessonRepo: LessonRepository,
    cls: ClsService,
  ) {
    super(lessonQuizRepo, cls, LessonQuizService.name);
  }

  /**
   * Lấy toàn bộ danh sách câu hỏi trong video theo bài học (sắp xếp theo timestamp & order)
   */
  async getQuizzesByLessonId(lessonId: string): Promise<ILessonQuiz[]> {
    const trimmedLessonId = lessonId?.trim();
    if (!trimmedLessonId) {
      throw new BadRequestException('ID bài học không được để trống');
    }

    const lesson = await this.lessonRepo.findById(trimmedLessonId);
    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${trimmedLessonId}`);
    }

    return this.lessonQuizRepo.findByLessonId(trimmedLessonId);
  }

  /**
   * Lưu hoặc đồng bộ toàn bộ danh sách câu hỏi tại một mốc thời gian cụ thể của bài học
   */
  async syncQuizzesAtTimestamp(
    lessonId: string,
    dto: SyncLessonQuizzesAtTimestampDto,
  ): Promise<ILessonQuiz[]> {
    const trimmedLessonId = lessonId?.trim();
    if (!trimmedLessonId) {
      throw new BadRequestException('ID bài học không được để trống');
    }

    const lesson = await this.lessonRepo.findById(trimmedLessonId);
    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${trimmedLessonId}`);
    }

    if (dto.timestamp < 0) {
      throw new BadRequestException('Mốc thời gian (timestamp) không hợp lệ');
    }

    // Validate từng câu hỏi
    for (const q of dto.questions) {
      if (!q.question.trim()) {
        throw new BadRequestException(`Nội dung câu hỏi số ${q.order} không được để trống`);
      }
      if (!q.options || q.options.length < 2) {
        throw new BadRequestException(`Câu hỏi số ${q.order} phải có ít nhất 2 phương án trả lời`);
      }
      const hasCorrect = q.options.some((opt) => opt.isCorrect);
      if (!hasCorrect) {
        throw new BadRequestException(`Câu hỏi số ${q.order} phải có ít nhất một đáp án đúng`);
      }
    }

    this.logger.log(
      `Đồng bộ ${dto.questions.length} câu hỏi tại mốc ${dto.timestamp}s cho bài học ${trimmedLessonId}`,
    );

    return this.lessonQuizRepo.syncQuizzesAtTimestamp(
      trimmedLessonId,
      dto.timestamp,
      dto.questions.map((q) => ({
        order: q.order,
        question: q.question.trim(),
        questionType: q.questionType,
        options: q.options.map((opt) => ({
          id: opt.id,
          label: opt.label.trim(),
          text: opt.text.trim(),
          isCorrect: opt.isCorrect,
        })),
        explanation: q.explanation?.trim() || null,
      })),
    );
  }

  /**
   * Xóa một câu hỏi cụ thể theo quizId
   */
  async deleteQuiz(quizId: string): Promise<boolean> {
    const trimmedId = quizId?.trim();
    if (!trimmedId) {
      throw new BadRequestException('ID câu hỏi không được để trống');
    }

    const existing = await this.lessonQuizRepo.findById(trimmedId);
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy câu hỏi với ID: ${trimmedId}`);
    }

    await this.lessonQuizRepo.softDelete(trimmedId);
    return true;
  }

  /**
   * Xóa toàn bộ câu hỏi tại một mốc thời gian cụ thể (cụm +- 2s) của bài học
   */
  async deleteQuizzesAtTimestamp(
    lessonId: string,
    timestamp: number,
  ): Promise<number> {
    const trimmedLessonId = lessonId?.trim();
    if (!trimmedLessonId) {
      throw new BadRequestException('ID bài học không được để trống');
    }

    const lesson = await this.lessonRepo.findById(trimmedLessonId);
    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${trimmedLessonId}`);
    }

    if (timestamp < 0) {
      throw new BadRequestException('Mốc thời gian (timestamp) không hợp lệ');
    }

    this.logger.log(
      `Xóa toàn bộ câu hỏi tại mốc ${timestamp}s cho bài học ${trimmedLessonId}`,
    );

    return this.lessonQuizRepo.deleteQuizzesAtTimestampRange(
      trimmedLessonId,
      timestamp,
      2,
    );
  }
}
