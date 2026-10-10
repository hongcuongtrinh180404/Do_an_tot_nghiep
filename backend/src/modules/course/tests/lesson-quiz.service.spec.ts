import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { QuizQuestionTypeEnum } from 'share-lib';
import { LessonQuizService } from '../services/lesson-quiz.service.js';
import { LessonQuizRepository } from '../repositories/lesson-quiz.repository.js';
import { LessonRepository } from '../repositories/lesson.repository.js';

describe('LessonQuizService (Unit Tests - AAA Pattern)', () => {
  let service: LessonQuizService;
  let mockLessonQuizRepo: Partial<Record<keyof LessonQuizRepository, ReturnType<typeof vi.fn>>>;
  let mockLessonRepo: Partial<Record<keyof LessonRepository, ReturnType<typeof vi.fn>>>;
  let mockClsService: Partial<Record<keyof ClsService, ReturnType<typeof vi.fn>>>;

  beforeEach(async () => {
    mockLessonQuizRepo = {
      findByLessonId: vi.fn(),
      findByLessonIdAndTimestamp: vi.fn(),
      syncQuizzesAtTimestamp: vi.fn(),
      findById: vi.fn(),
      softDelete: vi.fn(),
    };

    mockLessonRepo = {
      findById: vi.fn(),
    };

    mockClsService = {
      get: vi.fn().mockReturnValue('mock-user-id'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonQuizService,
        { provide: LessonQuizRepository, useValue: mockLessonQuizRepo },
        { provide: LessonRepository, useValue: mockLessonRepo },
        { provide: ClsService, useValue: mockClsService },
      ],
    }).compile();

    service = module.get<LessonQuizService>(LessonQuizService);
  });

  afterEach(() => {
    vi.clearAllMocks();
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
});

