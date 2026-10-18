import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LessonTranscriptionStatusEnum, ILessonSummaryData } from 'share-lib';
import { SummaryGenerationService } from '../services/summary-generation.service.js';
import { GeminiService } from '../../gemini/index.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonTranscriptRepository } from '../../course/repositories/lesson-transcript.repository.js';
import { LessonSummaryRepository } from '../../course/repositories/lesson-summary.repository.js';

describe('SummaryGenerationService', () => {
  let service: SummaryGenerationService;
  let mockGeminiService: { generateJson: ReturnType<typeof vi.fn> };
  let mockLessonRepo: { findById: ReturnType<typeof vi.fn> };
  let mockLessonTranscriptRepo: { findByLessonId: ReturnType<typeof vi.fn> };
  let mockLessonSummaryRepo: {
    findByLessonId: ReturnType<typeof vi.fn>;
    saveDraftByLessonId: ReturnType<typeof vi.fn>;
    applyDraftByLessonId: ReturnType<typeof vi.fn>;
    upsertOfficialByLessonId: ReturnType<typeof vi.fn>;
  };

  const sampleSummary: ILessonSummaryData = {
    title: 'Giới thiệu về TypeScript',
    overview: 'Bài học giải thích các khái niệm nền tảng của hệ thống kiểu dữ liệu trong TypeScript.',
    keyPoints: [
      {
        title: 'Static Typing',
        content: 'Bắt lỗi lúc biên dịch thay vì runtime.',
        timestamp: 10,
      },
      {
        title: 'Interface và Type Alias',
        content: 'Định nghĩa cấu trúc đối tượng mạch lạc.',
        timestamp: 50,
      },
    ],
    conclusion: 'TypeScript giúp code an toàn và dễ bảo trì trong các dự án quy mô lớn.',
  };

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
      mockLessonSummaryRepo = {
      findByLessonId: vi.fn(),
      saveDraftByLessonId: vi.fn(),
      applyDraftByLessonId: vi.fn(),
      upsertOfficialByLessonId: vi.fn(),
    };

    service = new SummaryGenerationService(
      mockGeminiService as unknown as GeminiService,
      mockLessonRepo as unknown as LessonRepository,
      mockLessonTranscriptRepo as unknown as LessonTranscriptRepository,
      mockLessonSummaryRepo as unknown as LessonSummaryRepository,
    );
  });

  describe('generateSummary', () => {
    it('should throw BadRequestException if lessonId is empty', async () => {
      await expect(service.generateSummary('')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if lesson does not exist', async () => {
      mockLessonRepo.findById.mockResolvedValueOnce(null);
      await expect(service.generateSummary('lesson-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if transcript is not ready', async () => {
      mockLessonRepo.findById.mockResolvedValueOnce({ id: 'lesson-123', title: 'TypeScript' });
      mockLessonTranscriptRepo.findByLessonId.mockResolvedValueOnce({
        status: LessonTranscriptionStatusEnum.UPLOADING,
      });

      await expect(service.generateSummary('lesson-123')).rejects.toThrow(BadRequestException);
    });

    it('should generate summary and save directly to official by default', async () => {
      mockLessonRepo.findById.mockResolvedValueOnce({
        id: 'lesson-123',
        title: 'TypeScript',
        content: { duration: 300 },
      });

      mockLessonTranscriptRepo.findByLessonId.mockResolvedValueOnce({
        status: LessonTranscriptionStatusEnum.READY,
        durationSeconds: 300,
        sentences: [{ text: 'Nội dung bài giảng TS', start: 0, end: 5000 }],
        rawTranscript: 'Nội dung bài giảng TS',
      });

      mockGeminiService.generateJson.mockResolvedValueOnce({
        data: sampleSummary,
        model: 'gemini-2.5-flash',
        keyIndex: 0,
        maskedKey: 'AIzaSy...1111',
        executionTimeMs: 1100,
        usage: { promptTokens: 200, completionTokens: 150, totalTokens: 350 },
      });

      const response = await service.generateSummary('lesson-123', undefined, 'instructor-1');

      expect(response.lessonId).toBe('lesson-123');
      expect(response.summary.title).toBe(sampleSummary.title);
      expect(mockLessonSummaryRepo.upsertOfficialByLessonId).toHaveBeenCalledWith(
        'lesson-123',
        sampleSummary,
        'instructor-1',
      );
      expect(mockLessonSummaryRepo.saveDraftByLessonId).not.toHaveBeenCalled();
    });

    it('should save draft if saveAsDraft is explicitly true', async () => {
      mockLessonRepo.findById.mockResolvedValueOnce({
        id: 'lesson-123',
        title: 'TypeScript',
        content: { duration: 300 },
      });

      mockLessonTranscriptRepo.findByLessonId.mockResolvedValueOnce({
        status: LessonTranscriptionStatusEnum.READY,
        durationSeconds: 300,
        sentences: [{ text: 'Nội dung bài giảng TS', start: 0, end: 5000 }],
        rawTranscript: 'Nội dung bài giảng TS',
      });

      mockGeminiService.generateJson.mockResolvedValueOnce({
        data: sampleSummary,
        model: 'gemini-2.5-flash',
        keyIndex: 0,
        maskedKey: 'AIzaSy...1111',
        executionTimeMs: 1100,
        usage: { promptTokens: 200, completionTokens: 150, totalTokens: 350 },
      });

      const response = await service.generateSummary('lesson-123', { saveAsDraft: true }, 'instructor-1');

      expect(response.lessonId).toBe('lesson-123');
      expect(mockLessonSummaryRepo.saveDraftByLessonId).toHaveBeenCalledWith(
        'lesson-123',
        sampleSummary,
        'instructor-1',
      );
    });
  });

  describe('updateSummary', () => {
    it('should throw BadRequestException if lessonId is empty', async () => {
      await expect(
        service.updateSummary('', { title: 'T', overview: 'O', keyPoints: [] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if lesson not found', async () => {
      mockLessonRepo.findById.mockResolvedValueOnce(null);
      await expect(
        service.updateSummary('lesson-404', { title: 'T', overview: 'O', keyPoints: [] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update official summary and return updated doc', async () => {
      mockLessonRepo.findById.mockResolvedValueOnce({ id: 'lesson-123' });
      mockLessonSummaryRepo.upsertOfficialByLessonId.mockResolvedValueOnce({
        lessonId: 'lesson-123',
        summary: sampleSummary,
      });

      const result = await service.updateSummary(
        'lesson-123',
        {
          title: 'Tiêu đề mới',
          overview: 'Tổng quan mới',
          keyPoints: [{ title: 'Ý 1', content: 'Chi tiết 1', timestamp: 20 }],
        },
        'instructor-1',
      );

      expect(mockLessonSummaryRepo.upsertOfficialByLessonId).toHaveBeenCalledWith(
        'lesson-123',
        {
          title: 'Tiêu đề mới',
          overview: 'Tổng quan mới',
          keyPoints: [{ title: 'Ý 1', content: 'Chi tiết 1', timestamp: 20 }],
        },
        'instructor-1',
      );
      expect(result.lessonId).toBe('lesson-123');
    });
  });

  describe('getSummary & applyDraft', () => {
    it('should retrieve summary from repository', async () => {
      mockLessonSummaryRepo.findByLessonId.mockResolvedValueOnce({
        lessonId: 'lesson-123',
        summary: sampleSummary,
      });

      const result = await service.getSummary('lesson-123');
      expect(result?.lessonId).toBe('lesson-123');
    });

    it('should apply draft to official summary', async () => {
      mockLessonSummaryRepo.applyDraftByLessonId.mockResolvedValueOnce({
        lessonId: 'lesson-123',
        summary: sampleSummary,
        draftSummary: null,
      });

      const result = await service.applyDraft('lesson-123', 'instructor-1');
      expect(result.draftSummary).toBeNull();
    });

    it('should throw BadRequestException if no draft to apply', async () => {
      mockLessonSummaryRepo.applyDraftByLessonId.mockResolvedValueOnce(null);
      await expect(service.applyDraft('lesson-123')).rejects.toThrow(BadRequestException);
    });
  });
});
