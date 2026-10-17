import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  LessonTranscriptionStatusEnum,
  IGeneratedQuizItem,
  QuizQuestionTypeEnum,
} from 'share-lib';
import { QuizGenerationService } from '../services/quiz-generation.service.js';
import { GeminiService } from '../../gemini/index.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonTranscriptRepository } from '../../course/repositories/lesson-transcript.repository.js';
import { LessonQuizRepository } from '../../course/repositories/lesson-quiz.repository.js';
import { LessonQuizDraftRepository } from '../../course/repositories/lesson-quiz-draft.repository.js';

describe('QuizGenerationService', () => {
  let service: QuizGenerationService;
  let mockGeminiService: { generateJson: ReturnType<typeof vi.fn> };
  let mockLessonRepo: { findById: ReturnType<typeof vi.fn> };
  let mockLessonTranscriptRepo: { findByLessonId: ReturnType<typeof vi.fn> };
  let mockLessonQuizRepo: { replaceAllQuizzesForLesson: ReturnType<typeof vi.fn> };
  let mockLessonQuizDraftRepo: {
    findByLessonId: ReturnType<typeof vi.fn>;
    saveDraftByLessonId: ReturnType<typeof vi.fn>;
    clearDraftByLessonId: ReturnType<typeof vi.fn>;
  };

  const sampleQuizzes: IGeneratedQuizItem[] = Array.from({ length: 10 }, (_, i) => ({
    order: i + 1,
    timestamp: (i + 1) * 15,
    question: `Câu hỏi số ${i + 1}?`,
    questionType: QuizQuestionTypeEnum.SINGLE,
    options: [
      { id: `opt-${i}-A`, label: 'A', text: 'Đáp án A đúng', isCorrect: true },
      { id: `opt-${i}-B`, label: 'B', text: 'Đáp án B sai', isCorrect: false },
      { id: `opt-${i}-C`, label: 'C', text: 'Đáp án C sai', isCorrect: false },
      { id: `opt-${i}-D`, label: 'D', text: 'Đáp án D sai', isCorrect: false },
    ],
    explanation: `Giải thích chi tiết câu ${i + 1}`,
  }));

  beforeEach(() => {
    mockGeminiService = {
      generateJson: vi.fn(),
    };
    mockLessonRepo = {
      findById: vi.fn(),
    };
    mockLessonTranscriptRepo = {
      findByLessonId: vi.fn(),
    };
    mockLessonQuizRepo = {
      replaceAllQuizzesForLesson: vi.fn(),
    };
    mockLessonQuizDraftRepo = {
      findByLessonId: vi.fn(),
      saveDraftByLessonId: vi.fn(),
      clearDraftByLessonId: vi.fn(),
    };

    service = new QuizGenerationService(
      mockGeminiService as unknown as GeminiService,
      mockLessonRepo as unknown as LessonRepository,
      mockLessonTranscriptRepo as unknown as LessonTranscriptRepository,
      mockLessonQuizRepo as unknown as LessonQuizRepository,
      mockLessonQuizDraftRepo as unknown as LessonQuizDraftRepository,
    );
  });

  describe('formatTranscriptWithTimestamps', () => {
    it('should format millisecond timestamps properly', () => {
      const sentences = [
        { text: 'Chào mừng các bạn', start: 0, end: 4000 },
        { text: 'Phần này về cơ chế Event Loop', start: 65000, end: 70000 },
      ];
      const result = service.formatTranscriptWithTimestamps(sentences, '');
      expect(result).toContain('[00:00 - 0s] Chào mừng các bạn');
      expect(result).toContain('[01:05 - 65s] Phần này về cơ chế Event Loop');
    });
  });

  describe('generateQuiz', () => {
    it('should throw BadRequestException if lessonId is empty', async () => {
      await expect(service.generateQuiz('')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if lesson does not exist', async () => {
      mockLessonRepo.findById.mockResolvedValueOnce(null);
      await expect(service.generateQuiz('lesson-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if transcript is not found or not READY', async () => {
      mockLessonRepo.findById.mockResolvedValueOnce({ id: 'lesson-123', title: 'JS Async' });
      mockLessonTranscriptRepo.findByLessonId.mockResolvedValueOnce({
        status: LessonTranscriptionStatusEnum.FAILED,
      });

      await expect(service.generateQuiz('lesson-123')).rejects.toThrow(BadRequestException);
    });

    it('should call Gemini, validate 10 questions, save draft, and return response metadata', async () => {
      mockLessonRepo.findById.mockResolvedValueOnce({
        id: 'lesson-123',
        title: 'JS Async',
        content: { duration: 300 },
      });

      mockLessonTranscriptRepo.findByLessonId.mockResolvedValueOnce({
        status: LessonTranscriptionStatusEnum.READY,
        durationSeconds: 300,
        sentences: [{ text: 'Nội dung bài học', start: 0, end: 5000 }],
        rawTranscript: 'Nội dung bài học',
      });

      mockGeminiService.generateJson.mockResolvedValueOnce({
        data: { quizzes: sampleQuizzes },
        model: 'gemini-2.5-flash',
        keyIndex: 1,
        maskedKey: 'AIzaSy...2222',
        executionTimeMs: 1400,
        usage: { promptTokens: 300, completionTokens: 400, totalTokens: 700 },
      });

      const response = await service.generateQuiz('lesson-123', { count: 10, saveAsDraft: true }, 'instructor-1');

      expect(response.lessonId).toBe('lesson-123');
      expect(response.quizzes).toHaveLength(10);
      expect(response.metadata.model).toBe('gemini-2.5-flash');

      expect(mockLessonQuizDraftRepo.saveDraftByLessonId).toHaveBeenCalledWith(
        'lesson-123',
        sampleQuizzes,
        'instructor-1',
      );
    });
  });

  describe('getQuizDraft & applyDraft', () => {
    it('should return quiz draft from repository', async () => {
      mockLessonQuizDraftRepo.findByLessonId.mockResolvedValueOnce({
        lessonId: 'lesson-123',
        quizzes: sampleQuizzes,
      });

      const draft = await service.getQuizDraft('lesson-123');
      expect(draft?.quizzes).toHaveLength(10);
    });

    it('should throw BadRequestException if draft does not exist when applying', async () => {
      mockLessonQuizDraftRepo.findByLessonId.mockResolvedValueOnce(null);
      await expect(service.applyDraft('lesson-123')).rejects.toThrow(BadRequestException);
    });

    it('should replace all quizzes in repository and clear draft upon apply', async () => {
      mockLessonQuizDraftRepo.findByLessonId.mockResolvedValueOnce({
        lessonId: 'lesson-123',
        quizzes: sampleQuizzes,
      });

      mockLessonQuizRepo.replaceAllQuizzesForLesson.mockResolvedValueOnce(
        sampleQuizzes.map((q) => ({ id: 'quiz-id', ...q })),
      );

      const result = await service.applyDraft('lesson-123');

      expect(mockLessonQuizRepo.replaceAllQuizzesForLesson).toHaveBeenCalledWith(
        'lesson-123',
        expect.any(Array),
      );
      expect(mockLessonQuizDraftRepo.clearDraftByLessonId).toHaveBeenCalledWith('lesson-123');
      expect(result).toHaveLength(10);
    });
  });
});
