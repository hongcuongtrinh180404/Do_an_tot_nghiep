import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ILesson, ILessonTranscript, LessonContentTypeEnum, LessonTranscriptionStatusEnum, RoleEnum } from 'share-lib';
import { ParseObjectIdPipe } from '../../base/index.js';
import { LessonsController } from '../lessons.controller.js';
import { LessonService } from '../services/lesson.service.js';
import { LessonTranscriptService } from '../services/lesson-transcript.service.js';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator.js';

describe('LessonsController', () => {
  let controller: LessonsController;
  let mockLessonService: {
    getLessonById: ReturnType<typeof vi.fn>;
    addMaterial: ReturnType<typeof vi.fn>;
    deleteMaterial: ReturnType<typeof vi.fn>;
    deleteLesson: ReturnType<typeof vi.fn>;
  };
  let mockLessonTranscriptService: {
    getTranscriptByLessonId: ReturnType<typeof vi.fn>;
    retryTranscription: ReturnType<typeof vi.fn>;
  };

  const sampleLessonId = '607f1f77bcf86cd799439011';
  const sampleSectionId = '607f1f77bcf86cd799439022';
  const sampleUserId = 'user_instructor_123';

  const sampleLesson: ILesson = {
    id: sampleLessonId,
    sectionId: sampleSectionId,
    title: '01. Tổng quan kiến trúc hệ thống',
    description: 'Nội dung bài học giới thiệu...',
    order: 0,
    content: {
      type: LessonContentTypeEnum.VIDEO,
      url: 'http://localhost:9000/thc-datn-media/courses/lessons/lesson-01.mp4',
      publicId: 'courses/lessons/lesson-01',
      fileName: 'lesson-01.mp4',
      fileSize: 35680120,
      mimeType: 'video/mp4',
      duration: 485,
    },
    isPreview: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdById: sampleUserId,
    updatedById: sampleUserId,
  };

  beforeEach(() => {
    mockLessonService = {
      getLessonById: vi.fn(),
      addMaterial: vi.fn(),
      deleteMaterial: vi.fn(),
      deleteLesson: vi.fn(),
    };

    mockLessonTranscriptService = {
      getTranscriptByLessonId: vi.fn(),
      retryTranscription: vi.fn(),
    };

    controller = new LessonsController(
      mockLessonService as unknown as LessonService,
      mockLessonTranscriptService as unknown as LessonTranscriptService,
    );
  });

  describe('GET /lessons/:id - getLessonDetail', () => {
    it('1. should return lesson detail successfully and wrap in standard ApiResponse', async () => {
      mockLessonService.getLessonById.mockResolvedValue(sampleLesson);

      const response = await controller.getLessonDetail(sampleLessonId);

      expect(mockLessonService.getLessonById).toHaveBeenCalledWith(sampleLessonId);
      expect(response.success).toBe(true);
      expect(response.message).toBe('Lấy thông tin bài học thành công');
      expect(response.data).toEqual(sampleLesson);
    });

    it('2. should propagate NotFoundException when LessonService throws', async () => {
      mockLessonService.getLessonById.mockRejectedValue(
        new NotFoundException(`Không tìm thấy bài học với ID '${sampleLessonId}'`),
      );

      await expect(controller.getLessonDetail(sampleLessonId)).rejects.toThrow(NotFoundException);
      await expect(controller.getLessonDetail(sampleLessonId)).rejects.toThrow(
        `Không tìm thấy bài học với ID '${sampleLessonId}'`,
      );
    });
  });

  describe('Route Metadata & Decorator Reflection', () => {
    it('3. should have controller route prefix configured as "lessons"', () => {
      const controllerPath = Reflect.getMetadata('path', LessonsController);
      expect(controllerPath).toBe('lessons');
    });

    it('4. should have getLessonDetail endpoint route path as ":id"', () => {
      const routePath = Reflect.getMetadata('path', LessonsController.prototype.getLessonDetail);
      expect(routePath).toBe(':id');
    });

    it('5. should have @Public() metadata on getLessonDetail route', () => {
      const reflector = new Reflector();
      const isPublic = reflector.get<boolean>(IS_PUBLIC_KEY, LessonsController.prototype.getLessonDetail);
      expect(isPublic).toBe(true);
    });
  });

  describe('ParseObjectIdPipe Parameter Validation', () => {
    let pipe: ParseObjectIdPipe;

    beforeEach(() => {
      pipe = new ParseObjectIdPipe();
    });

    it('6. should allow valid 24-character hexadecimal ObjectId string', () => {
      const validId = '507f1f77bcf86cd799439011';
      expect(pipe.transform(validId)).toBe(validId);
    });

    it('7. should throw BadRequestException for invalid ObjectId string', () => {
      const invalidId = 'not-a-valid-object-id';
      expect(() => pipe.transform(invalidId)).toThrow(BadRequestException);
    });
  });

  describe('POST /lessons/:id/materials - uploadMaterial', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'slides.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: Buffer.from('data'),
      size: 5000,
      destination: '',
      filename: '',
      path: '',
      stream: null as any,
    };

    it('8. should upload material and return success ApiResponse', async () => {
      const updatedLesson = { ...sampleLesson };
      mockLessonService.addMaterial.mockResolvedValue(updatedLesson);

      const response = await controller.uploadMaterial(
        sampleLessonId,
        mockFile,
        'Tài liệu buổi 1',
        sampleUserId,
        RoleEnum.INSTRUCTOR,
      );

      expect(mockLessonService.addMaterial).toHaveBeenCalledWith(
        sampleLessonId,
        mockFile,
        'Tài liệu buổi 1',
        sampleUserId,
        RoleEnum.INSTRUCTOR,
      );
      expect(response.success).toBe(true);
      expect(response.message).toBe('Đính kèm tài liệu thành công');
      expect(response.data).toEqual(updatedLesson);
    });
  });

  describe('DELETE /lessons/:id/materials/:materialId - deleteMaterial', () => {
    const sampleMaterialId = '607f1f77bcf86cd799439099';

    it('9. should delete material and return success ApiResponse', async () => {
      const updatedLesson = { ...sampleLesson };
      mockLessonService.deleteMaterial.mockResolvedValue(updatedLesson);

      const response = await controller.deleteMaterial(
        sampleLessonId,
        sampleMaterialId,
        sampleUserId,
        RoleEnum.INSTRUCTOR,
      );

      expect(mockLessonService.deleteMaterial).toHaveBeenCalledWith(
        sampleLessonId,
        sampleMaterialId,
        sampleUserId,
        RoleEnum.INSTRUCTOR,
      );
      expect(response.success).toBe(true);
      expect(response.message).toBe('Xóa tài liệu thành công');
      expect(response.data).toEqual(updatedLesson);
    });
  });

  describe('DELETE /lessons/:id - deleteLesson', () => {
    it('10. should delete lesson and return success ApiResponse with null data', async () => {
      mockLessonService.deleteLesson.mockResolvedValue(true);

      const response = await controller.deleteLesson(
        sampleLessonId,
        sampleUserId,
        RoleEnum.INSTRUCTOR,
      );

      expect(mockLessonService.deleteLesson).toHaveBeenCalledWith(
        sampleLessonId,
        sampleUserId,
        RoleEnum.INSTRUCTOR,
      );
      expect(response.success).toBe(true);
      expect(response.message).toBe('Xóa bài học thành công');
      expect(response.data).toBeNull();
    });

    it('11. should propagate exception when LessonService throws', async () => {
      mockLessonService.deleteLesson.mockRejectedValue(
        new NotFoundException(`Không tìm thấy bài học với ID '${sampleLessonId}'`),
      );

      await expect(
        controller.deleteLesson(sampleLessonId, sampleUserId, RoleEnum.INSTRUCTOR),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /lessons/:id/transcript - getLessonTranscript', () => {
    it('12. should return lesson transcript wrapped in standard ApiResponse', async () => {
      const sampleTranscript: ILessonTranscript = {
        id: 'trans_123',
        lessonId: sampleLessonId,
        rawTranscript: 'Chào mừng các bạn',
        words: [],
        durationSeconds: 120,
        languageCode: 'vi',
        status: LessonTranscriptionStatusEnum.READY,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockLessonTranscriptService.getTranscriptByLessonId.mockResolvedValue(sampleTranscript);

      const response = await controller.getLessonTranscript(sampleLessonId);

      expect(mockLessonTranscriptService.getTranscriptByLessonId).toHaveBeenCalledWith(sampleLessonId);
      expect(response.success).toBe(true);
      expect(response.data).toEqual(sampleTranscript);
      expect(response.message).toBe('Lấy transcript bài học thành công');
    });
  });

  describe('POST /lessons/:id/transcript/retry - retryTranscription', () => {
    it('13. should trigger retry transcription and return success message', async () => {
      mockLessonTranscriptService.retryTranscription.mockResolvedValue(undefined);

      const response = await controller.retryTranscription(sampleLessonId);

      expect(mockLessonTranscriptService.retryTranscription).toHaveBeenCalledWith(sampleLessonId);
      expect(response.success).toBe(true);
      expect(response.message).toBe('Đã kích hoạt lại tiến trình trích xuất transcript');
    });
  });
});
