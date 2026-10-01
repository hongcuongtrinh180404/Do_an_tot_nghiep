import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  NotFoundException,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ILesson, RoleEnum } from 'share-lib';
import { LessonController } from '../lesson.controller.js';
import { LessonService } from '../services/lesson.service.js';
import { CreateLessonDto } from '../dto/create-lesson.dto.js';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator.js';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator.js';

describe('LessonController', () => {
  let controller: LessonController;
  let mockLessonService: {
    createLesson: ReturnType<typeof vi.fn>;
    getLessonsBySectionId: ReturnType<typeof vi.fn>;
  };

  const sampleSectionId = '607f1f77bcf86cd799439022';
  const sampleUserId = 'user_instructor_123';

  const sampleLesson: ILesson = {
    id: 'lesson_1',
    sectionId: sampleSectionId,
    title: 'Bài học 1: Giới thiệu khóa học',
    description: 'Nội dung chi tiết bài học',
    order: 0,
    content: null,
    isPreview: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    createdById: sampleUserId,
    updatedById: sampleUserId,
  };

  beforeEach(() => {
    mockLessonService = {
      createLesson: vi.fn(),
      getLessonsBySectionId: vi.fn(),
    };

    controller = new LessonController(mockLessonService as unknown as LessonService);
  });

  describe('POST /sections/:sectionId/lessons - createLesson', () => {
    it('1. should create lesson successfully and return standard ApiResponse with 201 Created', async () => {
      // Arrange
      const dto: CreateLessonDto = {
        title: 'Bài học 1: Giới thiệu khóa học',
        description: 'Nội dung chi tiết bài học',
        order: 0,
      };

      mockLessonService.createLesson.mockResolvedValue(sampleLesson);

      // Act
      const response = await controller.createLesson(sampleSectionId, sampleUserId, dto);

      // Assert
      expect(mockLessonService.createLesson).toHaveBeenCalledWith(sampleSectionId, {
        title: dto.title,
        description: dto.description,
        order: dto.order,
        content: null,
        isPreview: false,
        userId: sampleUserId,
      });

      expect(response.success).toBe(true);
      expect(response.data).toEqual(sampleLesson);
      expect(response.message).toBe('Tạo bài học thành công');
    });

    it('2. should correctly pass sectionId from route param and userId from CurrentUser to Service', async () => {
      // Arrange
      const customSectionId = '67890abcdef1234567890abc';
      const customUserId = 'user_admin_999';
      const dto: CreateLessonDto = {
        title: 'Bài học 2: Cài đặt công cụ',
        order: 1,
      };

      const customLesson: ILesson = {
        ...sampleLesson,
        id: 'lesson_2',
        sectionId: customSectionId,
        title: dto.title,
        description: null,
        order: 1,
        content: null,
        isPreview: false,
        createdById: customUserId,
        updatedById: customUserId,
      };

      mockLessonService.createLesson.mockResolvedValue(customLesson);

      // Act
      const response = await controller.createLesson(customSectionId, customUserId, dto);

      // Assert
      expect(mockLessonService.createLesson).toHaveBeenCalledWith(customSectionId, {
        title: dto.title,
        description: undefined,
        order: dto.order,
        content: null,
        isPreview: false,
        userId: customUserId,
      });
      expect(response.data.sectionId).toBe(customSectionId);
    });

    it('3. should propagate NotFoundException when LessonService throws (e.g. section not found)', async () => {
      // Arrange
      const dto: CreateLessonDto = {
        title: 'Bài học',
        order: 0,
      };

      mockLessonService.createLesson.mockRejectedValue(
        new NotFoundException(`Không tìm thấy chương học với ID '${sampleSectionId}'`),
      );

      // Act & Assert
      await expect(
        controller.createLesson(sampleSectionId, sampleUserId, dto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.createLesson(sampleSectionId, sampleUserId, dto),
      ).rejects.toThrow(`Không tìm thấy chương học với ID '${sampleSectionId}'`);
    });

    it('4. should propagate BadRequestException when LessonService throws (e.g. invalid order)', async () => {
      // Arrange
      const dto: CreateLessonDto = {
        title: 'Bài học',
        order: -1,
      };

      mockLessonService.createLesson.mockRejectedValue(
        new BadRequestException('Thứ tự bài học không được nhỏ hơn 0'),
      );

      // Act & Assert
      await expect(
        controller.createLesson(sampleSectionId, sampleUserId, dto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.createLesson(sampleSectionId, sampleUserId, dto),
      ).rejects.toThrow('Thứ tự bài học không được nhỏ hơn 0');
    });
  });

  describe('Route Metadata & Decorator Reflection', () => {
    it('5. should have controller route prefix configured as "sections"', () => {
      const controllerPath = Reflect.getMetadata('path', LessonController);
      expect(controllerPath).toBe('sections');
    });

    it('6. should have createLesson endpoint route path as ":sectionId/lessons"', () => {
      const routePath = Reflect.getMetadata('path', LessonController.prototype.createLesson);
      expect(routePath).toBe(':sectionId/lessons');
    });

    it('7. should have HttpStatus.CREATED (201) decorator on createLesson', () => {
      const httpCode = Reflect.getMetadata(
        '__httpCode__',
        LessonController.prototype.createLesson,
      );
      expect(httpCode).toBe(HttpStatus.CREATED);
    });

    it('8. should enforce INSTRUCTOR and ADMIN roles on createLesson route', () => {
      const reflector = new Reflector();
      const roles = reflector.get<string[]>(ROLES_KEY, LessonController.prototype.createLesson);

      expect(roles).toBeDefined();
      expect(roles).toContain(RoleEnum.INSTRUCTOR);
      expect(roles).toContain(RoleEnum.ADMIN);
    });
  });

  describe('CreateLessonDto Validation in ValidationPipe', () => {
    let validationPipe: ValidationPipe;

    beforeEach(() => {
      validationPipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });
    });

    it('9. should validate and transform valid payload successfully', async () => {
      const payload = {
        title: '   Bài học hợp lệ   ',
        description: 'Mô tả bài học',
        order: '2',
      };

      const transformed = await validationPipe.transform(payload, {
        type: 'body',
        metatype: CreateLessonDto,
      });

      expect(transformed).toBeInstanceOf(CreateLessonDto);
      expect(transformed.title).toBe('Bài học hợp lệ');
      expect(transformed.order).toBe(2);
    });

    it('10. should reject missing title with BadRequestException', async () => {
      const payload = {
        order: 0,
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: CreateLessonDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('11. should reject empty or whitespace-only title with BadRequestException', async () => {
      const payload = {
        title: '      ',
        order: 0,
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: CreateLessonDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('12. should reject negative order with BadRequestException', async () => {
      const payload = {
        title: 'Bài học 1',
        order: -1,
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: CreateLessonDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('13. should reject non-whitelisted fields with BadRequestException', async () => {
      const payload = {
        title: 'Bài học 1',
        order: 0,
        sectionId: sampleSectionId, // non-whitelisted field in body
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: CreateLessonDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('GET /sections/:sectionId/lessons - getLessons', () => {
    it('14. should return list of lessons and standard ApiResponse', async () => {
      const mockLessons: ILesson[] = [
        sampleLesson,
        {
          ...sampleLesson,
          id: 'lesson_2',
          title: 'Bài học 2: Cài đặt công cụ',
          order: 1,
        },
      ];

      mockLessonService.getLessonsBySectionId.mockResolvedValue(mockLessons);

      const response = await controller.getLessons(sampleSectionId);

      expect(mockLessonService.getLessonsBySectionId).toHaveBeenCalledWith(sampleSectionId);
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockLessons);
      expect(response.message).toBe('Lấy danh sách bài học thành công');
    });

    it('15. should return empty array [] when section has no lessons', async () => {
      mockLessonService.getLessonsBySectionId.mockResolvedValue([]);

      const response = await controller.getLessons(sampleSectionId);

      expect(mockLessonService.getLessonsBySectionId).toHaveBeenCalledWith(sampleSectionId);
      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
      expect(response.message).toBe('Lấy danh sách bài học thành công');
    });

    it('16. should propagate NotFoundException when Section is not found or soft-deleted', async () => {
      mockLessonService.getLessonsBySectionId.mockRejectedValue(
        new NotFoundException(`Không tìm thấy chương học với ID '${sampleSectionId}'`),
      );

      await expect(controller.getLessons(sampleSectionId)).rejects.toThrow(NotFoundException);
      await expect(controller.getLessons(sampleSectionId)).rejects.toThrow(
        `Không tìm thấy chương học với ID '${sampleSectionId}'`,
      );
    });

    it('17. should have @Public() metadata and route path on getLessons', () => {
      const reflector = new Reflector();
      const isPublic = reflector.get<boolean>(IS_PUBLIC_KEY, LessonController.prototype.getLessons);
      const routePath = Reflect.getMetadata('path', LessonController.prototype.getLessons);

      expect(isPublic).toBe(true);
      expect(routePath).toBe(':sectionId/lessons');
    });
  });
});
