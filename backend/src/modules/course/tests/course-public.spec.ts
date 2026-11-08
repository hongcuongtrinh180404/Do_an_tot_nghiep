import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import {
  CourseStatusEnum,
  CourseLevelEnum,
  RoleEnum,
  ICourse,
  ISection,
  ILesson,
  IEnrollment,
} from 'share-lib';
import { CourseService } from '../services/course.service.js';
import { CourseRepository } from '../repositories/course.repository.js';
import { CourseCategoryRepository } from '../repositories/course-category.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { StorageService } from '../../storage/index.js';
import { LessonService } from '../services/lesson.service.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';

describe('Public Courses and Access Control', () => {
  let courseService: CourseService;
  let lessonService: LessonService;

  let mockCourseRepository: {
    findPublicCoursesWithPagination: ReturnType<typeof vi.fn>;
    findPublicCourseDetail: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
  };
  let mockCategoryRepository: {
    findBySlug: ReturnType<typeof vi.fn>;
  };
  let mockSectionRepository: {
    findByCourseId: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
  };
  let mockLessonRepository: {
    findById: ReturnType<typeof vi.fn>;
    findBySectionId: ReturnType<typeof vi.fn>;
  };
  let mockEnrollmentRepository: {
    findByUserAndCourse: ReturnType<typeof vi.fn>;
  };
  let mockUserRepository: Partial<UserRepository>;
  let mockStorageService: Partial<StorageService>;
  let mockClsService: Partial<ClsService>;

  const publishedCourse: ICourse = {
    id: 'course-pub-1',
    title: 'Khóa học React 19 & Next.js',
    slug: 'khoa-hoc-react-19-nextjs',
    price: 499000,
    instructorId: 'inst-1',
    status: CourseStatusEnum.PUBLISHED,
    level: CourseLevelEnum.INTERMEDIATE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const sampleSection: ISection = {
    id: 'sec-1',
    courseId: 'course-pub-1',
    title: 'Chương 1: Giới thiệu',
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const previewLesson: ILesson = {
    id: 'les-preview',
    sectionId: 'sec-1',
    title: 'Bài 1: Cài đặt môi trường',
    order: 0,
    isPreview: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const lockedLesson: ILesson = {
    id: 'les-locked',
    sectionId: 'sec-1',
    title: 'Bài 2: Kiến trúc Nâng cao',
    order: 1,
    isPreview: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const studentEnrollment: IEnrollment = {
    id: 'enr-1',
    userId: 'student-1',
    courseId: 'course-pub-1',
    enrolledAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(() => {
    mockCourseRepository = {
      findPublicCoursesWithPagination: vi.fn(),
      findPublicCourseDetail: vi.fn(),
      findById: vi.fn(),
    };
    mockCategoryRepository = {
      findBySlug: vi.fn(),
    };
    mockSectionRepository = {
      findByCourseId: vi.fn(),
      findById: vi.fn().mockResolvedValue(sampleSection),
    };
    mockLessonRepository = {
      findById: vi.fn(),
      findBySectionId: vi.fn(),
    };
    mockEnrollmentRepository = {
      findByUserAndCourse: vi.fn(),
    };
    mockUserRepository = {};
    mockStorageService = {};
    mockClsService = { get: vi.fn(), set: vi.fn() };

    courseService = new CourseService(
      mockCourseRepository as unknown as CourseRepository,
      mockCategoryRepository as unknown as CourseCategoryRepository,
      mockSectionRepository as unknown as SectionRepository,
      mockLessonRepository as unknown as LessonRepository,
      mockUserRepository as unknown as UserRepository,
      mockStorageService as StorageService,
      mockClsService as ClsService,
    );

    lessonService = new LessonService(
      mockLessonRepository as unknown as LessonRepository,
      mockSectionRepository as unknown as SectionRepository,
      mockClsService as ClsService,
      mockEnrollmentRepository as unknown as EnrollmentRepository,
      mockStorageService as StorageService,
      mockCourseRepository as unknown as CourseRepository,
    );
  });

  describe('findPublicCourses', () => {
    it('1. should resolve category slug and query published courses', async () => {
      mockCategoryRepository.findBySlug.mockResolvedValue({ id: 'cat-123', slug: 'cntt' });
      mockCourseRepository.findPublicCoursesWithPagination.mockResolvedValue({
        items: [publishedCourse],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });

      const result = await courseService.findPublicCourses({ category: 'cntt', page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(mockCourseRepository.findPublicCoursesWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'cntt' }),
        'cat-123',
        undefined,
      );
    });
  });

  describe('getPublicCourseDetail', () => {
    it('2. should return public course detail with sections and lesson outlines', async () => {
      mockCourseRepository.findPublicCourseDetail.mockResolvedValue(publishedCourse);
      mockSectionRepository.findByCourseId.mockResolvedValue([sampleSection]);
      mockLessonRepository.findBySectionId.mockResolvedValue([previewLesson, lockedLesson]);

      const result = await courseService.getPublicCourseDetail('khoa-hoc-react-19-nextjs');
      expect(result.id).toBe('course-pub-1');
      expect(result.sections).toHaveLength(1);
      const firstSec = result.sections[0] as ISection & { lessons: Array<{ id: string; isPreview: boolean }> };
      expect(firstSec.lessons).toHaveLength(2);
      expect(firstSec.lessons[0].isPreview).toBe(true);
      expect(firstSec.lessons[1].isPreview).toBe(false);
    });

    it('3. should throw NotFoundException when public course does not exist', async () => {
      mockCourseRepository.findPublicCourseDetail.mockResolvedValue(null);

      await expect(courseService.getPublicCourseDetail('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getLessonForUser Access Control', () => {
    it('4. should allow any guest/user to view preview lesson', async () => {
      mockLessonRepository.findById.mockResolvedValue(previewLesson);

      const result = await lessonService.getLessonForUser('les-preview', undefined, undefined);
      expect(result.id).toBe('les-preview');
    });

    it('5. should allow ADMIN to view locked lesson', async () => {
      mockLessonRepository.findById.mockResolvedValue(lockedLesson);

      const result = await lessonService.getLessonForUser('les-locked', 'admin-id', RoleEnum.ADMIN);
      expect(result.id).toBe('les-locked');
    });

    it('6. should allow course instructor owner to view locked lesson', async () => {
      mockLessonRepository.findById.mockResolvedValue(lockedLesson);
      mockCourseRepository.findById.mockResolvedValue(publishedCourse);

      const result = await lessonService.getLessonForUser('les-locked', 'inst-1', RoleEnum.INSTRUCTOR);
      expect(result.id).toBe('les-locked');
    });

    it.each([0, 4, 8])('7. should allow enrolled student to choose lesson at order %i without completing earlier lessons', async (order) => {
      const selectedLesson = { ...lockedLesson, id: `les-locked-${order}`, order };
      mockLessonRepository.findById.mockResolvedValue(selectedLesson);
      mockCourseRepository.findById.mockResolvedValue(publishedCourse);
      mockEnrollmentRepository.findByUserAndCourse.mockResolvedValue(studentEnrollment);

      const result = await lessonService.getLessonForUser(selectedLesson.id, 'student-1', RoleEnum.STUDENT);

      expect(result).toEqual(selectedLesson);
      expect(mockEnrollmentRepository.findByUserAndCourse).toHaveBeenCalledWith(
        'student-1',
        publishedCourse.id,
        undefined,
      );
    });

    it('8. should throw ForbiddenException when non-enrolled user tries to view locked lesson', async () => {
      mockLessonRepository.findById.mockResolvedValue(lockedLesson);
      mockCourseRepository.findById.mockResolvedValue(publishedCourse);
      mockEnrollmentRepository.findByUserAndCourse.mockResolvedValue(null);

      await expect(
        lessonService.getLessonForUser('les-locked', 'stranger-id', RoleEnum.STUDENT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('9. should reject a soft-deleted enrollment', async () => {
      mockLessonRepository.findById.mockResolvedValue(lockedLesson);
      mockCourseRepository.findById.mockResolvedValue(publishedCourse);
      mockEnrollmentRepository.findByUserAndCourse.mockResolvedValue({
        ...studentEnrollment,
        deletedAt: new Date(),
      });

      await expect(
        lessonService.getLessonForUser(lockedLesson.id, 'student-1', RoleEnum.STUDENT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('10. should reject a guest requesting a non-preview lesson', async () => {
      mockLessonRepository.findById.mockResolvedValue(lockedLesson);

      await expect(
        lessonService.getLessonForUser(lockedLesson.id),
      ).rejects.toThrow(ForbiddenException);
      expect(mockEnrollmentRepository.findByUserAndCourse).not.toHaveBeenCalled();
    });

    it('11. should reject an unrelated instructor without enrollment', async () => {
      mockLessonRepository.findById.mockResolvedValue(lockedLesson);
      mockCourseRepository.findById.mockResolvedValue(publishedCourse);
      mockEnrollmentRepository.findByUserAndCourse.mockResolvedValue(null);

      await expect(
        lessonService.getLessonForUser(lockedLesson.id, 'other-instructor', RoleEnum.INSTRUCTOR),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
