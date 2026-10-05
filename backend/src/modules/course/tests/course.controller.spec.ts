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
  ISection,
  IUserProfile,
  UserStatusEnum,
  AuthProviderEnum,
} from 'share-lib';
import { CourseController } from '../course.controller.js';
import { CourseService } from '../services/course.service.js';
import { CreateCourseDto } from '../dto/create-course.dto.js';
import { CreateSectionDto } from '../dto/create-section.dto.js';
import { UpdateSectionDto } from '../dto/update-section.dto.js';
import { ReorderSectionsDto } from '../dto/reorder-sections.dto.js';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator.js';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';

describe('CourseController', () => {
  let controller: CourseController;
  let mockCourseService: {
    createCourse: ReturnType<typeof vi.fn>;
    updateCourse: ReturnType<typeof vi.fn>;
    findByInstructorId: ReturnType<typeof vi.fn>;
    getCourseDetailForInstructor: ReturnType<typeof vi.fn>;
    createSection: ReturnType<typeof vi.fn>;
    updateSection: ReturnType<typeof vi.fn>;
    reorderSections: ReturnType<typeof vi.fn>;
    getSectionsByCourseId: ReturnType<typeof vi.fn>;
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
      updateCourse: vi.fn(),
      findByInstructorId: vi.fn(),
      getCourseDetailForInstructor: vi.fn(),
      createSection: vi.fn(),
      updateSection: vi.fn(),
      reorderSections: vi.fn(),
      getSectionsByCourseId: vi.fn(),
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

  describe('GET /courses/my-courses - getMyCourses', () => {
    it('1. should allow INSTRUCTOR to fetch their own courses successfully', async () => {
      // Arrange
      const instructorId = 'instructor_1';
      const myCourses: ICourse[] = [
        sampleCourse,
        {
          ...sampleCourse,
          id: 'course_456',
          title: 'Khóa học Next.js 15 Toàn Diện',
          slug: 'khoa-hoc-nextjs-15-toan-dien',
        },
      ];
      mockCourseService.findByInstructorId.mockResolvedValue(myCourses);

      // Act
      const response = await controller.getMyCourses(instructorId);

      // Assert
      expect(mockCourseService.findByInstructorId).toHaveBeenCalledWith(instructorId);
      expect(response.success).toBe(true);
      expect(response.message).toBe('Lấy danh sách khóa học thành công');
      expect(response.data).toEqual(myCourses);
      expect(response.data).toHaveLength(2);
    });

    it('2. should allow ADMIN to fetch courses', async () => {
      // Arrange
      const adminId = 'admin_999';
      mockCourseService.findByInstructorId.mockResolvedValue([]);

      // Act
      const response = await controller.getMyCourses(adminId);

      // Assert
      expect(mockCourseService.findByInstructorId).toHaveBeenCalledWith(adminId);
      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
    });

    it('3. should return empty array when instructor has no courses', async () => {
      // Arrange
      const newInstructorId = 'instructor_empty';
      mockCourseService.findByInstructorId.mockResolvedValue([]);

      // Act
      const response = await controller.getMyCourses(newInstructorId);

      // Assert
      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
    });

    it('4. should reject STUDENT access via @Roles configuration and RolesGuard', () => {
      // Arrange: verify controller metadata
      const reflector = new Reflector();
      // oxlint-disable-next-line typescript/unbound-method
      const handler = CourseController.prototype.getMyCourses;
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
  });

  describe('GET /courses/:id - getDetail', () => {
    const instructorProfile: IUserProfile = {
      id: 'instructor_1',
      email: 'instructor@example.com',
      fullName: 'Master Instructor',
      role: RoleEnum.INSTRUCTOR,
      status: UserStatusEnum.ACTIVE,
      provider: AuthProviderEnum.LOCAL,
    };

    const adminProfile: IUserProfile = {
      id: 'admin_1',
      email: 'admin@example.com',
      fullName: 'System Admin',
      role: RoleEnum.ADMIN,
      status: UserStatusEnum.ACTIVE,
      provider: AuthProviderEnum.LOCAL,
    };

    it('1. should allow INSTRUCTOR to fetch their own course detail successfully', async () => {
      // Arrange
      mockCourseService.getCourseDetailForInstructor.mockResolvedValue(sampleCourse);

      // Act
      const response = await controller.getDetail(
        'course_123',
        instructorProfile.id,
        instructorProfile.role,
      );

      // Assert
      expect(mockCourseService.getCourseDetailForInstructor).toHaveBeenCalledWith(
        'course_123',
        instructorProfile.id,
        instructorProfile.role,
      );
      expect(response.success).toBe(true);
      expect(response.message).toBe('Lấy chi tiết khóa học thành công');
      expect(response.data).toEqual(sampleCourse);
    });

    it('2. should allow ADMIN to fetch course detail successfully', async () => {
      // Arrange
      mockCourseService.getCourseDetailForInstructor.mockResolvedValue(sampleCourse);

      // Act
      const response = await controller.getDetail(
        'course_123',
        adminProfile.id,
        adminProfile.role,
      );

      // Assert
      expect(mockCourseService.getCourseDetailForInstructor).toHaveBeenCalledWith(
        'course_123',
        adminProfile.id,
        adminProfile.role,
      );
      expect(response.success).toBe(true);
      expect(response.data).toEqual(sampleCourse);
    });

    it('3. should reject STUDENT access via @Roles configuration and RolesGuard', () => {
      // Arrange: verify controller metadata
      const reflector = new Reflector();
      // oxlint-disable-next-line typescript/unbound-method
      const handler = CourseController.prototype.getDetail;
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

  describe('POST /courses/:courseId/sections - createSection', () => {
    it('1. should delegate to courseService.createSection with courseId, dto, userId, and role', async () => {
      // Arrange
      const courseId = '507f1f77bcf86cd799439011';
      const userId = 'instructor_1';
      const role = RoleEnum.INSTRUCTOR;
      const dto: CreateSectionDto = {
        title: 'Chương 1: Giới thiệu khóa học',
        description: 'Tổng quan nội dung',
        order: 0,
      };

      const expectedSection: ISection = {
        id: 'section_123',
        courseId,
        title: dto.title,
        description: dto.description ?? null,
        order: dto.order ?? 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCourseService.createSection.mockResolvedValue(expectedSection);

      // Act
      const response = await controller.createSection(courseId, userId, role, dto);

      // Assert
      expect(mockCourseService.createSection).toHaveBeenCalledWith(courseId, dto, userId, role);
      expect(response.success).toBe(true);
      expect(response.message).toBe('Tạo chương học thành công');
      expect(response.data).toEqual(expectedSection);
    });

    it('2. should delegate properly when user is ADMIN', async () => {
      // Arrange
      const courseId = '507f1f77bcf86cd799439011';
      const adminId = 'admin_999';
      const role = RoleEnum.ADMIN;
      const dto: CreateSectionDto = {
        title: 'Chương 1: Admin tạo',
        order: 0,
      };

      const expectedSection: ISection = {
        id: 'section_admin',
        courseId,
        title: dto.title,
        order: dto.order ?? 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCourseService.createSection.mockResolvedValue(expectedSection);

      // Act
      const response = await controller.createSection(courseId, adminId, role, dto);

      // Assert
      expect(mockCourseService.createSection).toHaveBeenCalledWith(courseId, dto, adminId, role);
      expect(response.data).toEqual(expectedSection);
    });

    it('3. should enforce INSTRUCTOR and ADMIN roles on createSection route', () => {
      const reflector = new Reflector();
      const roles = reflector.get<string[]>(ROLES_KEY, CourseController.prototype.createSection);

      expect(roles).toBeDefined();
      expect(roles).toContain(RoleEnum.INSTRUCTOR);
      expect(roles).toContain(RoleEnum.ADMIN);
    });
  });

  describe('PUT /courses/:courseId/sections/reorder - reorderSections', () => {
    it('1. should delegate to courseService.reorderSections with courseId, dto, userId, and role', async () => {
      const courseId = '507f1f77bcf86cd799439011';
      const userId = 'instructor_1';
      const role = RoleEnum.INSTRUCTOR;
      const dto: ReorderSectionsDto = {
        sectionIds: ['507f1f77bcf86cd799439022', '507f1f77bcf86cd799439033'],
      };

      const mockReordered: ISection[] = [
        {
          id: '507f1f77bcf86cd799439022',
          courseId,
          title: 'Chương 2',
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '507f1f77bcf86cd799439033',
          courseId,
          title: 'Chương 1',
          order: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockCourseService.reorderSections.mockResolvedValue(mockReordered);

      const response = await controller.reorderSections(courseId, userId, role, dto);

      expect(mockCourseService.reorderSections).toHaveBeenCalledWith(
        courseId,
        dto,
        userId,
        role,
      );
      expect(response.success).toBe(true);
      expect(response.message).toBe('Cập nhật thứ tự chương học thành công');
      expect(response.data).toEqual(mockReordered);
    });

    it('2. should enforce INSTRUCTOR and ADMIN roles on reorderSections route', () => {
      const reflector = new Reflector();
      const roles = reflector.get<string[]>(ROLES_KEY, CourseController.prototype.reorderSections);

      expect(roles).toBeDefined();
      expect(roles).toContain(RoleEnum.INSTRUCTOR);
      expect(roles).toContain(RoleEnum.ADMIN);
    });
  });

  describe('GET /courses/:courseId/sections - getSections', () => {
    it('1. should pass courseId to courseService.getSectionsByCourseId and return ApiResponse', async () => {
      const courseId = '507f1f77bcf86cd799439011';
      const mockSections: ISection[] = [
        {
          id: 'section_1',
          courseId,
          title: 'Java Core',
          description: 'Nền tảng Java',
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockCourseService.getSectionsByCourseId.mockResolvedValue(mockSections);

      const response = await controller.getSections(courseId);

      expect(mockCourseService.getSectionsByCourseId).toHaveBeenCalledWith(courseId);
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockSections);
      expect(response.message).toBe('Lấy danh sách chương học thành công');
    });

    it('2. should return success ApiResponse with empty array [] when course has no sections', async () => {
      const courseId = '507f1f77bcf86cd799439011';
      mockCourseService.getSectionsByCourseId.mockResolvedValue([]);

      const response = await controller.getSections(courseId);

      expect(mockCourseService.getSectionsByCourseId).toHaveBeenCalledWith(courseId);
      expect(response.success).toBe(true);
      expect(response.data).toEqual([]);
      expect(response.message).toBe('Lấy danh sách chương học thành công');
    });

    it('3. should have @Public() metadata set on getSections', () => {
      const reflector = new Reflector();
      const isPublic = reflector.get<boolean>(IS_PUBLIC_KEY, CourseController.prototype.getSections);

      expect(isPublic).toBe(true);
    });
  });

  describe('CreateSectionDto Validation (ValidationPipe)', () => {
    let validationPipe: ValidationPipe;

    beforeEach(() => {
      validationPipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });
    });

    it('should reject missing title', async () => {
      const payload = {
        order: 0,
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: CreateSectionDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject empty or whitespace-only title', async () => {
      const payload = {
        title: '   ',
        order: 0,
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: CreateSectionDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject title exceeding 200 characters', async () => {
      const payload = {
        title: 'a'.repeat(201),
        order: 0,
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: CreateSectionDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept missing order as optional', async () => {
      const payload = {
        title: 'Chương 1',
      };

      const result = (await validationPipe.transform(payload, {
        type: 'body',
        metatype: CreateSectionDto,
      })) as CreateSectionDto;

      expect(result.title).toBe('Chương 1');
      expect(result.order).toBeUndefined();
    });

    it('should reject negative order', async () => {
      const payload = {
        title: 'Chương 1',
        order: -1,
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: CreateSectionDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject non-integer order', async () => {
      const payload = {
        title: 'Chương 1',
        order: 1.5,
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: CreateSectionDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject unwhitelisted properties', async () => {
      const payload = {
        title: 'Chương 1',
        order: 0,
        extraProperty: 'hacker_field',
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: CreateSectionDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid payload, trim whitespace on title and description', async () => {
      const payload = {
        title: '   Chương 1: Giới thiệu   ',
        description: '   Mô tả nội dung chi tiết   ',
        order: 0,
      };

      const result = (await validationPipe.transform(payload, {
        type: 'body',
        metatype: CreateSectionDto,
      })) as CreateSectionDto;

      expect(result.title).toBe('Chương 1: Giới thiệu');
      expect(result.description).toBe('Mô tả nội dung chi tiết');
      expect(result.order).toBe(0);
    });
  });

  describe('ReorderSectionsDto validation', () => {
    let validationPipe: ValidationPipe;

    beforeEach(() => {
      validationPipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });
    });

    it('should accept valid array of Mongo ObjectId strings', async () => {
      const payload = {
        sectionIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439022'],
      };

      const result = (await validationPipe.transform(payload, {
        type: 'body',
        metatype: ReorderSectionsDto,
      })) as ReorderSectionsDto;

      expect(result.sectionIds).toEqual([
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439022',
      ]);
    });

    it('should reject non-array sectionIds', async () => {
      const payload = {
        sectionIds: 'not-an-array',
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: ReorderSectionsDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject empty array of sectionIds', async () => {
      const payload = {
        sectionIds: [],
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: ReorderSectionsDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid Mongo ObjectId in sectionIds array', async () => {
      const payload = {
        sectionIds: ['invalid-id-string'],
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: ReorderSectionsDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject unwhitelisted properties', async () => {
      const payload = {
        sectionIds: ['507f1f77bcf86cd799439011'],
        maliciousKey: 'maliciousValue',
      };

      await expect(
        validationPipe.transform(payload, {
          type: 'body',
          metatype: ReorderSectionsDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('PATCH /courses/:id - update', () => {
    it('1. should allow INSTRUCTOR to update their course successfully', async () => {
      const courseId = 'course_123';
      const userId = 'instructor_1';
      const dto = { title: 'Tên mới' };
      const updatedCourse: ICourse = {
        ...sampleCourse,
        title: 'Tên mới',
        slug: 'ten-moi',
      };
      mockCourseService.updateCourse.mockResolvedValue(updatedCourse);

      const response = await controller.update(courseId, userId, RoleEnum.INSTRUCTOR, dto);

      expect(mockCourseService.updateCourse).toHaveBeenCalledWith(
        courseId,
        dto,
        userId,
        RoleEnum.INSTRUCTOR,
      );
      expect(response.success).toBe(true);
      expect(response.message).toBe('Cập nhật khóa học thành công');
      expect(response.data.title).toBe('Tên mới');
    });

    it('2. should allow ADMIN to update any course', async () => {
      const courseId = 'course_123';
      const adminId = 'admin_1';
      const dto = { price: 299000 };
      const updatedCourse: ICourse = {
        ...sampleCourse,
        price: 299000,
      };
      mockCourseService.updateCourse.mockResolvedValue(updatedCourse);

      const response = await controller.update(courseId, adminId, RoleEnum.ADMIN, dto);

      expect(mockCourseService.updateCourse).toHaveBeenCalledWith(
        courseId,
        dto,
        adminId,
        RoleEnum.ADMIN,
      );
      expect(response.success).toBe(true);
      expect(response.data.price).toBe(299000);
    });
  });

  describe('PATCH /courses/:courseId/sections/:sectionId - updateSection', () => {
    const courseId = '507f1f77bcf86cd799439011';
    const sectionId = '507f1f77bcf86cd799439022';
    const userId = 'instructor_1';
    const sampleSection: ISection = {
      id: sectionId,
      courseId,
      title: 'Chương 1: Mở đầu',
      description: 'Mô tả chương',
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    let validationPipe: ValidationPipe;

    beforeEach(() => {
      validationPipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });
    });

    it('1. should delegate to courseService.updateSection and return ApiResponse.success', async () => {
      // Arrange
      const dto: UpdateSectionDto = {
        title: 'Chương 1: Kiến trúc căn bản',
        description: 'Mô tả chi tiết mới',
      };
      mockCourseService.updateSection.mockResolvedValue({
        ...sampleSection,
        title: dto.title,
        description: dto.description,
      });

      // Act
      const response = await controller.updateSection(
        courseId,
        sectionId,
        userId,
        RoleEnum.INSTRUCTOR,
        dto,
      );

      // Assert
      expect(mockCourseService.updateSection).toHaveBeenCalledWith(
        courseId,
        sectionId,
        dto,
        userId,
        RoleEnum.INSTRUCTOR,
      );
      expect(response.success).toBe(true);
      expect(response.message).toBe('Cập nhật chương học thành công');
      expect(response.data.title).toBe('Chương 1: Kiến trúc căn bản');
      expect(response.data.description).toBe('Mô tả chi tiết mới');
    });

    it('2. should trim whitespace from title in DTO validation', async () => {
      // Arrange
      const rawPayload = {
        title: '   Chương có nhiều khoảng trắng   ',
      };

      // Act
      const transformed = (await validationPipe.transform(rawPayload, {
        type: 'body',
        metatype: UpdateSectionDto,
      })) as UpdateSectionDto;

      // Assert
      expect(transformed.title).toBe('Chương có nhiều khoảng trắng');
    });

    it('3. should reject empty title string in DTO validation', async () => {
      // Arrange
      const rawPayload = {
        title: '   ',
      };

      // Act & Assert
      await expect(
        validationPipe.transform(rawPayload, {
          type: 'body',
          metatype: UpdateSectionDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('4. should reject unwhitelisted properties', async () => {
      // Arrange
      const rawPayload = {
        title: 'Chương hợp lệ',
        unauthorizedField: 'someValue',
      };

      // Act & Assert
      await expect(
        validationPipe.transform(rawPayload, {
          type: 'body',
          metatype: UpdateSectionDto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('5. should have @Roles(INSTRUCTOR, ADMIN) decorator configured', () => {
      const reflector = new Reflector();
      const roles = reflector.get<RoleEnum[]>(
        ROLES_KEY,
        CourseController.prototype.updateSection,
      );

      expect(roles).toBeDefined();
      expect(roles).toContain(RoleEnum.INSTRUCTOR);
      expect(roles).toContain(RoleEnum.ADMIN);
    });
  });
});
