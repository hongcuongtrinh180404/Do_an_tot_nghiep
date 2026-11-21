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
var LessonQuizService_1;
import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException, Optional, } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CourseStatusEnum, QuizQuestionTypeEnum, isQuizTimestamp } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { LessonQuizRepository } from '../repositories/lesson-quiz.repository.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
import { CourseRepository } from '../repositories/course.repository.js';
let LessonQuizService = LessonQuizService_1 = class LessonQuizService extends BaseService {
    lessonQuizRepo;
    lessonRepo;
    sectionRepo;
    courseRepo;
    logger = new Logger(LessonQuizService_1.name);
    constructor(lessonQuizRepo, lessonRepo, cls, sectionRepo, courseRepo) {
        super(lessonQuizRepo, cls, LessonQuizService_1.name);
        this.lessonQuizRepo = lessonQuizRepo;
        this.lessonRepo = lessonRepo;
        this.sectionRepo = sectionRepo;
        this.courseRepo = courseRepo;
    }
    async assertNotPendingApproval(lessonId) {
        if (this.sectionRepo && this.courseRepo) {
            const lesson = await this.lessonRepo.findById(lessonId);
            if (lesson) {
                const section = await this.sectionRepo.findById(lesson.sectionId);
                if (section) {
                    const course = await this.courseRepo.findById(section.courseId);
                    if (course && course.status === CourseStatusEnum.PENDING_APPROVAL) {
                        throw new ConflictException('Khóa học đang trong quá trình chờ phê duyệt, không thể chỉnh sửa câu hỏi video.');
                    }
                }
            }
        }
    }
    async getQuizzesByLessonId(lessonId) {
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
    normalizeQuiz(dto, duration) {
        this.validateTimestamp(dto.timestamp, duration);
        if (dto.explanationTimestamp != null && !isQuizTimestamp(dto.explanationTimestamp, duration)) {
            throw new BadRequestException('Mốc giải thích phải là số giây nguyên trong thời lượng video');
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
            ...(dto.explanationTimestamp !== undefined ? { explanationTimestamp: dto.explanationTimestamp } : {}),
        };
    }
    validateTimestamp(timestamp, duration) {
        if (timestamp === null)
            return;
        if (!isQuizTimestamp(timestamp)) {
            throw new BadRequestException('Mốc thời gian phải là số giây nguyên không âm hoặc null');
        }
        if (!isQuizTimestamp(timestamp, duration)) {
            throw new BadRequestException('Mốc thời gian không được vượt quá thời lượng video');
        }
    }
    async getNextQuizOrder(lessonId, timestamp) {
        const quizzes = await this.lessonQuizRepo.findByLessonIdAndTimestamp(lessonId, timestamp);
        return quizzes.reduce((max, quiz) => Math.max(max, quiz.order), 0) + 1;
    }
    async createQuiz(lessonId, dto) {
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
    async updateQuiz(quizId, dto) {
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
    async updateTimestamp(quizId, timestamp) {
        const existing = await this.lessonQuizRepo.findById(quizId);
        if (!existing)
            throw new NotFoundException('Không tìm thấy câu hỏi');
        const lesson = await this.lessonRepo.findById(existing.lessonId);
        if (!lesson)
            throw new NotFoundException('Không tìm thấy bài học');
        await this.assertNotPendingApproval(existing.lessonId);
        this.validateTimestamp(timestamp, lesson.content?.duration);
        const order = timestamp === existing.timestamp ? existing.order
            : await this.getNextQuizOrder(existing.lessonId, timestamp);
        const updated = await super.update(quizId, { timestamp, order });
        if (!updated)
            throw new NotFoundException('Câu hỏi đã bị xóa hoặc không còn tồn tại');
        return updated;
    }
    async syncQuizzesAtTimestamp(lessonId, dto) {
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
            ...this.normalizeQuiz({
                ...question,
                timestamp: question.timestamp === undefined ? dto.timestamp : question.timestamp,
            }, lesson.content?.duration),
            id: question.id, order: question.order,
        }));
        if (!Number.isSafeInteger(dto.timestamp) || dto.timestamp < 0 ||
            (lesson.content?.duration && dto.timestamp > lesson.content.duration)) {
            throw new BadRequestException('Mốc thời gian (timestamp) không hợp lệ');
        }
        this.logger.log(`Đồng bộ ${dto.questions.length} câu hỏi tại mốc ${dto.timestamp}s cho bài học ${trimmedLessonId}`);
        return this.lessonQuizRepo.syncQuizzesAtTimestamp(trimmedLessonId, dto.timestamp, normalized.map((q) => ({
            id: q.id,
            order: q.order,
            timestamp: q.timestamp,
            question: q.question.trim(),
            questionType: q.questionType,
            options: q.options.map((opt) => ({
                id: opt.id,
                label: opt.label.trim(),
                text: opt.text.trim(),
                isCorrect: opt.isCorrect,
            })),
            explanation: q.explanation?.trim() || null,
            ...(q.explanationTimestamp !== undefined ? { explanationTimestamp: q.explanationTimestamp } : {}),
        })));
    }
    async deleteQuiz(quizId) {
        const trimmedId = quizId?.trim();
        if (!trimmedId) {
            throw new BadRequestException('ID câu hỏi không được để trống');
        }
        const existing = await this.lessonQuizRepo.findById(trimmedId);
        if (!existing) {
            throw new NotFoundException(`Không tìm thấy câu hỏi với ID: ${trimmedId}`);
        }
        await this.assertNotPendingApproval(existing.lessonId);
        const deleted = await this.lessonQuizRepo.hardDelete(trimmedId);
        if (!deleted) {
            throw new NotFoundException(`Không tìm thấy câu hỏi với ID: ${trimmedId}`);
        }
        this.logger.log(`Đã xóa cứng câu hỏi ${trimmedId} của bài học ${existing.lessonId}`);
        return true;
    }
    async deleteQuizzesAtTimestamp(lessonId, timestamp) {
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
        this.logger.log(`Xóa toàn bộ câu hỏi tại mốc ${timestamp}s cho bài học ${trimmedLessonId}`);
        return this.lessonQuizRepo.deleteQuizzesAtTimestampRange(trimmedLessonId, timestamp, 2);
    }
    async moveOrMergeQuizCluster(lessonId, dto) {
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
        this.logger.log(`Di chuyển/Gộp cụm câu hỏi từ mốc ${dto.sourceTimestamp}s sang ${dto.targetTimestamp}s cho bài học ${trimmedLessonId}`);
        try {
            return await this.lessonQuizRepo.withTransaction(async (session) => {
                return this.lessonQuizRepo.moveOrMergeCluster(trimmedLessonId, dto.sourceTimestamp, dto.targetTimestamp, 2, session);
            });
        }
        catch {
            return this.lessonQuizRepo.moveOrMergeCluster(trimmedLessonId, dto.sourceTimestamp, dto.targetTimestamp, 2);
        }
    }
};
LessonQuizService = LessonQuizService_1 = __decorate([
    Injectable(),
    __param(3, Optional()),
    __param(4, Optional()),
    __metadata("design:paramtypes", [LessonQuizRepository,
        LessonRepository,
        ClsService,
        SectionRepository,
        CourseRepository])
], LessonQuizService);
export { LessonQuizService };
//# sourceMappingURL=lesson-quiz.service.js.map