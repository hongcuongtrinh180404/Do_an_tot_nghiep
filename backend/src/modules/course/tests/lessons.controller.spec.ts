import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException, ArgumentMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ILesson } from 'share-lib';
import { ParseObjectIdPipe } from '../../base/index.js';
import { LessonsController } from '../lessons.controller.js';
import { LessonService } from '../services/lesson.service.js';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator.js';

describe('LessonsController', () => {
  let controller: LessonsController;
  let mockLessonService: {
    getLessonById: ReturnType<typeof vi.fn>;
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
      type: 'video' as unknown as ILesson['content'] extends infer C ? NonNullable<C>['type'] : never,
      url: 'https://res.cloudinary.com/demo/video/upload/lesson-01.mp4',
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
    };

    controller = new LessonsController(mockLessonService as unknown as LessonService);
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
    const metadata: ArgumentMetadata = { type: 'param', data: 'id' };

    beforeEach(() => {
      pipe = new ParseObjectIdPipe();
    });

    it('6. should allow valid 24-character hexadecimal ObjectId string', () => {
      const validId = '507f1f77bcf86cd799439011';
      expect(pipe.transform(validId, metadata)).toBe(validId);
    });

    it('7. should throw BadRequestException for invalid ObjectId string', () => {
      const invalidId = 'not-a-valid-object-id';
      expect(() => pipe.transform(invalidId, metadata)).toThrow(BadRequestException);
    });
  });
});
