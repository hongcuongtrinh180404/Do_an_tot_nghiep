import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CourseStatusEnum, QuizQuestionTypeEnum } from 'share-lib';
import { LessonQuizService } from '../services/lesson-quiz.service.js';
import { LessonQuizRepository } from '../repositories/lesson-quiz.repository.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
import { CourseRepository } from '../repositories/course.repository.js';

describe('LessonQuizService (Unit Tests - AAA Pattern)', () => {
  let service: LessonQuizService;
  let mockLessonQuizRepo: Partial<Record<keyof LessonQuizRepository, ReturnType<typeof vi.fn>>>;
  let mockLessonRepo: Partial<Record<keyof LessonRepository, ReturnType<typeof vi.fn>>>;
  let mockClsService: Partial<Record<keyof ClsService, ReturnType<typeof vi.fn>>>;
  const mockSectionRepo = { findById: vi.fn() };
  const mockCourseRepo = { findById: vi.fn() };

  beforeEach(async () => {
    mockLessonQuizRepo = {
      findByLessonId: vi.fn(),
      findByLessonIdAndTimestamp: vi.fn(),
      syncQuizzesAtTimestamp: vi.fn(),
      findById: vi.fn(),
      softDelete: vi.fn(),
      moveOrMergeCluster: vi.fn(),
      withTransaction: vi.fn((callback: (session: unknown) => Promise<unknown>) => callback(null)),
      create: vi.fn(),
      update: vi.fn(),
    };

    mockLessonRepo = {
      findById: vi.fn(),
    };

    mockClsService = {
      get: vi.fn().mockReturnValue('mock-user-id'),
    };
    mockSectionRepo.findById.mockResolvedValue({ courseId: 'course-1' });
    mockCourseRepo.findById.mockResolvedValue({ status: CourseStatusEnum.DRAFT });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonQuizService,
        { provide: LessonQuizRepository, useValue: mockLessonQuizRepo },
        { provide: LessonRepository, useValue: mockLessonRepo },
        { provide: ClsService, useValue: mockClsService },
        { provide: SectionRepository, useValue: mockSectionRepo },
        { provide: CourseRepository, useValue: mockCourseRepo },
      ],
    }).compile();

    service = module.get<LessonQuizService>(LessonQuizService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('individual quiz authoring', () => {
    const lessonId = '66f000000000000000000001';
    const quizId = '66f000000000000000000002';
    const payload = {
      timestamp: 30,
      question: '  Kiến thức nào vừa được trình bày?  ',
      questionType: QuizQuestionTypeEnum.SINGLE,
      options: [
        { id: 'a', label: 'A', text: '  Nội dung chính  ', isCorrect: true },
        { id: 'b', label: 'B', text: '  Nội dung khác  ', isCorrect: false },
      ],
      explanation: '  Giải thích đáp án  ',
    };

    beforeEach(() => {
      mockLessonRepo.findById!.mockResolvedValue({ id: lessonId, sectionId: 'section-1', content: { duration: 120 } });
      mockLessonQuizRepo.findByLessonIdAndTimestamp!.mockResolvedValue([]);
      mockLessonQuizRepo.findById!.mockResolvedValue({ id: quizId, lessonId, timestamp: 30, order: 3 });
    });

    it('adds one question without replacing existing quizzes and records the author', async () => {
      mockLessonQuizRepo.findByLessonIdAndTimestamp!.mockResolvedValue([{ order: 1 }, { order: 4 }]);
      mockLessonQuizRepo.create!.mockResolvedValue({ id: quizId, lessonId });

      const result = await service.createQuiz(` ${lessonId} `, payload);

      expect(result.id).toBe(quizId);
      expect(mockLessonQuizRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        lessonId,
        timestamp: 30,
        order: 5,
        question: payload.question.trim(),
        options: payload.options.map((option) => ({ ...option, text: option.text.trim() })),
        explanation: payload.explanation.trim(),
        createdById: 'mock-user-id',
        updatedById: 'mock-user-id',
      }), undefined);
      expect(mockLessonQuizRepo.syncQuizzesAtTimestamp).not.toHaveBeenCalled();
      expect(mockLessonQuizRepo.softDelete).not.toHaveBeenCalled();
    });

    it('accepts the start, end and unknown-duration timestamps', async () => {
      mockLessonQuizRepo.create!.mockResolvedValue({ id: quizId });
      await service.createQuiz(lessonId, { ...payload, timestamp: 0, explanation: '  ' });
      await service.createQuiz(lessonId, { ...payload, timestamp: 120 });
      mockLessonRepo.findById!.mockResolvedValue({ id: lessonId });
      await service.createQuiz(lessonId, { ...payload, timestamp: 500 });
      expect(mockLessonQuizRepo.create).toHaveBeenCalledTimes(3);
      expect(mockLessonQuizRepo.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ timestamp: 0, explanation: null }), undefined);
    });

    it('accepts multiple correct answers for a multiple-choice question', async () => {
      await service.createQuiz(lessonId, {
        ...payload,
        questionType: QuizQuestionTypeEnum.MULTIPLE,
        options: payload.options.map((option) => ({ ...option, isCorrect: true })),
      });
      expect(mockLessonQuizRepo.create).toHaveBeenCalledOnce();
    });

    it.each([-1, 1.5, NaN, Infinity, 121])('rejects invalid or out-of-video timestamp %s before writing', async (timestamp) => {
      await expect(service.createQuiz(lessonId, { ...payload, timestamp })).rejects.toThrow(BadRequestException);
      expect(mockLessonQuizRepo.create).not.toHaveBeenCalled();
    });

    it.each([
      { ...payload, question: '   ' },
      { ...payload, options: [] },
      { ...payload, options: [payload.options[0]!] },
      { ...payload, options: payload.options.map((option) => ({ ...option, text: '  ' })) },
      { ...payload, options: payload.options.map((option) => ({ ...option, isCorrect: false })) },
      { ...payload, options: payload.options.map((option) => ({ ...option, isCorrect: true })) },
      { ...payload, options: payload.options.map((option) => ({ ...option, id: 'duplicate' })) },
      { ...payload, options: payload.options.map((option) => ({ ...option, label: 'A' })) },
    ])('rejects invalid content without touching any quiz: %o', async (invalid) => {
      await expect(service.createQuiz(lessonId, invalid)).rejects.toThrow(BadRequestException);
      expect(mockLessonQuizRepo.create).not.toHaveBeenCalled();
      expect(mockLessonQuizRepo.update).not.toHaveBeenCalled();
    });

    it('keeps the quiz ID and order when changing only its content', async () => {
      mockLessonQuizRepo.update!.mockResolvedValue({ id: quizId, lessonId, ...payload, order: 3 });

      const result = await service.updateQuiz(quizId, payload);

      expect(result.id).toBe(quizId);
      expect(mockLessonQuizRepo.update).toHaveBeenCalledWith(quizId, expect.objectContaining({ order: 3, updatedById: 'mock-user-id' }), undefined);
      expect(mockLessonQuizRepo.findByLessonIdAndTimestamp).not.toHaveBeenCalled();
      expect(mockLessonQuizRepo.create).not.toHaveBeenCalled();
      expect(mockLessonQuizRepo.syncQuizzesAtTimestamp).not.toHaveBeenCalled();
    });

    it('moves only the selected question and appends it at the target timestamp', async () => {
      mockLessonQuizRepo.findByLessonIdAndTimestamp!.mockResolvedValue([{ order: 2 }, { order: 7 }]);
      mockLessonQuizRepo.update!.mockResolvedValue({ id: quizId, lessonId, timestamp: 90, order: 8 });

      await service.updateQuiz(quizId, { ...payload, timestamp: 90 });

      expect(mockLessonQuizRepo.findByLessonIdAndTimestamp).toHaveBeenCalledWith(lessonId, 90);
      expect(mockLessonQuizRepo.update).toHaveBeenCalledWith(quizId, expect.objectContaining({ timestamp: 90, order: 8 }), undefined);
      expect(mockLessonQuizRepo.update).toHaveBeenCalledTimes(1);
      expect(mockLessonQuizRepo.moveOrMergeCluster).not.toHaveBeenCalled();
      expect(mockLessonQuizRepo.softDelete).not.toHaveBeenCalled();
    });

    it('rejects invalid updates without modifying the original question', async () => {
      await expect(service.updateQuiz(quizId, { ...payload, timestamp: 121 })).rejects.toThrow(BadRequestException);
      expect(mockLessonQuizRepo.update).not.toHaveBeenCalled();
    });

    it('reports missing lessons, missing questions and deletion races', async () => {
      await expect(service.createQuiz('', payload)).rejects.toThrow(BadRequestException);
      await expect(service.updateQuiz('', payload)).rejects.toThrow(BadRequestException);
      mockLessonRepo.findById!.mockResolvedValue(null);
      await expect(service.createQuiz(lessonId, payload)).rejects.toThrow(NotFoundException);
      await expect(service.updateQuiz(quizId, payload)).rejects.toThrow(NotFoundException);
      mockLessonRepo.findById!.mockResolvedValue({ id: lessonId });
      mockLessonQuizRepo.update!.mockResolvedValue(null);
      await expect(service.updateQuiz(quizId, payload)).rejects.toThrow(NotFoundException);
      mockLessonQuizRepo.findById!.mockResolvedValue(null);
      await expect(service.updateQuiz(quizId, payload)).rejects.toThrow(NotFoundException);
    });

    it('preserves the pending-approval lock for adding and updating individual questions', async () => {
      mockCourseRepo.findById.mockResolvedValue({ status: CourseStatusEnum.PENDING_APPROVAL });
      await expect(service.createQuiz(lessonId, payload)).rejects.toThrow(ConflictException);
      await expect(service.updateQuiz(quizId, payload)).rejects.toThrow(ConflictException);
      expect(mockLessonQuizRepo.create).not.toHaveBeenCalled();
      expect(mockLessonQuizRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('getQuizzesByLessonId', () => {
    it('Arrange - Act - Assert: should return quizzes when lesson exists', async () => {
      // Arrange
      const lessonId = '66f000000000000000000001';
      mockLessonRepo.findById!.mockResolvedValue({ id: lessonId, title: 'Bài học 1' });
      const expectedQuizzes = [
        {
          id: 'quiz-1',
          lessonId,
          timestamp: 120,
          order: 1,
          question: 'Câu hỏi 1',
          questionType: QuizQuestionTypeEnum.SINGLE,
          options: [{ id: 'opt-1', label: 'A', text: 'Đáp án A', isCorrect: true }],
        },
      ];
      mockLessonQuizRepo.findByLessonId!.mockResolvedValue(expectedQuizzes);

      // Act
      const result = await service.getQuizzesByLessonId(lessonId);

      // Assert
      expect(result).toEqual(expectedQuizzes);
      expect(mockLessonRepo.findById).toHaveBeenCalledWith(lessonId);
      expect(mockLessonQuizRepo.findByLessonId).toHaveBeenCalledWith(lessonId);
    });

    it('Arrange - Act - Assert: should throw BadRequestException if lessonId is empty', async () => {
      // Act & Assert
      await expect(service.getQuizzesByLessonId('')).rejects.toThrow(BadRequestException);
    });

    it('Arrange - Act - Assert: should throw NotFoundException if lesson not found', async () => {
      // Arrange
      mockLessonRepo.findById!.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getQuizzesByLessonId('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('syncQuizzesAtTimestamp', () => {
    const validDto = {
      timestamp: 150,
      questions: [
        {
          order: 1,
          question: 'Câu hỏi kiểm tra',
          questionType: QuizQuestionTypeEnum.SINGLE,
          options: [
            { id: '1', label: 'A', text: 'Đáp án đúng', isCorrect: true },
            { id: '2', label: 'B', text: 'Đáp án sai', isCorrect: false },
          ],
          explanation: 'Lý do đúng',
        },
      ],
    };

    it('Arrange - Act - Assert: should sync quizzes when valid', async () => {
      // Arrange
      const lessonId = '66f000000000000000000001';
      mockLessonRepo.findById!.mockResolvedValue({ id: lessonId });
      const syncedResult = [
        {
          id: 'q-new-1',
          lessonId,
          timestamp: 150,
          order: 1,
          question: 'Câu hỏi kiểm tra',
          questionType: QuizQuestionTypeEnum.SINGLE,
          options: validDto.questions[0].options,
          explanation: 'Lý do đúng',
        },
      ];
      mockLessonQuizRepo.syncQuizzesAtTimestamp!.mockResolvedValue(syncedResult);

      // Act
      const result = await service.syncQuizzesAtTimestamp(lessonId, validDto);

      // Assert
      expect(result).toEqual(syncedResult);
      expect(mockLessonQuizRepo.syncQuizzesAtTimestamp).toHaveBeenCalledWith(
        lessonId,
        150,
        expect.any(Array),
      );
    });

    it('Arrange - Act - Assert: should throw BadRequestException if timestamp is negative', async () => {
      // Arrange
      const lessonId = '66f000000000000000000001';
      mockLessonRepo.findById!.mockResolvedValue({ id: lessonId });

      // Act & Assert
      await expect(
        service.syncQuizzesAtTimestamp(lessonId, { ...validDto, timestamp: -5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Arrange - Act - Assert: should throw BadRequestException if question text is empty', async () => {
      // Arrange
      const lessonId = '66f000000000000000000001';
      mockLessonRepo.findById!.mockResolvedValue({ id: lessonId });

      // Act & Assert
      await expect(
        service.syncQuizzesAtTimestamp(lessonId, {
          timestamp: 10,
          questions: [{ ...validDto.questions[0], question: '   ' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Arrange - Act - Assert: should throw BadRequestException if options has less than 2 items', async () => {
      // Arrange
      const lessonId = '66f000000000000000000001';
      mockLessonRepo.findById!.mockResolvedValue({ id: lessonId });

      // Act & Assert
      await expect(
        service.syncQuizzesAtTimestamp(lessonId, {
          timestamp: 10,
          questions: [
            {
              ...validDto.questions[0],
              options: [{ id: '1', label: 'A', text: 'Chỉ 1 đáp án', isCorrect: true }],
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Arrange - Act - Assert: should throw BadRequestException if no correct option is chosen', async () => {
      // Arrange
      const lessonId = '66f000000000000000000001';
      mockLessonRepo.findById!.mockResolvedValue({ id: lessonId });

      // Act & Assert
      await expect(
        service.syncQuizzesAtTimestamp(lessonId, {
          timestamp: 10,
          questions: [
            {
              ...validDto.questions[0],
              options: [
                { id: '1', label: 'A', text: 'Đáp án 1', isCorrect: false },
                { id: '2', label: 'B', text: 'Đáp án 2', isCorrect: false },
              ],
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteQuiz', () => {
    it('Arrange - Act - Assert: should soft-delete quiz when found', async () => {
      // Arrange
      const quizId = 'quiz-123';
      mockLessonQuizRepo.findById!.mockResolvedValue({ id: quizId });
      mockLessonQuizRepo.softDelete!.mockResolvedValue(true);

      // Act
      const result = await service.deleteQuiz(quizId);

      // Assert
      expect(result).toBe(true);
      expect(mockLessonQuizRepo.softDelete).toHaveBeenCalledWith(quizId);
    });

    it('Arrange - Act - Assert: should throw NotFoundException if quiz not found', async () => {
      // Arrange
      mockLessonQuizRepo.findById!.mockResolvedValue(null);

      // Act & Assert
      await expect(service.deleteQuiz('not-exist')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteQuizzesAtTimestamp', () => {
    it('Arrange - Act - Assert: should delete quizzes in timestamp range when lesson exists', async () => {
      // Arrange
      const lessonId = '660f1c2d9b1d8b2e3f4a5b6c';
      const timestamp = 45;
      mockLessonRepo.findById!.mockResolvedValue({ id: lessonId });
      (mockLessonQuizRepo as Record<string, unknown>).deleteQuizzesAtTimestampRange =
        vi.fn().mockResolvedValue(3);

      // Act
      const result = await service.deleteQuizzesAtTimestamp(lessonId, timestamp);

      // Assert
      expect(result).toBe(3);
      expect(
        (mockLessonQuizRepo as Record<string, unknown>).deleteQuizzesAtTimestampRange,
      ).toHaveBeenCalledWith(lessonId, timestamp, 2);
    });

    it('Arrange - Act - Assert: should throw NotFoundException if lesson not found', async () => {
      // Arrange
      mockLessonRepo.findById!.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.deleteQuizzesAtTimestamp('660f1c2d9b1d8b2e3f4a5b6c', 30),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('moveOrMergeQuizCluster', () => {
    const lessonId = '660f1c2d9b1d8b2e3f4a5b6c';
    const dto = { sourceTimestamp: 30, targetTimestamp: 90 };

    it('Arrange - Act - Assert: should move or merge cluster when lesson exists', async () => {
      // Arrange
      mockLessonRepo.findById!.mockResolvedValue({ id: lessonId });
      const expectedResult = [
        {
          id: 'quiz-1',
          lessonId,
          timestamp: 90,
          order: 1,
          question: 'Câu hỏi đã di chuyển',
          questionType: QuizQuestionTypeEnum.SINGLE,
          options: [{ id: 'opt-1', label: 'A', text: 'Đáp án A', isCorrect: true }],
        },
      ];
      mockLessonQuizRepo.moveOrMergeCluster!.mockResolvedValue(expectedResult);

      // Act
      const result = await service.moveOrMergeQuizCluster(lessonId, dto);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockLessonRepo.findById).toHaveBeenCalledWith(lessonId);
      expect(mockLessonQuizRepo.moveOrMergeCluster).toHaveBeenCalledWith(
        lessonId,
        dto.sourceTimestamp,
        dto.targetTimestamp,
        2,
        null,
      );
    });

    it('Arrange - Act - Assert: should fallback when withTransaction fails', async () => {
      // Arrange
      mockLessonRepo.findById!.mockResolvedValue({ id: lessonId });
      mockLessonQuizRepo.withTransaction = vi.fn().mockRejectedValue(new Error('No replica set'));
      const expectedResult = [
        {
          id: 'quiz-1',
          lessonId,
          timestamp: 90,
          order: 1,
          question: 'Câu hỏi đã gộp',
          questionType: QuizQuestionTypeEnum.SINGLE,
          options: [{ id: 'opt-1', label: 'A', text: 'Đáp án A', isCorrect: true }],
        },
      ];
      mockLessonQuizRepo.moveOrMergeCluster!.mockResolvedValue(expectedResult);

      // Act
      const result = await service.moveOrMergeQuizCluster(lessonId, dto);

      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockLessonQuizRepo.moveOrMergeCluster).toHaveBeenCalledWith(
        lessonId,
        dto.sourceTimestamp,
        dto.targetTimestamp,
        2,
      );
    });

    it('Arrange - Act - Assert: should throw NotFoundException if lesson not found', async () => {
      // Arrange
      mockLessonRepo.findById!.mockResolvedValue(null);

      // Act & Assert
      await expect(service.moveOrMergeQuizCluster('not-exist', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Arrange - Act - Assert: should throw BadRequestException if timestamps are negative', async () => {
      // Arrange
      mockLessonRepo.findById!.mockResolvedValue({ id: lessonId });

      // Act & Assert
      await expect(
        service.moveOrMergeQuizCluster(lessonId, { sourceTimestamp: -1, targetTimestamp: 90 }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
