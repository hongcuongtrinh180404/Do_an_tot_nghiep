import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LessonTranscriptionStatusEnum, ILessonMindmapData } from 'share-lib';
import { MindmapAnalysisService } from '../services/mindmap-analysis.service.js';
import { GeminiService } from '../../gemini/index.js';
import { LessonRepository } from '../../course/repositories/lesson.repository.js';
import { LessonTranscriptRepository } from '../../course/repositories/lesson-transcript.repository.js';
import { LessonMindmapRepository } from '../../course/repositories/lesson-mindmap.repository.js';

describe('MindmapAnalysisService', () => {
  let service: MindmapAnalysisService;
  let mockGeminiService: { generateJson: ReturnType<typeof vi.fn> };
  let mockLessonRepo: { findById: ReturnType<typeof vi.fn> };
  let mockLessonTranscriptRepo: { findByLessonId: ReturnType<typeof vi.fn> };
  let mockLessonMindmapRepo: {
    findByLessonId: ReturnType<typeof vi.fn>;
    saveDraftByLessonId: ReturnType<typeof vi.fn>;
    applyDraftByLessonId: ReturnType<typeof vi.fn>;
  };

  const sampleMindmapData: ILessonMindmapData = {
    root: {
      id: 'root',
      title: 'Bài học React',
      timestamp: 0,
      children: [
        {
          id: 'node-1',
          title: 'Khái niệm cơ bản',
          timestamp: 10,
        },
      ],
    },
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
    mockLessonMindmapRepo = {
      findByLessonId: vi.fn(),
      saveDraftByLessonId: vi.fn(),
      applyDraftByLessonId: vi.fn(),
    };

    service = new MindmapAnalysisService(
      mockGeminiService as unknown as GeminiService,
      mockLessonRepo as unknown as LessonRepository,
      mockLessonTranscriptRepo as unknown as LessonTranscriptRepository,
      mockLessonMindmapRepo as unknown as LessonMindmapRepository,
    );
  });

  describe('formatTranscriptWithTimestamps', () => {
    it('should format millisecond timestamps into [mm:ss - Xs] format', () => {
      const sentences = [
        { text: 'Xin chào các bạn', start: 0, end: 3000 },
        { text: 'Hôm nay chúng ta học React', start: 75000, end: 80000 }, // 75s = 01:15
      ];
      const result = service.formatTranscriptWithTimestamps(sentences, '');

      expect(result).toContain('[00:00 - 0s] Xin chào các bạn');
      expect(result).toContain('[01:15 - 75s] Hôm nay chúng ta học React');
    });

    it('should fallback to rawTranscript if sentences array is empty', () => {
      const result = service.formatTranscriptWithTimestamps([], 'Văn bản thô');
      expect(result).toBe('Văn bản thô');
    });
  });

  describe('generateMindmap', () => {
    it('should throw BadRequestException if lessonId is empty', async () => {
      await expect(service.generateMindmap('')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if lesson does not exist', async () => {
      mockLessonRepo.findById.mockResolvedValueOnce(null);
      await expect(service.generateMindmap('lesson-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if transcript does not exist', async () => {
      mockLessonRepo.findById.mockResolvedValueOnce({ id: 'lesson-123', title: 'Bài học 1' });
      mockLessonTranscriptRepo.findByLessonId.mockResolvedValueOnce(null);

      await expect(service.generateMindmap('lesson-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if transcript is not READY', async () => {
      mockLessonRepo.findById.mockResolvedValueOnce({ id: 'lesson-123', title: 'Bài học 1' });
      mockLessonTranscriptRepo.findByLessonId.mockResolvedValueOnce({
        status: LessonTranscriptionStatusEnum.TRANSCRIBING,
      });

      await expect(service.generateMindmap('lesson-123')).rejects.toThrow(BadRequestException);
    });

    it('should call Gemini, validate tree, save draft, and return response metadata', async () => {
      mockLessonRepo.findById.mockResolvedValueOnce({
        id: 'lesson-123',
        title: 'Bài học React',
        content: { duration: 300 },
      });

      mockLessonTranscriptRepo.findByLessonId.mockResolvedValueOnce({
        status: LessonTranscriptionStatusEnum.READY,
        durationSeconds: 300,
        sentences: [{ text: 'Bài học React', start: 0, end: 5000 }],
        rawTranscript: 'Bài học React',
      });

      mockGeminiService.generateJson.mockResolvedValueOnce({
        data: sampleMindmapData,
        rawText: JSON.stringify(sampleMindmapData),
        model: 'gemini-2.5-flash',
        keyIndex: 0,
        maskedKey: 'AIzaSy...1111',
        executionTimeMs: 1250,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const response = await service.generateMindmap('lesson-123', { saveAsDraft: true }, 'instructor-1');

      expect(response.lessonId).toBe('lesson-123');
      expect(response.mindmap).toEqual(sampleMindmapData);
      expect(response.metadata.model).toBe('gemini-2.5-flash');
      expect(response.metadata.executionTimeMs).toBe(1250);

      // Verify draft was saved
      expect(mockLessonMindmapRepo.saveDraftByLessonId).toHaveBeenCalledWith(
        'lesson-123',
        sampleMindmapData,
        'instructor-1',
      );
    });
  });

  describe('getMindmap & applyDraft', () => {
    it('should get mindmap from repository', async () => {
      mockLessonMindmapRepo.findByLessonId.mockResolvedValueOnce({
        lessonId: 'lesson-123',
        mindmap: sampleMindmapData,
      });

      const result = await service.getMindmap('lesson-123');
      expect(result?.lessonId).toBe('lesson-123');
    });

    it('should apply draft to official mindmap', async () => {
      mockLessonMindmapRepo.applyDraftByLessonId.mockResolvedValueOnce({
        lessonId: 'lesson-123',
        mindmap: sampleMindmapData,
        draftMindmap: null,
      });

      const result = await service.applyDraft('lesson-123', 'instructor-1');
      expect(result.draftMindmap).toBeNull();
    });

    it('should throw BadRequestException if no draft exists to apply', async () => {
      mockLessonMindmapRepo.applyDraftByLessonId.mockResolvedValueOnce(null);

      await expect(service.applyDraft('lesson-123')).rejects.toThrow(BadRequestException);
    });
  });
});
