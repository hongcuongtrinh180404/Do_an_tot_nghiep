import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import {
  CourseStatusEnum,
  CourseLevelEnum,
  RoleEnum,
  UserStatusEnum,
  IUser,
  ICourse,
  ISection,
  AuthProviderEnum,
} from 'share-lib';
import { CourseService } from '../services/course.service.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { CreateSectionDto } from '../dto/create-section.dto.js';
import { ReorderSectionsDto } from '../dto/reorder-sections.dto.js';
import { StorageService } from '../../storage/index.js';

describe('CourseService', () => {
  let service: CourseService;
  let mockCourseRepository: {
    findBySlug: ReturnType<typeof vi.fn>;
    findByInstructorId: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findConflictingSlugs: ReturnType<typeof vi.fn>;
  };
  let mockSectionRepository: {
    create: ReturnType<typeof vi.fn>;
    findByCourseId: ReturnType<typeof vi.fn>;
    reorderSections: ReturnType<typeof vi.fn>;
  };
  let mockUserRepository: {
    findById: ReturnType<typeof vi.fn>;
  };
  let mockStorageService: {
    uploadImage: ReturnType<typeof vi.fn>;
    uploadLessonMedia: ReturnType<typeof vi.fn>;
    deleteFile: ReturnType<typeof vi.fn>;
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
      findConflictingSlugs: vi.fn(),
    };

    mockSectionRepository = {
      create: vi.fn(),
      findByCourseId: vi.fn(),
      reorderSections: vi.fn(),
    };

    mockUserRepository = {
      findById: vi.fn(),
    };

    mockCls = {
      get: vi.fn().mockReturnValue('instructor_1'),
    };

    mockStorageService = {
      uploadImage: vi.fn(),
      uploadLessonMedia: vi.fn(),
      deleteFile: vi.fn().mockResolvedValue(true),
    };

    service = new CourseService(
      mockCourseRepository as unknown as CourseRepository,
      mockSectionRepository as unknown as SectionRepository,
      mockUserRepository as unknown as UserRepository,
      mockStorageService as unknown as StorageService,
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

  describe('getCourseDetailForInstructor', () => {
    const courseOwner: ICourse = {
      id: 'course_100',
      title: 'Khóa học Node.js Chuyên Sâu',
      slug: 'khoa-hoc-nodejs-chuyen-sau',
      instructorId: 'instructor_1',
      price: 399000,
      status: CourseStatusEnum.DRAFT,
      level: CourseLevelEnum.INTERMEDIATE,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    it('should return course when user is the owner instructor', async () => {
      mockCourseRepository.findById.mockResolvedValue(courseOwner);

      const result = await service.getCourseDetailForInstructor(
        'course_100',
        'instructor_1',
        RoleEnum.INSTRUCTOR,
      );

      expect(mockCourseRepository.findById).toHaveBeenCalledWith('course_100', undefined);
      expect(result).toEqual(courseOwner);
    });

    it('should return course when user is ADMIN even if not owner', async () => {
      mockCourseRepository.findById.mockResolvedValue(courseOwner);

      const result = await service.getCourseDetailForInstructor(
        'course_100',
        'admin_999',
        RoleEnum.ADMIN,
      );

      expect(result).toEqual(courseOwner);
    });

    it('should throw NotFoundException when course does not exist', async () => {
      mockCourseRepository.findById.mockResolvedValue(null);

      await expect(
        service.getCourseDetailForInstructor(
          'non_existent_id',
          'instructor_1',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when course is soft-deleted', async () => {
      mockCourseRepository.findById.mockResolvedValue({
        ...courseOwner,
        deletedAt: new Date(),
      });

      await expect(
        service.getCourseDetailForInstructor(
          'course_100',
          'instructor_1',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is another instructor (IDOR prevention)', async () => {
      mockCourseRepository.findById.mockResolvedValue(courseOwner);

      await expect(
        service.getCourseDetailForInstructor(
          'course_100',
          'stranger_instructor_2',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createSection', () => {
    const courseOwner: ICourse = {
      id: 'course_100',
      title: 'Khóa học TypeScript Chuyên Sâu',
      slug: 'khoa-hoc-typescript-chuyen-sau',
      instructorId: 'instructor_1',
      price: 299000,
      status: CourseStatusEnum.DRAFT,
      level: CourseLevelEnum.ALL_LEVELS,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    const sectionDto: CreateSectionDto = {
      title: 'Chương 1: Mở đầu',
      description: 'Giới thiệu tổng quan',
      order: 0,
    };

    const sampleCreatedSection: ISection = {
      id: 'section_real_123',
      courseId: 'course_100',
      title: 'Chương 1: Mở đầu',
      description: 'Giới thiệu tổng quan',
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      createdById: 'instructor_1',
      updatedById: 'instructor_1',
    };

    it('1. should throw NotFoundException when course does not exist', async () => {
      mockCourseRepository.findById.mockResolvedValue(null);

      await expect(
        service.createSection(
          'non_existent_id',
          sectionDto,
          'instructor_1',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('2. should throw NotFoundException when course is soft-deleted', async () => {
      mockCourseRepository.findById.mockResolvedValue({
        ...courseOwner,
        deletedAt: new Date(),
      });

      await expect(
        service.createSection(
          'course_100',
          sectionDto,
          'instructor_1',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('3. should throw NotFoundException when repository throws error (e.g. CastError)', async () => {
      mockCourseRepository.findById.mockRejectedValue(new Error('Cast to ObjectId failed'));

      await expect(
        service.createSection(
          'malformed_id',
          sectionDto,
          'instructor_1',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('4. should allow INSTRUCTOR who is owner to create section and call sectionRepository.create with correct payload', async () => {
      mockCourseRepository.findById.mockResolvedValue(courseOwner);
      mockSectionRepository.create.mockResolvedValue(sampleCreatedSection);

      const result = await service.createSection(
        'course_100',
        sectionDto,
        'instructor_1',
        RoleEnum.INSTRUCTOR,
      );

      expect(mockCourseRepository.findById).toHaveBeenCalledWith('course_100', undefined);
      expect(mockSectionRepository.create).toHaveBeenCalledWith(
        {
          courseId: 'course_100',
          title: sectionDto.title,
          description: sectionDto.description,
          order: sectionDto.order,
          createdById: 'instructor_1',
          updatedById: 'instructor_1',
        },
        undefined,
      );
      expect(result).toEqual(sampleCreatedSection);
    });

    it('5. should allow ADMIN to create section even if not owner with admin userId', async () => {
      const adminSection: ISection = {
        ...sampleCreatedSection,
        createdById: 'admin_999',
        updatedById: 'admin_999',
      };
      mockCourseRepository.findById.mockResolvedValue(courseOwner);
      mockSectionRepository.create.mockResolvedValue(adminSection);

      const result = await service.createSection(
        'course_100',
        sectionDto,
        'admin_999',
        RoleEnum.ADMIN,
      );

      expect(mockSectionRepository.create).toHaveBeenCalledWith(
        {
          courseId: 'course_100',
          title: sectionDto.title,
          description: sectionDto.description,
          order: sectionDto.order,
          createdById: 'admin_999',
          updatedById: 'admin_999',
        },
        undefined,
      );
      expect(result.createdById).toBe('admin_999');
      expect(result.updatedById).toBe('admin_999');
    });

    it('6. should throw ForbiddenException when INSTRUCTOR is not the course owner', async () => {
      mockCourseRepository.findById.mockResolvedValue(courseOwner);

      await expect(
        service.createSection(
          'course_100',
          sectionDto,
          'stranger_instructor_2',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockSectionRepository.create).not.toHaveBeenCalled();
    });

    it('7. should use course.id for courseId payload rather than arbitrary raw input', async () => {
      const courseWithCanonicalId: ICourse = {
        ...courseOwner,
        id: 'canonical_course_id_xyz',
      };
      mockCourseRepository.findById.mockResolvedValue(courseWithCanonicalId);
      mockSectionRepository.create.mockResolvedValue({
        ...sampleCreatedSection,
        courseId: 'canonical_course_id_xyz',
      });

      await service.createSection(
        'raw_input_param',
        sectionDto,
        'instructor_1',
        RoleEnum.INSTRUCTOR,
      );

      expect(mockSectionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ courseId: 'canonical_course_id_xyz' }),
        undefined,
      );
    });

    it('8. should pass description as null when dto.description is undefined or omitted', async () => {
      mockCourseRepository.findById.mockResolvedValue(courseOwner);
      mockSectionRepository.create.mockResolvedValue({
        ...sampleCreatedSection,
        description: null,
      });

      const dtoWithoutDesc: CreateSectionDto = {
        title: 'Chương không mô tả',
        order: 1,
      };

      await service.createSection(
        'course_100',
        dtoWithoutDesc,
        'instructor_1',
        RoleEnum.INSTRUCTOR,
      );

      expect(mockSectionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
          title: 'Chương không mô tả',
          order: 1,
        }),
        undefined,
      );
    });

    it('9. should pass dto.order correctly to sectionRepository.create', async () => {
      mockCourseRepository.findById.mockResolvedValue(courseOwner);
      mockSectionRepository.create.mockResolvedValue({
        ...sampleCreatedSection,
        order: 42,
      });

      const dtoWithOrder: CreateSectionDto = {
        title: 'Chương thứ tự 42',
        order: 42,
      };

      await service.createSection(
        'course_100',
        dtoWithOrder,
        'instructor_1',
        RoleEnum.INSTRUCTOR,
      );

      expect(mockSectionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ order: 42 }),
        undefined,
      );
    });

    it('10. should pass session down to courseRepository.findById and sectionRepository.create', async () => {
      const mockSession = { id: 'mock_mongo_session' } as unknown as ClientSession;
      mockCourseRepository.findById.mockResolvedValue(courseOwner);
      mockSectionRepository.create.mockResolvedValue(sampleCreatedSection);

      await service.createSection(
        'course_100',
        sectionDto,
        'instructor_1',
        RoleEnum.INSTRUCTOR,
        mockSession,
      );

      expect(mockCourseRepository.findById).toHaveBeenCalledWith('course_100', mockSession);
      expect(mockSectionRepository.create).toHaveBeenCalledWith(
        expect.any(Object),
        mockSession,
      );
    });

    it('11. should auto-calculate order as existingSections.length when dto.order is undefined', async () => {
      mockCourseRepository.findById.mockResolvedValue(courseOwner);
      mockSectionRepository.findByCourseId.mockResolvedValue([
        { id: 'sec_1', order: 0 },
        { id: 'sec_2', order: 1 },
      ]);
      mockSectionRepository.create.mockResolvedValue({
        ...sampleCreatedSection,
        order: 2,
      });

      const dtoWithoutOrder: CreateSectionDto = {
        title: 'Chương tự động thứ tự',
      };

      await service.createSection(
        'course_100',
        dtoWithoutOrder,
        'instructor_1',
        RoleEnum.INSTRUCTOR,
      );

      expect(mockSectionRepository.findByCourseId).toHaveBeenCalledWith('course_100', undefined);
      expect(mockSectionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ order: 2 }),
        undefined,
      );
    });
  });

  describe('getSectionsByCourseId', () => {
    const existingCourse: ICourse = {
      id: 'course_existing_123',
      title: 'Khóa học Java Core',
      slug: 'khoa-hoc-java-core',
      instructorId: 'instructor_1',
      price: 100000,
      status: CourseStatusEnum.PUBLISHED,
      level: CourseLevelEnum.ALL_LEVELS,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    const sampleSections: ISection[] = [
      {
        id: 'section_1',
        courseId: 'course_existing_123',
        title: 'Chương 1',
        description: 'Mô tả 1',
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        id: 'section_2',
        courseId: 'course_existing_123',
        title: 'Chương 2',
        description: 'Mô tả 2',
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    ];

    it('1. should return sections when course exists', async () => {
      mockCourseRepository.findById.mockResolvedValue(existingCourse);
      mockSectionRepository.findByCourseId.mockResolvedValue(sampleSections);

      const result = await service.getSectionsByCourseId('course_existing_123');

      expect(mockCourseRepository.findById).toHaveBeenCalledWith('course_existing_123', undefined);
      expect(mockSectionRepository.findByCourseId).toHaveBeenCalledWith('course_existing_123', undefined);
      expect(result).toEqual(sampleSections);
      expect(result).toHaveLength(2);
    });

    it('2. should throw NotFoundException when course does not exist, is soft deleted, or findById throws', async () => {
      // 2a. Course not found (null)
      mockCourseRepository.findById.mockResolvedValue(null);
      await expect(service.getSectionsByCourseId('course_nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getSectionsByCourseId('course_nonexistent')).rejects.toThrow(
        "Không tìm thấy khóa học với ID 'course_nonexistent'",
      );

      // 2b. Course is soft-deleted
      mockCourseRepository.findById.mockResolvedValue({
        ...existingCourse,
        deletedAt: new Date(),
      });
      await expect(service.getSectionsByCourseId('course_existing_123')).rejects.toThrow(
        NotFoundException,
      );

      // 2c. findById throws CastError / general error
      mockCourseRepository.findById.mockRejectedValue(new Error('Cast to ObjectId failed'));
      await expect(service.getSectionsByCourseId('invalid_id')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockSectionRepository.findByCourseId).not.toHaveBeenCalled();
    });

    it('3. should return empty array [] when repository returns [] without throwing error', async () => {
      mockCourseRepository.findById.mockResolvedValue(existingCourse);
      mockSectionRepository.findByCourseId.mockResolvedValue([]);

      const result = await service.getSectionsByCourseId('course_existing_123');

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('4. should pass session down to courseRepository.findById and sectionRepository.findByCourseId', async () => {
      const mockSession = { id: 'mock_session_123' } as unknown as ClientSession;
      mockCourseRepository.findById.mockResolvedValue(existingCourse);
      mockSectionRepository.findByCourseId.mockResolvedValue(sampleSections);

      const result = await service.getSectionsByCourseId('course_existing_123', mockSession);

      expect(mockCourseRepository.findById).toHaveBeenCalledWith('course_existing_123', mockSession);
      expect(mockSectionRepository.findByCourseId).toHaveBeenCalledWith('course_existing_123', mockSession);
      expect(result).toEqual(sampleSections);
    });
  });

  describe('reorderSections', () => {
    const targetCourse: ICourse = {
      id: 'course_123',
      title: 'Khóa học TypeScript',
      slug: 'khoa-hoc-typescript',
      instructorId: 'instructor_1',
      price: 150000,
      status: CourseStatusEnum.PUBLISHED,
      level: CourseLevelEnum.BEGINNER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingSections: ISection[] = [
      {
        id: 'sec_1',
        courseId: 'course_123',
        title: 'Chương 1',
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'sec_2',
        courseId: 'course_123',
        title: 'Chương 2',
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('1. should successfully reorder sections when user is course owner (INSTRUCTOR)', async () => {
      mockCourseRepository.findById.mockResolvedValue(targetCourse);
      mockSectionRepository.findByCourseId.mockResolvedValue(existingSections);
      mockSectionRepository.reorderSections.mockResolvedValue([
        { ...existingSections[1], order: 0 },
        { ...existingSections[0], order: 1 },
      ]);

      const dto: ReorderSectionsDto = { sectionIds: ['sec_2', 'sec_1'] };

      const result = await service.reorderSections(
        'course_123',
        dto,
        'instructor_1',
        RoleEnum.INSTRUCTOR,
      );

      expect(mockSectionRepository.reorderSections).toHaveBeenCalledWith(
        'course_123',
        ['sec_2', 'sec_1'],
        'instructor_1',
        undefined,
      );
      expect(result[0].id).toBe('sec_2');
      expect(result[0].order).toBe(0);
      expect(result[1].id).toBe('sec_1');
      expect(result[1].order).toBe(1);
    });

    it('2. should successfully reorder sections when user is ADMIN even if not course owner', async () => {
      mockCourseRepository.findById.mockResolvedValue(targetCourse);
      mockSectionRepository.findByCourseId.mockResolvedValue(existingSections);
      mockSectionRepository.reorderSections.mockResolvedValue([
        { ...existingSections[1], order: 0 },
        { ...existingSections[0], order: 1 },
      ]);

      const dto: ReorderSectionsDto = { sectionIds: ['sec_2', 'sec_1'] };

      const result = await service.reorderSections(
        'course_123',
        dto,
        'admin_1',
        RoleEnum.ADMIN,
      );

      expect(mockSectionRepository.reorderSections).toHaveBeenCalledWith(
        'course_123',
        ['sec_2', 'sec_1'],
        'admin_1',
        undefined,
      );
      expect(result).toHaveLength(2);
    });

    it('3. should throw NotFoundException when course does not exist or findById throws', async () => {
      mockCourseRepository.findById.mockResolvedValue(null);

      await expect(
        service.reorderSections(
          'non_existent_course',
          { sectionIds: ['sec_1'] },
          'instructor_1',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('4. should throw NotFoundException when course is soft-deleted', async () => {
      mockCourseRepository.findById.mockResolvedValue({
        ...targetCourse,
        deletedAt: new Date(),
      });

      await expect(
        service.reorderSections(
          'course_123',
          { sectionIds: ['sec_1'] },
          'instructor_1',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('5. should throw ForbiddenException when user is neither course owner nor ADMIN', async () => {
      mockCourseRepository.findById.mockResolvedValue(targetCourse);

      await expect(
        service.reorderSections(
          'course_123',
          { sectionIds: ['sec_2', 'sec_1'] },
          'stranger_instructor_99',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('6. should throw BadRequestException when sectionIds contains duplicate IDs', async () => {
      mockCourseRepository.findById.mockResolvedValue(targetCourse);

      await expect(
        service.reorderSections(
          'course_123',
          { sectionIds: ['sec_1', 'sec_1'] },
          'instructor_1',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('7. should throw BadRequestException when sectionIds contains IDs not in existing sections', async () => {
      mockCourseRepository.findById.mockResolvedValue(targetCourse);
      mockSectionRepository.findByCourseId.mockResolvedValue(existingSections);

      await expect(
        service.reorderSections(
          'course_123',
          { sectionIds: ['sec_1', 'foreign_id'] },
          'instructor_1',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('8. should pass session down to sectionRepository.reorderSections when provided', async () => {
      const mockSession = { id: 'mock_session_1' } as unknown as ClientSession;
      mockCourseRepository.findById.mockResolvedValue(targetCourse);
      mockSectionRepository.findByCourseId.mockResolvedValue(existingSections);
      mockSectionRepository.reorderSections.mockResolvedValue(existingSections);

      const dto: ReorderSectionsDto = { sectionIds: ['sec_1', 'sec_2'] };

      await service.reorderSections(
        'course_123',
        dto,
        'instructor_1',
        RoleEnum.INSTRUCTOR,
        mockSession,
      );

      expect(mockSectionRepository.reorderSections).toHaveBeenCalledWith(
        'course_123',
        ['sec_1', 'sec_2'],
        'instructor_1',
        mockSession,
      );
    });
  });

  describe('generateUniqueSlug', () => {
    it('should return normalized base slug when there are no conflicting slugs', async () => {
      mockCourseRepository.findConflictingSlugs.mockResolvedValue([]);

      const result = await service.generateUniqueSlug('Lập trình Next.js', 'course_123');

      expect(result).toBe('lap-trinh-nextjs');
      expect(mockCourseRepository.findConflictingSlugs).toHaveBeenCalledWith(
        'lap-trinh-nextjs',
        'course_123',
        undefined,
      );
    });

    it('should append -1 when base slug is already taken', async () => {
      mockCourseRepository.findConflictingSlugs.mockResolvedValue(['lap-trinh-next-js']);

      const result = await service.generateUniqueSlug('lap-trinh-next-js', 'course_123');

      expect(result).toBe('lap-trinh-next-js-1');
    });

    it('should append highest suffix + 1 when multiple numbered slugs exist', async () => {
      mockCourseRepository.findConflictingSlugs.mockResolvedValue([
        'lap-trinh-next-js',
        'lap-trinh-next-js-1',
        'lap-trinh-next-js-2',
      ]);

      const result = await service.generateUniqueSlug('lap-trinh-next-js', 'course_123');

      expect(result).toBe('lap-trinh-next-js-3');
    });
  });

  describe('updateCourse', () => {
    const existingCourse: ICourse = {
      id: 'course_123',
      title: 'Khóa học Cũ',
      slug: 'khoa-hoc-cu',
      instructorId: 'instructor_1',
      price: 200000,
      originalPrice: 300000,
      status: CourseStatusEnum.DRAFT,
      level: CourseLevelEnum.BEGINNER,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should successfully update course title and auto-generate unique slug', async () => {
      mockCourseRepository.findById.mockResolvedValue(existingCourse);
      mockCourseRepository.findConflictingSlugs.mockResolvedValue([]);
      mockCourseRepository.update.mockResolvedValue({
        ...existingCourse,
        title: 'Khóa học Mới',
        slug: 'khoa-hoc-moi',
      });

      const result = await service.updateCourse(
        'course_123',
        { title: 'Khóa học Mới' },
        'instructor_1',
        RoleEnum.INSTRUCTOR,
      );

      expect(result.title).toBe('Khóa học Mới');
      expect(result.slug).toBe('khoa-hoc-moi');
      expect(mockCourseRepository.update).toHaveBeenCalledWith(
        'course_123',
        expect.objectContaining({
          title: 'Khóa học Mới',
          slug: 'khoa-hoc-moi',
        }),
        undefined,
      );
    });

    it('should auto-append suffix if new title slug collides with an existing course', async () => {
      mockCourseRepository.findById.mockResolvedValue(existingCourse);
      mockCourseRepository.findConflictingSlugs.mockResolvedValue(['khoa-hoc-moi']);
      mockCourseRepository.update.mockResolvedValue({
        ...existingCourse,
        title: 'Khóa học Mới',
        slug: 'khoa-hoc-moi-1',
      });

      const result = await service.updateCourse(
        'course_123',
        { title: 'Khóa học Mới' },
        'instructor_1',
        RoleEnum.INSTRUCTOR,
      );

      expect(result.slug).toBe('khoa-hoc-moi-1');
    });

    it('should throw ForbiddenException if user is not instructor and not admin', async () => {
      mockCourseRepository.findById.mockResolvedValue(existingCourse);

      await expect(
        service.updateCourse(
          'course_123',
          { title: 'Tiêu đề' },
          'other_user',
          RoleEnum.STUDENT,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if price is negative', async () => {
      mockCourseRepository.findById.mockResolvedValue(existingCourse);

      await expect(
        service.updateCourse(
          'course_123',
          { price: -1000 },
          'instructor_1',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if originalPrice is negative', async () => {
      mockCourseRepository.findById.mockResolvedValue(existingCourse);

      await expect(
        service.updateCourse(
          'course_123',
          { originalPrice: -500 },
          'instructor_1',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if price > originalPrice', async () => {
      mockCourseRepository.findById.mockResolvedValue(existingCourse);

      await expect(
        service.updateCourse(
          'course_123',
          { price: 500000, originalPrice: 300000 },
          'instructor_1',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update price and originalPrice successfully', async () => {
      mockCourseRepository.findById.mockResolvedValue(existingCourse);
      mockCourseRepository.update.mockResolvedValue({
        ...existingCourse,
        price: 250000,
        originalPrice: 400000,
      });

      const result = await service.updateCourse(
        'course_123',
        { price: 250000, originalPrice: 400000 },
        'instructor_1',
        RoleEnum.INSTRUCTOR,
      );

      expect(result.price).toBe(250000);
      expect(result.originalPrice).toBe(400000);
    });
  });
});
