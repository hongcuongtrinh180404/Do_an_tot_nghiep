import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import {
  CourseStatusEnum,
  CourseLevelEnum,
  RoleEnum,
  UserStatusEnum,
  IUser,
  ICourse,
  AuthProviderEnum,
} from 'share-lib';
import { CourseService } from '../services/course.service.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';

describe('CourseService', () => {
  let service: CourseService;
  let mockCourseRepository: {
    findBySlug: ReturnType<typeof vi.fn>;
    findByInstructorId: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockUserRepository: {
    findById: ReturnType<typeof vi.fn>;
  };
  let mockCls: { get: ReturnType<typeof vi.fn> };

  const activeInstructor: IUser = {
    id: 'instructor_1',
    email: 'instructor@example.com',
    passwordHash: 'hash',
    fullName: 'Master Instructor',
    role: RoleEnum.INSTRUCTOR,
    status: UserStatusEnum.ACTIVE,
    provider: AuthProviderEnum.LOCAL,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  const activeAdmin: IUser = {
    id: 'admin_1',
    email: 'admin@example.com',
    passwordHash: 'hash',
    fullName: 'System Admin',
    role: RoleEnum.ADMIN,
    status: UserStatusEnum.ACTIVE,
    provider: AuthProviderEnum.LOCAL,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    mockCourseRepository = {
      findBySlug: vi.fn(),
      findByInstructorId: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
    };

    mockUserRepository = {
      findById: vi.fn(),
    };

    mockCls = {
      get: vi.fn().mockReturnValue('instructor_1'),
    };

    service = new CourseService(
      mockCourseRepository as unknown as CourseRepository,
      mockUserRepository as unknown as UserRepository,
      mockCls as unknown as ClsService,
    );
  });

  describe('validateInstructor', () => {
    it('should pass validation when user is an active INSTRUCTOR', async () => {
      mockUserRepository.findById.mockResolvedValue(activeInstructor);

      const result = await service.validateInstructor('instructor_1');
      expect(result).toEqual(activeInstructor);
    });

    it('should pass validation when user is an active ADMIN', async () => {
      mockUserRepository.findById.mockResolvedValue(activeAdmin);

      const result = await service.validateInstructor('admin_1');
      expect(result).toEqual(activeAdmin);
    });

    it('should throw NotFoundException if instructor does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.validateInstructor('non_existent_id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if instructor is soft-deleted', async () => {
      mockUserRepository.findById.mockResolvedValue({
        ...activeInstructor,
        deletedAt: new Date(),
      });

      await expect(service.validateInstructor('instructor_1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if instructor status is INACTIVE', async () => {
      mockUserRepository.findById.mockResolvedValue({
        ...activeInstructor,
        status: UserStatusEnum.INACTIVE,
      });

      await expect(service.validateInstructor('instructor_1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if instructor status is BANNED/SUSPENDED', async () => {
      mockUserRepository.findById.mockResolvedValue({
        ...activeInstructor,
        status: UserStatusEnum.SUSPENDED,
      });

      await expect(service.validateInstructor('instructor_1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException if user has role STUDENT', async () => {
      mockUserRepository.findById.mockResolvedValue({
        ...activeInstructor,
        role: RoleEnum.STUDENT,
      });

      await expect(service.validateInstructor('instructor_1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('ensureSlugNotTaken', () => {
    it('should throw ConflictException if slug already exists', async () => {
      mockCourseRepository.findBySlug.mockResolvedValue({
        id: 'course_1',
        slug: 'existing-course',
      } as ICourse);

      await expect(service.ensureSlugNotTaken('existing-course')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should resolve without error if slug is available', async () => {
      mockCourseRepository.findBySlug.mockResolvedValue(null);

      await expect(service.ensureSlugNotTaken('new-slug')).resolves.toBeUndefined();
    });
  });

  describe('createCourse', () => {
    it('should reject when price is negative', async () => {
      mockUserRepository.findById.mockResolvedValue(activeInstructor);
      mockCourseRepository.findBySlug.mockResolvedValue(null);

      await expect(
        service.createCourse({
          title: 'Invalid Course',
          slug: 'invalid-course',
          instructorId: 'instructor_1',
          price: -100,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create course with default values (status: draft, level: all_levels, price: 0)', async () => {
      mockUserRepository.findById.mockResolvedValue(activeInstructor);
      mockCourseRepository.findBySlug.mockResolvedValue(null);

      const createdExpected: ICourse = {
        id: 'course_created_1',
        title: 'Lập trình Go',
        slug: 'lap-trinh-go',
        instructorId: 'instructor_1',
        status: CourseStatusEnum.DRAFT,
        level: CourseLevelEnum.ALL_LEVELS,
        price: 0,
        description: null,
        shortDescription: null,
        thumbnailUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCourseRepository.create.mockResolvedValue(createdExpected);

      const result = await service.createCourse({
        title: '  Lập trình Go  ',
        slug: '  LAP-TRINH-GO  ',
        instructorId: 'instructor_1',
      });

      expect(mockCourseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Lập trình Go',
          slug: 'lap-trinh-go',
          instructorId: 'instructor_1',
          status: CourseStatusEnum.DRAFT,
          level: CourseLevelEnum.ALL_LEVELS,
          price: 0,
          createdById: 'instructor_1',
          updatedById: 'instructor_1',
        }),
        undefined,
      );
      expect(result).toEqual(createdExpected);
    });

    it('should create course with custom values when provided', async () => {
      mockUserRepository.findById.mockResolvedValue(activeInstructor);
      mockCourseRepository.findBySlug.mockResolvedValue(null);

      mockCourseRepository.create.mockImplementation((payload) => Promise.resolve(payload));

      await service.createCourse({
        title: 'Master React & Next.js',
        slug: 'master-react-nextjs',
        instructorId: 'instructor_1',
        price: 599000,
        status: CourseStatusEnum.PUBLISHED,
        level: CourseLevelEnum.ADVANCED,
      });

      expect(mockCourseRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          price: 599000,
          status: CourseStatusEnum.PUBLISHED,
          level: CourseLevelEnum.ADVANCED,
        }),
        undefined,
      );
    });
  });

  describe('Query Delegations', () => {
    it('findBySlug should delegate to repository', async () => {
      const mockCourse = { id: 'c1', slug: 'my-course' } as ICourse;
      mockCourseRepository.findBySlug.mockResolvedValue(mockCourse);

      const result = await service.findBySlug('my-course');
      expect(mockCourseRepository.findBySlug).toHaveBeenCalledWith('my-course', undefined);
      expect(result).toEqual(mockCourse);
    });

    it('findByInstructorId should delegate to repository', async () => {
      const mockCourses = [{ id: 'c1' }, { id: 'c2' }] as ICourse[];
      mockCourseRepository.findByInstructorId.mockResolvedValue(mockCourses);

      const result = await service.findByInstructorId('instructor_1');
      expect(mockCourseRepository.findByInstructorId).toHaveBeenCalledWith('instructor_1', undefined);
      expect(result).toEqual(mockCourses);
    });
  });
});
