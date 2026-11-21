import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CourseStatusEnum, CourseLevelEnum, CourseApprovalActionEnum, type ICourse } from 'share-lib';
import { CourseService } from '../services/course.service.js';
import type { CourseRepository } from '../repositories/course.repository.js';
import type { CourseCategoryRepository } from '../repositories/course-category.repository.js';
import type { SectionRepository } from '../repositories/section.repository.js';
import type { LessonRepository } from '../repositories/lesson.repository.js';
import type { CourseMindmapRepository } from '../repositories/course-mindmap.repository.js';
import type { CourseApprovalHistoryRepository } from '../repositories/course-approval-history.repository.js';
import type { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import type { UserRepository } from '../../user/repositories/user.repository.js';
import type { StorageService } from '../../storage/index.js';
import type { ClsService } from 'nestjs-cls';
import type { LessonQuizRepository } from '../repositories/lesson-quiz.repository.js';
import { PaginationResult } from '../../base/index.js';

describe('Course Approval History Service', () => {
  let courseService: CourseService;
  let mockCourseRepo: Partial<CourseRepository>;
  let mockCategoryRepo: Partial<CourseCategoryRepository>;
  let mockSectionRepo: Partial<SectionRepository>;
  let mockLessonRepo: Partial<LessonRepository>;
  let mockCourseApprovalHistoryRepo: Partial<CourseApprovalHistoryRepository>;
  let mockCls: Partial<ClsService>;
  const mockQuizRepo = { findByLessonIds: vi.fn() };

  const baseCourse: ICourse = {
    id: 'course_123',
    title: 'Khóa học React nâng cao',
    slug: 'khoa-hoc-react-nang-cao',
    instructorId: 'instructor_1',
    status: CourseStatusEnum.PENDING_APPROVAL,
    level: CourseLevelEnum.INTERMEDIATE,
    price: 500000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockQuizRepo.findByLessonIds.mockReset().mockResolvedValue([]);
    mockCourseRepo = {
      findById: vi.fn(),
      approveCourse: vi.fn(),
      rejectCourse: vi.fn(),
    };
    mockCategoryRepo = {
      findById: vi.fn(),
    };
    mockSectionRepo = {
      findByCourseId: vi.fn().mockResolvedValue([]),
    };
    mockLessonRepo = {
      findBySectionIds: vi.fn().mockResolvedValue([]),
    };
    mockCourseApprovalHistoryRepo = {
      createHistory: vi.fn(),
      findAdminHistoriesWithPagination: vi.fn(),
      getStats: vi.fn(),
      findByCourseId: vi.fn(),
    };
    mockCls = {
      get: vi.fn().mockReturnValue('admin_1'),
    };

    courseService = new CourseService(
      mockCourseRepo as CourseRepository,
      mockCategoryRepo as CourseCategoryRepository,
      mockSectionRepo as SectionRepository,
      mockLessonRepo as LessonRepository,
      {} as CourseMindmapRepository,
      { countByCourseId: vi.fn().mockResolvedValue(0), countByCourseIds: vi.fn().mockResolvedValue(new Map()) } as unknown as EnrollmentRepository,
      {} as UserRepository,
      {} as StorageService,
      mockCourseApprovalHistoryRepo as CourseApprovalHistoryRepository,
      mockCls as ClsService,
      mockQuizRepo as unknown as LessonQuizRepository,
    );
  });

  describe('approveCourse with History Creation', () => {
    it('should create an APPROVED history record when admin approves course', async () => {
      const approvedCourse: ICourse = {
        ...baseCourse,
        status: CourseStatusEnum.PUBLISHED,
        reviewedAt: new Date(),
        reviewedById: 'admin_1',
      };
      vi.mocked(mockCourseRepo.approveCourse!).mockResolvedValue(approvedCourse);
      vi.mocked(mockCourseApprovalHistoryRepo.createHistory!).mockResolvedValue({
        id: 'hist_1',
        courseId: 'course_123',
        adminId: 'admin_1',
        instructorId: 'instructor_1',
        action: CourseApprovalActionEnum.APPROVED,
        previousStatus: CourseStatusEnum.PENDING_APPROVAL,
        targetStatus: CourseStatusEnum.PUBLISHED,
        reason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await courseService.approveCourse('course_123', 'admin_1');

      expect(result.status).toBe(CourseStatusEnum.PUBLISHED);
      expect(mockCourseApprovalHistoryRepo.createHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId: 'course_123',
          adminId: 'admin_1',
          instructorId: 'instructor_1',
          action: CourseApprovalActionEnum.APPROVED,
          previousStatus: CourseStatusEnum.PENDING_APPROVAL,
          targetStatus: CourseStatusEnum.PUBLISHED,
          reason: null,
        }),
        undefined,
      );
    });
  });

  describe('rejectCourse with History Creation', () => {
    it('should create a REJECTED history record with reason when admin rejects course', async () => {
      const rejectedCourse: ICourse = {
        ...baseCourse,
        status: CourseStatusEnum.DRAFT,
        rejectionReason: 'Nội dung video bài học 1 chưa có âm thanh',
        reviewedAt: new Date(),
        reviewedById: 'admin_1',
      };
      vi.mocked(mockCourseRepo.rejectCourse!).mockResolvedValue(rejectedCourse);
      vi.mocked(mockCourseApprovalHistoryRepo.createHistory!).mockResolvedValue({
        id: 'hist_2',
        courseId: 'course_123',
        adminId: 'admin_1',
        instructorId: 'instructor_1',
        action: CourseApprovalActionEnum.REJECTED,
        previousStatus: CourseStatusEnum.PENDING_APPROVAL,
        targetStatus: CourseStatusEnum.DRAFT,
        reason: 'Nội dung video bài học 1 chưa có âm thanh',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await courseService.rejectCourse(
        'course_123',
        'admin_1',
        'Nội dung video bài học 1 chưa có âm thanh',
      );

      expect(result.status).toBe(CourseStatusEnum.DRAFT);
      expect(mockCourseApprovalHistoryRepo.createHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId: 'course_123',
          adminId: 'admin_1',
          instructorId: 'instructor_1',
          action: CourseApprovalActionEnum.REJECTED,
          previousStatus: CourseStatusEnum.PENDING_APPROVAL,
          targetStatus: CourseStatusEnum.DRAFT,
          reason: 'Nội dung video bài học 1 chưa có âm thanh',
        }),
        undefined,
      );
    });
  });

  describe('findAdminCourseApprovalHistories', () => {
    it('should delegate to repository with pagination', async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      vi.mocked(mockCourseApprovalHistoryRepo.findAdminHistoriesWithPagination!).mockResolvedValue(mockResult);

      const res = await courseService.findAdminCourseApprovalHistories({ page: 1, limit: 10 } as QueryCourseApprovalHistoryDto);

      expect(res).toBe(mockResult);
      expect(mockCourseApprovalHistoryRepo.findAdminHistoriesWithPagination).toHaveBeenCalledWith(
        { page: 1, limit: 10 } as QueryCourseApprovalHistoryDto,
        undefined,
      );
    });
  });

  describe('getAdminCourseApprovalHistoryStats', () => {
    it('should delegate to repository getStats', async () => {
      const stats = { total: 10, approved: 8, rejected: 2 };
      vi.mocked(mockCourseApprovalHistoryRepo.getStats!).mockResolvedValue(stats);

      const res = await courseService.getAdminCourseApprovalHistoryStats();

      expect(res).toEqual(stats);
      expect(mockCourseApprovalHistoryRepo.getStats).toHaveBeenCalled();
    });
  });

  describe('getCourseApprovalHistories', () => {
    it('should delegate to repository findByCourseId', async () => {
      vi.mocked(mockCourseApprovalHistoryRepo.findByCourseId!).mockResolvedValue([]);

      const res = await courseService.getCourseApprovalHistories('course_123');

      expect(res).toEqual([]);
      expect(mockCourseApprovalHistoryRepo.findByCourseId).toHaveBeenCalledWith('course_123', undefined);
    });
  });
});
