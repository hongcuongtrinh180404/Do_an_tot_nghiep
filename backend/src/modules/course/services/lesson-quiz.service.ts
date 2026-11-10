import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ILessonQuiz, CourseStatusEnum, QuizQuestionTypeEnum } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { LessonQuizRepository } from '../repositories/lesson-quiz.repository.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { SyncLessonQuizzesAtTimestampDto } from '../dto/sync-lesson-quizzes.dto.js';
import { MoveMergeLessonQuizzesDto } from '../dto/move-merge-lesson-quizzes.dto.js';
import { SaveLessonQuizDto } from '../dto/save-lesson-quiz.dto.js';

@Injectable()
export class LessonQuizService extends BaseService<ILessonQuiz, string> {
  protected override readonly logger = new Logger(LessonQuizService.name);

  constructor(
    private readonly lessonQuizRepo: LessonQuizRepository,
    private readonly lessonRepo: LessonRepository,
    cls: ClsService,
    @Optional() private readonly sectionRepo?: SectionRepository,
    @Optional() private readonly courseRepo?: CourseRepository,
  ) {
    super(lessonQuizRepo, cls, LessonQuizService.name);
  }

  private async assertNotPendingApproval(lessonId: string): Promise<void> {
    if (this.sectionRepo && this.courseRepo) {
      const lesson = await this.lessonRepo.findById(lessonId);
      if (lesson) {
        const section = await this.sectionRepo.findById(lesson.sectionId);
        if (section) {
          const course = await this.courseRepo.findById(section.courseId);
          if (course && course.status === CourseStatusEnum.PENDING_APPROVAL) {
            throw new ConflictException(
              'Khóa học đang trong quá trình chờ phê duyệt, không thể chỉnh sửa câu hỏi video.',
            );
          }
        }
      }
    }
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

  private normalizeQuiz(dto: SaveLessonQuizDto, duration?: number): SaveLessonQuizDto {
    if (!Number.isSafeInteger(dto.timestamp) || dto.timestamp < 0) {
      throw new BadRequestException('Mốc thời gian phải là số giây nguyên không âm');
    }
    if (duration && Number.isFinite(duration) && dto.timestamp > duration) {
      throw new BadRequestException('Mốc thời gian không được vượt quá thời lượng video');
    }
    if (!dto.question.trim()) {
      throw new BadRequestException('Nội dung câu hỏi không được để trống');
    }
    if (!Object.values(QuizQuestionTypeEnum).includes(dto.questionType)) {
      throw new BadRequestException('Hình thức câu hỏi không hợp lệ');
    }
    if (!dto.options || dto.options.length < 2) {
      throw new BadRequestException('Câu hỏi phải có ít nhất 2 phương án trả lời');
    }

    const options = dto.options.map((option) => ({
      ...option,
      id: option.id.trim(),
      label: option.label.trim(),
      text: option.text.trim(),
    }));
    if (options.some((option) => !option.id || !option.label || !option.text)) {
      throw new BadRequestException('Vui lòng nhập đầy đủ nội dung các phương án trả lời');
    }
    if (new Set(options.map((option) => option.id)).size !== options.length ||
        new Set(options.map((option) => option.label)).size !== options.length) {
      throw new BadRequestException('Mã và nhãn của các phương án trả lời không được trùng nhau');
    }

    const correctCount = options.filter((option) => option.isCorrect).length;
    if (correctCount === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất một đáp án đúng');
    }
    if (dto.questionType === QuizQuestionTypeEnum.SINGLE && correctCount !== 1) {
      throw new BadRequestException('Câu hỏi một đáp án đúng phải có đúng một phương án chính xác');
    }

    return {
      timestamp: dto.timestamp,
      question: dto.question.trim(),
      questionType: dto.questionType,
      options,
      explanation: dto.explanation?.trim() || null,
    };
  }

  private async getNextQuizOrder(lessonId: string, timestamp: number): Promise<number> {
    const quizzes = await this.lessonQuizRepo.findByLessonIdAndTimestamp(lessonId, timestamp);
    return quizzes.reduce((max, quiz) => Math.max(max, quiz.order), 0) + 1;
  }

  async createQuiz(lessonId: string, dto: SaveLessonQuizDto): Promise<ILessonQuiz> {
    const trimmedLessonId = lessonId?.trim();
    if (!trimmedLessonId) {
      throw new BadRequestException('ID bài học không được để trống');
    }
    const lesson = await this.lessonRepo.findById(trimmedLessonId);
    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học');
    }
    await this.assertNotPendingApproval(trimmedLessonId);
    const payload = this.normalizeQuiz(dto, lesson.content?.duration);
    const order = await this.getNextQuizOrder(trimmedLessonId, payload.timestamp);
    return super.create({ ...payload, lessonId: trimmedLessonId, order });
  }

  async updateQuiz(quizId: string, dto: SaveLessonQuizDto): Promise<ILessonQuiz> {
    const trimmedId = quizId?.trim();
    if (!trimmedId) {
      throw new BadRequestException('ID câu hỏi không được để trống');
    }
    const existing = await this.lessonQuizRepo.findById(trimmedId);
    if (!existing) {
      throw new NotFoundException('Không tìm thấy câu hỏi');
    }
    const lesson = await this.lessonRepo.findById(existing.lessonId);
    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học');
    }
    await this.assertNotPendingApproval(existing.lessonId);
    const payload = this.normalizeQuiz(dto, lesson.content?.duration);
    const order = payload.timestamp === existing.timestamp
      ? existing.order
      : await this.getNextQuizOrder(existing.lessonId, payload.timestamp);
    const updated = await super.update(trimmedId, { ...payload, order });
    if (!updated) {
      throw new NotFoundException('Câu hỏi đã bị xóa hoặc không còn tồn tại');
    }
    return updated;
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

    await this.assertNotPendingApproval(trimmedLessonId);

    const normalized = dto.questions.map((question) => ({
      ...this.normalizeQuiz({ ...question, timestamp: dto.timestamp }, lesson.content?.duration),
      id: question.id, order: question.order,
    }));
    if (!Number.isSafeInteger(dto.timestamp) || dto.timestamp < 0 ||
      (lesson.content?.duration && dto.timestamp > lesson.content.duration)) {
      throw new BadRequestException('Mốc thời gian (timestamp) không hợp lệ');
    }

    this.logger.log(
      `Đồng bộ ${dto.questions.length} câu hỏi tại mốc ${dto.timestamp}s cho bài học ${trimmedLessonId}`,
    );

    return this.lessonQuizRepo.syncQuizzesAtTimestamp(
      trimmedLessonId,
      dto.timestamp,
      normalized.map((q) => ({
        id: q.id,
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

    await this.assertNotPendingApproval(existing.lessonId);

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

    await this.assertNotPendingApproval(trimmedLessonId);

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

  /**
   * Di chuyển hoặc gộp cụm câu hỏi từ mốc thời gian nguồn sang mốc đích
   */
  async moveOrMergeQuizCluster(
    lessonId: string,
    dto: MoveMergeLessonQuizzesDto,
  ): Promise<ILessonQuiz[]> {
    const trimmedLessonId = lessonId?.trim();
    if (!trimmedLessonId) {
      throw new BadRequestException('ID bài học không được để trống');
    }

    const lesson = await this.lessonRepo.findById(trimmedLessonId);
    if (!lesson) {
      throw new NotFoundException(`Không tìm thấy bài học với ID: ${trimmedLessonId}`);
    }

    await this.assertNotPendingApproval(trimmedLessonId);

    if (dto.sourceTimestamp < 0 || dto.targetTimestamp < 0) {
      throw new BadRequestException('Mốc thời gian (timestamp) không hợp lệ');
    }

    this.logger.log(
      `Di chuyển/Gộp cụm câu hỏi từ mốc ${dto.sourceTimestamp}s sang ${dto.targetTimestamp}s cho bài học ${trimmedLessonId}`,
    );

    try {
      return await this.lessonQuizRepo.withTransaction(async (session) => {
        return this.lessonQuizRepo.moveOrMergeCluster(
          trimmedLessonId,
          dto.sourceTimestamp,
          dto.targetTimestamp,
          2,
          session,
        );
      });
    } catch {
      // Fallback nếu database chưa bật Replica Set transaction
      return this.lessonQuizRepo.moveOrMergeCluster(
        trimmedLessonId,
        dto.sourceTimestamp,
        dto.targetTimestamp,
        2,
      );
    }
  }
}
