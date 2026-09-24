import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ConflictException,
  BadRequestException,
  ForbiddenException,
  ValidationPipe,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  RoleEnum,
  CourseLevelEnum,
  CourseStatusEnum,
  ICourse,
  IUserProfile,
  UserStatusEnum,
  AuthProviderEnum,
} from 'share-lib';
import { CourseController } from '../course.controller.js';
import { CourseService } from '../services/course.service.js';
import { CreateCourseDto } from '../dto/create-course.dto.js';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';

describe('CourseController', () => {
  let controller: CourseController;
  let mockCourseService: {
    createCourse: ReturnType<typeof vi.fn>;
  };

  const sampleCourse: ICourse = {
    id: 'course_123',
    title: 'Khóa học TypeScript Chuyên Sâu',
    slug: 'khoa-hoc-typescript-chuyen-sau',
    instructorId: 'instructor_1',
    description: 'Nội dung chi tiết',
    shortDescription: 'Mô tả ngắn gọn',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    price: 499000,
    status: CourseStatusEnum.DRAFT,
    level: CourseLevelEnum.INTERMEDIATE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createSamplePayload = (): Record<string, unknown> => ({
    title: 'Khóa học TypeScript Chuyên Sâu',
    slug: 'khoa-hoc-typescript-chuyen-sau',
    description: 'Nội dung chi tiết',
    shortDescription: 'Mô tả ngắn gọn',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    price: 499000,
    level: CourseLevelEnum.INTERMEDIATE,
  });

  beforeEach(() => {
    mockCourseService = {
      createCourse: vi.fn(),
    };

    controller = new CourseController(mockCourseService as unknown as CourseService);
  });

  describe('POST /courses - create', () => {
    it('1. should allow INSTRUCTOR to create a course successfully', async () => {
      // Arrange
      const instructorId = 'instructor_1';
      const payload = createSamplePayload() as unknown as CreateCourseDto;
      mockCourseService.createCourse.mockResolvedValue(sampleCourse);

      // Act
      const response = await controller.create(instructorId, payload);

      // Assert
      expect(mockCourseService.createCourse).toHaveBeenCalledWith(
        expect.objectContaining({
          title: payload.title,
          slug: payload.slug,
          instructorId,
        }),
      );
      expect(response.success).toBe(true);
      expect(response.message).toBe('Tạo khóa học thành công');
      expect(response.data).toEqual(sampleCourse);
    });

    it('2. should allow ADMIN to create a course successfully', async () => {
      // Arrange
      const adminId = 'admin_999';
      const payload = createSamplePayload() as unknown as CreateCourseDto;
      const adminCourse: ICourse = {
        ...sampleCourse,
        instructorId: adminId,
      };
      mockCourseService.createCourse.mockResolvedValue(adminCourse);

      // Act
      const response = await controller.create(adminId, payload);

      // Assert
      expect(mockCourseService.createCourse).toHaveBeenCalledWith(
        expect.objectContaining({
          title: payload.title,
          slug: payload.slug,
          instructorId: adminId,
        }),
      );
      expect(response.success).toBe(true);
      expect(response.data).toEqual(adminCourse);
    });

    it('3. should reject STUDENT access via @Roles configuration and RolesGuard', () => {
      // Arrange: verify controller metadata
      const reflector = new Reflector();
      // oxlint-disable-next-line typescript/unbound-method
      const handler = CourseController.prototype.create;
      const roles = reflector.get<RoleEnum[]>(ROLES_KEY, handler);
      expect(roles).toEqual([RoleEnum.INSTRUCTOR, RoleEnum.ADMIN]);

      // Assert: verify RolesGuard rejects STUDENT role
      const guard = new RolesGuard(reflector);
      const studentUser: IUserProfile = {
        id: 'student_1',
        email: 'student@example.com',
        fullName: 'Student User',
        role: RoleEnum.STUDENT,
        status: UserStatusEnum.ACTIVE,
        provider: AuthProviderEnum.LOCAL,
      };

      const mockContext = {
        getHandler: vi.fn().mockReturnValue(handler),
        getClass: vi.fn().mockReturnValue(CourseController),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue({ user: studentUser }),
        }),
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
    });

    it('4. should propagate ConflictException when course slug already exists', async () => {
      // Arrange
      const payload = createSamplePayload() as unknown as CreateCourseDto;
      mockCourseService.createCourse.mockRejectedValue(
        new ConflictException("Course with slug 'khoa-hoc-typescript-chuyen-sau' already exists"),
      );

      // Act & Assert
      await expect(controller.create('instructor_1', payload)).rejects.toThrow(
        ConflictException,
      );
    });

    it('5. should ignore/reject instructorId in request body and strictly use @CurrentUser', async () => {
      // Arrange: Client tries to inject a foreign instructorId in body
      const injectedBody = {
        ...createSamplePayload(),
        instructorId: 'attacker_fake_id',
      } as unknown as CreateCourseDto;
      mockCourseService.createCourse.mockResolvedValue(sampleCourse);

      // Act: Controller should always pass authenticated userId ('real_instructor_id')
      await controller.create('real_instructor_id', injectedBody);

      // Assert: The service is called with the authenticated userId, never attacker_fake_id
      expect(mockCourseService.createCourse).toHaveBeenCalledWith(
        expect.objectContaining({
          instructorId: 'real_instructor_id',
        }),
      );
      expect(mockCourseService.createCourse).not.toHaveBeenCalledWith(
        expect.objectContaining({
          instructorId: 'attacker_fake_id',
        }),
      );
    });
  });

  describe('CreateCourseDto Validation (ValidationPipe)', () => {
    let validationPipe: ValidationPipe;

    beforeEach(() => {
      validationPipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });
    });

    it('should reject when instructorId is sent in body (forbidNonWhitelisted)', async () => {
      const payload = {
        ...createSamplePayload(),
        instructorId: 'hacker_123',
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: CreateCourseDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when status is sent in body (client not allowed to set status)', async () => {
      const payload = {
        ...createSamplePayload(),
        status: CourseStatusEnum.PUBLISHED,
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: CreateCourseDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when price is negative', async () => {
      const payload = {
        title: 'Khóa học Next.js',
        slug: 'khoa-hoc-nextjs',
        price: -50000,
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: CreateCourseDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid slug format', async () => {
      const payload = {
        title: 'Khóa học React',
        slug: 'Khoa Hoc React! #1',
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: CreateCourseDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid payload and trim whitespace', async () => {
      const payload = {
        title: '   Khóa học Node.js Nâng Cao   ',
        slug: '  KHOA-HOC-NODEJS-NANG-CAO  ',
        price: 299000,
        level: CourseLevelEnum.ADVANCED,
      };

      const result = (await validationPipe.transform(payload, {
        type: 'body',
        metatype: CreateCourseDto,
      })) as CreateCourseDto;

      expect(result.title).toBe('Khóa học Node.js Nâng Cao');
      expect(result.slug).toBe('khoa-hoc-nodejs-nang-cao');
      expect(result.price).toBe(299000);
      expect(result.level).toBe(CourseLevelEnum.ADVANCED);
    });
  });
});
