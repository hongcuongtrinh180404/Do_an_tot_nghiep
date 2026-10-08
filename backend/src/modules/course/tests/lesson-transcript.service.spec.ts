import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Readable } from 'stream';
import {
  ILesson,
  ILessonTranscript,
  LessonTranscriptionStatusEnum,
  LessonContentTypeEnum,
} from 'share-lib';
import { LessonTranscriptService } from '../services/lesson-transcript.service.js';
import { LessonTranscriptRepository } from '../repositories/lesson-transcript.repository.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { StorageService } from '../../storage/index.js';
import { AssemblyAiService } from '../../assemblyai/index.js';

describe('LessonTranscriptService', () => {
  let service: LessonTranscriptService;
  let mockLessonTranscriptRepo: {
    findByLessonId: ReturnType<typeof vi.fn>;
    upsertByLessonId: ReturnType<typeof vi.fn>;
    updateStatusByLessonId: ReturnType<typeof vi.fn>;
  };
  let mockLessonRepo: {
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockStorageService: {
    getObjectStream: ReturnType<typeof vi.fn>;
  };
  let mockAssemblyAiService: {
    transcribeStream: ReturnType<typeof vi.fn>;
  };
  let mockCls: { get: ReturnType<typeof vi.fn> };

  const sampleLessonId = 'lesson_123456';
  const sampleVideoKey = 'courses/lessons/video-1.mp4';

  const sampleTranscript: ILessonTranscript = {
    id: 'trans_123',
    lessonId: sampleLessonId,
    rawTranscript: 'Chào mừng các bạn đến với khóa học lập trình NestJS',
    sentences: [
      { text: 'Chào mừng các bạn đến với khóa học lập trình NestJS.', start: 100, end: 500 },
    ],
    durationSeconds: 120,
    languageCode: 'vi',
    status: LessonTranscriptionStatusEnum.READY,
    externalTranscriptId: 'ext_trans_abc',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleLesson: ILesson = {
    id: sampleLessonId,
    sectionId: 'sec_1',
    title: 'Bài 1: Giới thiệu',
    order: 1,
    isPreview: false,
    content: {
      type: LessonContentTypeEnum.VIDEO,
      url: 'http://localhost:9000/thc-datn-media/courses/lessons/video-1.mp4',
      publicId: sampleVideoKey,
    },
    transcriptionStatus: LessonTranscriptionStatusEnum.IDLE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockLessonTranscriptRepo = {
      findByLessonId: vi.fn(),
      upsertByLessonId: vi.fn(),
      updateStatusByLessonId: vi.fn(),
    };

    mockLessonRepo = {
      findById: vi.fn(),
      update: vi.fn(),
    };

    mockStorageService = {
      getObjectStream: vi.fn(),
    };

    mockAssemblyAiService = {
      transcribeStream: vi.fn(),
    };

    mockCls = {
      get: vi.fn().mockReturnValue('user_admin'),
    };

    service = new LessonTranscriptService(
      mockLessonTranscriptRepo as unknown as LessonTranscriptRepository,
      mockLessonRepo as unknown as LessonRepository,
      mockStorageService as unknown as StorageService,
      mockAssemblyAiService as unknown as AssemblyAiService,
      mockCls as unknown as ClsService,
    );
  });

  describe('getTranscriptByLessonId', () => {
    it('should throw BadRequestException if lessonId is empty or whitespace', async () => {
      await expect(service.getTranscriptByLessonId('   ')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if transcript not found', async () => {
      mockLessonTranscriptRepo.findByLessonId.mockResolvedValue(null);
      await expect(service.getTranscriptByLessonId(sampleLessonId)).rejects.toThrow(NotFoundException);
    });

    it('should return transcript when found', async () => {
      mockLessonTranscriptRepo.findByLessonId.mockResolvedValue(sampleTranscript);
      const result = await service.getTranscriptByLessonId(sampleLessonId);
      expect(result).toEqual(sampleTranscript);
      expect(mockLessonTranscriptRepo.findByLessonId).toHaveBeenCalledWith(sampleLessonId);
    });
  });

  describe('processTranscriptionTask', () => {
    it('should stream video from MinIO, transcribe with AssemblyAI and update DB to READY', async () => {
      // Arrange
      const mockStream = Readable.from(['audio data']);
      mockStorageService.getObjectStream.mockResolvedValue(mockStream);

      mockAssemblyAiService.transcribeStream.mockResolvedValue({
        transcriptId: 'aai_trans_999',
        rawTranscript: 'Chào mừng các bạn',
        sentences: [{ text: 'Chào mừng các bạn.', start: 0, end: 200 }],
        durationSeconds: 125,
        languageCode: 'vi',
      });

      mockLessonRepo.findById.mockResolvedValue(sampleLesson);

      // Act
      await service.processTranscriptionTask(sampleLessonId, sampleVideoKey);

      // Assert
      expect(mockStorageService.getObjectStream).toHaveBeenCalledWith(sampleVideoKey);
      expect(mockAssemblyAiService.transcribeStream).toHaveBeenCalledWith(mockStream, {
        languageCode: 'vi',
      });
      expect(mockLessonTranscriptRepo.upsertByLessonId).toHaveBeenCalledWith(
        sampleLessonId,
        expect.objectContaining({
          rawTranscript: 'Chào mừng các bạn',
          sentences: [{ text: 'Chào mừng các bạn.', start: 0, end: 200 }],
          status: LessonTranscriptionStatusEnum.READY,
          durationSeconds: 125,
          externalTranscriptId: 'aai_trans_999',
        }),
      );
      expect(mockLessonRepo.update).toHaveBeenCalledWith(
        sampleLessonId,
        expect.objectContaining({
          transcriptionStatus: LessonTranscriptionStatusEnum.READY,
          content: expect.objectContaining({
            duration: 125,
          }),
        }),
      );
    });
  });

  describe('triggerTranscription', () => {
    it('should do nothing if lessonId or videoKey is missing', () => {
      service.triggerTranscription('', sampleVideoKey);
      expect(mockLessonRepo.update).not.toHaveBeenCalled();
    });

    it('should initiate background processing and update statuses', async () => {
      const processSpy = vi
        .spyOn(service, 'processTranscriptionTask')
        .mockResolvedValue(undefined);

      service.triggerTranscription(sampleLessonId, sampleVideoKey);

      // Wait a microtask tick for async IIFE inside triggerTranscription
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockLessonRepo.update).toHaveBeenCalledWith(
        sampleLessonId,
        expect.objectContaining({
          transcriptionStatus: LessonTranscriptionStatusEnum.TRANSCRIBING,
        }),
      );
      expect(mockLessonTranscriptRepo.upsertByLessonId).toHaveBeenCalledWith(
        sampleLessonId,
        expect.objectContaining({
          status: LessonTranscriptionStatusEnum.TRANSCRIBING,
        }),
      );
      expect(processSpy).toHaveBeenCalledWith(sampleLessonId, sampleVideoKey);
    });

    it('should set FAILED status if processTranscriptionTask throws', async () => {
      vi.spyOn(service, 'processTranscriptionTask').mockRejectedValue(
        new Error('AssemblyAI API connection failure'),
      );

      service.triggerTranscription(sampleLessonId, sampleVideoKey);

      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(mockLessonRepo.update).toHaveBeenCalledWith(
        sampleLessonId,
        expect.objectContaining({
          transcriptionStatus: LessonTranscriptionStatusEnum.FAILED,
        }),
      );
      expect(mockLessonTranscriptRepo.updateStatusByLessonId).toHaveBeenCalledWith(
        sampleLessonId,
        LessonTranscriptionStatusEnum.FAILED,
        'AssemblyAI API connection failure',
      );
    });
  });

  describe('retryTranscription', () => {
    it('should throw BadRequestException if lessonId is empty', async () => {
      await expect(service.retryTranscription('')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if lesson not found', async () => {
      mockLessonRepo.findById.mockResolvedValue(null);
      await expect(service.retryTranscription('unknown_lesson')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if lesson does not contain video', async () => {
      mockLessonRepo.findById.mockResolvedValue({
        ...sampleLesson,
        content: null,
      });
      await expect(service.retryTranscription(sampleLessonId)).rejects.toThrow(BadRequestException);
    });

    it('should trigger transcription if lesson contains valid video', async () => {
      mockLessonRepo.findById.mockResolvedValue(sampleLesson);
      const triggerSpy = vi.spyOn(service, 'triggerTranscription').mockImplementation(() => {});

      await service.retryTranscription(sampleLessonId);

      expect(triggerSpy).toHaveBeenCalledWith(sampleLessonId, sampleVideoKey);
    });
  });
});
