import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CourseStatusEnum, CourseLevelEnum, RoleEnum, type ICourse } from 'share-lib';
import { CourseService } from '../services/course.service.js';
import type { CourseRepository } from '../repositories/course.repository.js';
import type { QueryCoursesAdminDto } from '../dto/query-courses-admin.dto.js';
import type { CourseCategoryRepository } from '../repositories/course-category.repository.js';
import type { SectionRepository } from '../repositories/section.repository.js';
import type { LessonRepository } from '../repositories/lesson.repository.js';
import type { UserRepository } from '../../user/repositories/user.repository.js';
import type { StorageService } from '../../storage/index.js';
import type { ClsService } from 'nestjs-cls';

describe('Course Moderation & Concurrency Control', () => {
  let courseService: CourseService;
  let mockCourseRepo: Partial<CourseRepository>;
  let mockCategoryRepo: Partial<CourseCategoryRepository>;
  let mockSectionRepo: Partial<SectionRepository>;
  let mockLessonRepo: Partial<LessonRepository>;
  let mockUserRepo: Partial<UserRepository>;
  let mockStorageService: Partial<StorageService>;
  let mockCls: Partial<ClsService>;

  const baseCourse: ICourse = {
    id: 'course_123',
    title: 'NestJS Masterclass',
    slug: 'nestjs-masterclass',
    description: 'Detailed description',
    shortDescription: 'Short summary',
    thumbnailUrl: 'https://minio/thumbnail.png',
    trailerUrl: 'https://minio/trailer.mp4',
    price: 199000,
    originalPrice: 299000,
    instructorId: 'instructor_1',
    status: CourseStatusEnum.PENDING_APPROVAL,
    level: CourseLevelEnum.INTERMEDIATE,
    categoryId: 'cat_1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockCourseRepo = {
      findById: vi.fn(),
      approveCourse: vi.fn(),
      rejectCourse: vi.fn(),
      findAdminCoursesWithPagination: vi.fn(),
      requestApproval: vi.fn(),
      update: vi.fn(),
    };
    mockCategoryRepo = {
      findById: vi.fn(),
    };
    mockSectionRepo = {
      findById: vi.fn(),
      findByCourseId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      reorderSections: vi.fn(),
    };
    mockLessonRepo = {
      findBySectionId: vi.fn(),
      findBySectionIds: vi.fn(),
    };
    mockUserRepo = {
      findById: vi.fn(),
    };
    mockStorageService = {
      uploadImage: vi.fn(),
      uploadLessonMedia: vi.fn(),
      deleteFile: vi.fn(),
    };
    mockCls = {
      get: vi.fn().mockReturnValue('admin_1'),
    };

    courseService = new CourseService(
      mockCourseRepo as CourseRepository,
      mockCategoryRepo as CourseCategoryRepository,
      mockSectionRepo as SectionRepository,
      mockLessonRepo as LessonRepository,
      mockUserRepo as UserRepository,
      mockStorageService as StorageService,
      mockCls as ClsService,
    );
  });

  describe('Concurrency & Race Condition Handling (Hai Admin cùng bấm duyệt)', () => {
    it('chỉ một Admin duyệt thành công khi hai Admin cùng bấm duyệt đồng thời', async () => {
      const admin1 = 'admin_001';
      const admin2 = 'admin_002';

      // Giả lập MongoDB Atomic Conditional Update:
      // Admin đầu tiên tìm thấy status PENDING_APPROVAL -> cập nhật thành PUBLISHED
      // Admin thứ hai thấy status đã là PUBLISHED (không còn PENDING_APPROVAL) -> update trả về null
      const approvedCourse: ICourse = {
        ...baseCourse,
        status: CourseStatusEnum.PUBLISHED,
        reviewedById: admin1,
        reviewedAt: new Date(),
      };

      (mockCourseRepo.approveCourse as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(approvedCourse) // Admin 1 thành công
        .mockResolvedValueOnce(null); // Admin 2 thất bại do race condition

      (mockCourseRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(approvedCourse);

      // Hai Admin cùng gửi request duyệt đồng thời
      const promise1 = courseService.approveCourse(baseCourse.id, admin1);
      const promise2 = courseService.approveCourse(baseCourse.id, admin2);

      const results = await Promise.allSettled([promise1, promise2]);

      // Khẳng định: Exactly 1 fulfilled và 1 rejected
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      if (fulfilled[0].status === 'fulfilled') {
        expect(fulfilled[0].value.status).toBe(CourseStatusEnum.PUBLISHED);
      }

      if (rejected[0].status === 'rejected') {
        expect(rejected[0].reason).toBeInstanceOf(ConflictException);
        expect((rejected[0].reason as ConflictException).message).toContain(
          'Khóa học đã được xử lý bởi quản trị viên khác hoặc không ở trạng thái chờ duyệt.',
        );
      }
    });

    it('báo lỗi NotFoundException nếu khóa học không tồn tại khi duyệt', async () => {
      (mockCourseRepo.approveCourse as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockCourseRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        courseService.approveCourse('non_existent', 'admin_1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Admin Yêu Cầu Chỉnh Sửa & Giảng Viên Gửi Lại', () => {
    it('Admin yêu cầu chỉnh sửa thì khóa học chuyển về DRAFT kèm lý do', async () => {
      const adminId = 'admin_001';
      const reason = 'Video bài giảng thứ 2 bị mất âm thanh. Vui lòng kiểm tra và gửi phê duyệt lại.';

      const rejectedCourse: ICourse = {
        ...baseCourse,
        status: CourseStatusEnum.DRAFT,
        rejectionReason: reason,
        reviewedById: adminId,
        reviewedAt: new Date(),
      };

      (mockCourseRepo.rejectCourse as ReturnType<typeof vi.fn>).mockResolvedValue(rejectedCourse);

      const result = await courseService.rejectCourse(baseCourse.id, adminId, reason);

      expect(result.status).toBe(CourseStatusEnum.DRAFT);
      expect(result.rejectionReason).toBe(reason);
      expect(mockCourseRepo.rejectCourse).toHaveBeenCalledWith(
        baseCourse.id,
        adminId,
        reason,
        undefined,
      );
    });

    it('hai Admin cùng bấm yêu cầu chỉnh sửa đồng thời thì chỉ một thao tác thành công', async () => {
      const reason = 'Lý do phản hồi';
      (mockCourseRepo.rejectCourse as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ ...baseCourse, status: CourseStatusEnum.DRAFT, rejectionReason: reason })
        .mockResolvedValueOnce(null);

      (mockCourseRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(baseCourse);

      const promise1 = courseService.rejectCourse(baseCourse.id, 'admin_1', reason);
      const promise2 = courseService.rejectCourse(baseCourse.id, 'admin_2', reason);

      const results = await Promise.allSettled([promise1, promise2]);
      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      if (rejected[0].status === 'rejected') {
        expect(rejected[0].reason).toBeInstanceOf(ConflictException);
      }
    });
  });

  describe('Khóa Chỉnh Sửa Khi Đang Chờ Phê Duyệt (PENDING_APPROVAL)', () => {
    beforeEach(() => {
      (mockCourseRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(baseCourse);
    });

    it('chặn update thông tin khóa học khi đang chờ duyệt', async () => {
      await expect(
        courseService.updateCourse(
          baseCourse.id,
          { title: 'Tên mới' },
          'instructor_1',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('chặn upload thumbnail khi đang chờ duyệt', async () => {
      const dummyFile = {} as Express.Multer.File;
      await expect(
        courseService.updateCourseThumbnail(
          baseCourse.id,
          'instructor_1',
          RoleEnum.INSTRUCTOR,
          dummyFile,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('chặn upload trailer khi đang chờ duyệt', async () => {
      const dummyFile = {} as Express.Multer.File;
      await expect(
        courseService.updateCourseTrailer(
          baseCourse.id,
          'instructor_1',
          RoleEnum.INSTRUCTOR,
          dummyFile,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('chặn tạo section mới khi đang chờ duyệt', async () => {
      await expect(
        courseService.createSection(
          baseCourse.id,
          { title: 'Chương 1' },
          'instructor_1',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('chặn sửa section khi đang chờ duyệt', async () => {
      await expect(
        courseService.updateSection(
          baseCourse.id,
          'sec_1',
          { title: 'Tên chương mới' },
          'instructor_1',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('chặn xóa section khi đang chờ duyệt', async () => {
      await expect(
        courseService.deleteSection(
          baseCourse.id,
          'sec_1',
          'instructor_1',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('chặn sắp xếp lại section khi đang chờ duyệt', async () => {
      await expect(
        courseService.reorderSections(
          baseCourse.id,
          { sectionIds: ['sec_1', 'sec_2'] },
          'instructor_1',
          RoleEnum.INSTRUCTOR,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Admin Query Danh Sách Khóa Học', () => {
    it('gọi repository với đúng tham số phân trang và bộ lọc', async () => {
      const query: QueryCoursesAdminDto = {
        page: 2,
        limit: 10,
        isPagination: true,
        search: 'NestJS',
        status: CourseStatusEnum.PENDING_APPROVAL,
      };

      (mockCourseRepo.findAdminCoursesWithPagination as ReturnType<typeof vi.fn>).mockResolvedValue({
        items: [baseCourse],
        total: 1,
        page: 2,
        limit: 10,
        totalPages: 1,
      });

      const result = await courseService.findAdminCourses(query);

      expect(mockCourseRepo.findAdminCoursesWithPagination).toHaveBeenCalledWith(query, undefined);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe(baseCourse.id);
    });
  });
});
