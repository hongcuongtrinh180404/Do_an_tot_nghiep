/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { RoleEnum } from 'share-lib';
import { TranscriptAnalysisController } from '../transcript-analysis.controller.js';
import { MindmapAnalysisService } from '../services/mindmap-analysis.service.js';
import { QuizGenerationService } from '../services/quiz-generation.service.js';
import { SummaryGenerationService } from '../services/summary-generation.service.js';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator.js';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator.js';

describe('TranscriptAnalysisController', () => {
  let controller: TranscriptAnalysisController;
  let mockMindmapService: {
    generateMindmap: ReturnType<typeof vi.fn>;
    getMindmap: ReturnType<typeof vi.fn>;
    updateMindmap: ReturnType<typeof vi.fn>;
    applyDraft: ReturnType<typeof vi.fn>;
  };
  let mockQuizService: {
    generateQuiz: ReturnType<typeof vi.fn>;
    getQuizDraft: ReturnType<typeof vi.fn>;
    applyDraft: ReturnType<typeof vi.fn>;
  };
  let mockSummaryService: {
    generateSummary: ReturnType<typeof vi.fn>;
    getSummary: ReturnType<typeof vi.fn>;
    updateSummary: ReturnType<typeof vi.fn>;
    applyDraft: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockMindmapService = {
      generateMindmap: vi.fn(),
      getMindmap: vi.fn(),
      updateMindmap: vi.fn(),
      applyDraft: vi.fn(),
    };
    mockQuizService = {
      generateQuiz: vi.fn(),
      getQuizDraft: vi.fn(),
      applyDraft: vi.fn(),
    };
    mockSummaryService = {
      generateSummary: vi.fn(),
      getSummary: vi.fn(),
      updateSummary: vi.fn(),
      applyDraft: vi.fn(),
    };

    controller = new TranscriptAnalysisController(
      mockMindmapService as unknown as MindmapAnalysisService,
      mockQuizService as unknown as QuizGenerationService,
      mockSummaryService as unknown as SummaryGenerationService,
    );
  });

  describe('Mindmap Endpoints', () => {
    it('should generate mindmap and require INSTRUCTOR / ADMIN', async () => {
      const reflector = new Reflector();
      const roles = reflector.get<RoleEnum[]>(
        ROLES_KEY,
        TranscriptAnalysisController.prototype.generateMindmap,
      );
      expect(roles).toEqual([RoleEnum.INSTRUCTOR, RoleEnum.ADMIN]);

      mockMindmapService.generateMindmap.mockResolvedValueOnce({ lessonId: 'lesson-123' });
      const res = await controller.generateMindmap('lesson-123', { saveAsDraft: true }, 'user-1');
      expect(res.success).toBe(true);
      expect(mockMindmapService.generateMindmap).toHaveBeenCalled();
    });

    it('should get mindmap and be marked as @Public', async () => {
      const reflector = new Reflector();
      const isPublic = reflector.get<boolean>(
        IS_PUBLIC_KEY,
        TranscriptAnalysisController.prototype.getMindmap,
      );
      expect(isPublic).toBe(true);

      mockMindmapService.getMindmap.mockResolvedValueOnce({ lessonId: 'lesson-123' });
      const res = await controller.getMindmap('lesson-123');
      expect(res.success).toBe(true);
    });

    it('should update mindmap and require INSTRUCTOR / ADMIN', async () => {
      const reflector = new Reflector();
      const roles = reflector.get<RoleEnum[]>(
        ROLES_KEY,
        TranscriptAnalysisController.prototype.updateMindmap,
      );
      expect(roles).toEqual([RoleEnum.INSTRUCTOR, RoleEnum.ADMIN]);

      const mockPayload = {
        mindmap: {
          root: { id: 'root', title: 'Test', timestamp: 0 },
        },
      };

      mockMindmapService.updateMindmap.mockResolvedValueOnce({ lessonId: 'lesson-123' });
      const res = await controller.updateMindmap('lesson-123', mockPayload, 'user-1');
      expect(res.success).toBe(true);
      expect(mockMindmapService.updateMindmap).toHaveBeenCalledWith(
        'lesson-123',
        mockPayload,
        'user-1',
      );
    });

    it('should apply draft mindmap', async () => {
      mockMindmapService.applyDraft.mockResolvedValueOnce({ lessonId: 'lesson-123' });
      const res = await controller.applyDraftMindmap('lesson-123', 'user-1');
      expect(res.success).toBe(true);
    });
  });

  describe('Quiz Endpoints', () => {
    it('should generate quiz and require INSTRUCTOR / ADMIN', async () => {
      const reflector = new Reflector();
      const roles = reflector.get<RoleEnum[]>(
        ROLES_KEY,
        TranscriptAnalysisController.prototype.generateQuiz,
      );
      expect(roles).toEqual([RoleEnum.INSTRUCTOR, RoleEnum.ADMIN]);

      mockQuizService.generateQuiz.mockResolvedValueOnce({ lessonId: 'lesson-123', quizzes: [] });
      const res = await controller.generateQuiz('lesson-123', { count: 10 }, 'user-1');
      expect(res.success).toBe(true);
      expect(mockQuizService.generateQuiz).toHaveBeenCalledWith('lesson-123', { count: 10 }, 'user-1');
    });

    it('should get quiz draft and require INSTRUCTOR / ADMIN', async () => {
      const reflector = new Reflector();
      const roles = reflector.get<RoleEnum[]>(
        ROLES_KEY,
        TranscriptAnalysisController.prototype.getQuizDraft,
      );
      expect(roles).toEqual([RoleEnum.INSTRUCTOR, RoleEnum.ADMIN]);

      mockQuizService.getQuizDraft.mockResolvedValueOnce({ lessonId: 'lesson-123', quizzes: [] });
      const res = await controller.getQuizDraft('lesson-123');
      expect(res.success).toBe(true);
    });

    it('should apply quiz draft to official quizzes', async () => {
      mockQuizService.applyDraft.mockResolvedValueOnce([{ id: 'quiz-1' }]);
      const res = await controller.applyDraftQuiz('lesson-123', 'user-1');
      expect(res.success).toBe(true);
      expect(mockQuizService.applyDraft).toHaveBeenCalledWith('lesson-123', 'user-1');
    });
  });

  describe('Summary Endpoints', () => {
    it('should generate summary and require INSTRUCTOR / ADMIN', async () => {
      const reflector = new Reflector();
      const roles = reflector.get<RoleEnum[]>(
        ROLES_KEY,
        TranscriptAnalysisController.prototype.generateSummary,
      );
      expect(roles).toEqual([RoleEnum.INSTRUCTOR, RoleEnum.ADMIN]);

      mockSummaryService.generateSummary.mockResolvedValueOnce({ lessonId: 'lesson-123' });
      const res = await controller.generateSummary('lesson-123', {}, 'user-1');
      expect(res.success).toBe(true);
      expect(mockSummaryService.generateSummary).toHaveBeenCalled();
    });

    it('should get summary and be marked as @Public', async () => {
      const reflector = new Reflector();
      const isPublic = reflector.get<boolean>(
        IS_PUBLIC_KEY,
        TranscriptAnalysisController.prototype.getSummary,
      );
      expect(isPublic).toBe(true);

      mockSummaryService.getSummary.mockResolvedValueOnce({ lessonId: 'lesson-123' });
      const res = await controller.getSummary('lesson-123');
      expect(res.success).toBe(true);
    });

    it('should update summary and require INSTRUCTOR / ADMIN', async () => {
      const reflector = new Reflector();
      const roles = reflector.get<RoleEnum[]>(
        ROLES_KEY,
        TranscriptAnalysisController.prototype.updateSummary,
      );
      expect(roles).toEqual([RoleEnum.INSTRUCTOR, RoleEnum.ADMIN]);

      mockSummaryService.updateSummary.mockResolvedValueOnce({ lessonId: 'lesson-123' });
      const res = await controller.updateSummary(
        'lesson-123',
        { title: 'T', overview: 'O', keyPoints: [] },
        'user-1',
      );
      expect(res.success).toBe(true);
      expect(mockSummaryService.updateSummary).toHaveBeenCalledWith(
        'lesson-123',
        { title: 'T', overview: 'O', keyPoints: [] },
        'user-1',
      );
    });

    it('should apply summary draft to official', async () => {
      mockSummaryService.applyDraft.mockResolvedValueOnce({ lessonId: 'lesson-123' });
      const res = await controller.applyDraftSummary('lesson-123', 'user-1');
      expect(res.success).toBe(true);
      expect(mockSummaryService.applyDraft).toHaveBeenCalledWith('lesson-123', 'user-1');
    });
  });
});
