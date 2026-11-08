import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ClsService } from 'nestjs-cls';
import {
  CourseLevelEnum, CourseStatusEnum, LessonContentTypeEnum, RoleEnum,
  type ICourse, type ICourseApprovalChecklist,
} from 'share-lib';
import { CourseApprovalService } from '../services/course-approval.service.js';
import { CourseService } from '../services/course.service.js';
import type { CourseRepository } from '../repositories/course.repository.js';
import type { CourseCategoryRepository } from '../repositories/course-category.repository.js';
import type { SectionRepository } from '../repositories/section.repository.js';
import type { LessonRepository } from '../repositories/lesson.repository.js';
import type { CourseMindmapRepository } from '../repositories/course-mindmap.repository.js';
import type { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import type { UserRepository } from '../../user/repositories/user.repository.js';
import type { StorageService } from '../../storage/index.js';

describe('CourseApprovalService', () => {
  const courseId = '507f1f77bcf86cd799439011';
  const instructorId = '507f1f77bcf86cd799439012';
  const sectionId = '507f1f77bcf86cd799439013';
  let course: ICourse;
  const courseRepository = { findById: vi.fn(), requestApproval: vi.fn(), withdrawApproval: vi.fn() };
  const categoryRepository = { findById: vi.fn() };
  const sectionRepository = { findByCourseId: vi.fn() };
  const lessonRepository = { findBySectionIds: vi.fn() };
  let service: CourseApprovalService;

  beforeEach(() => {
    vi.resetAllMocks();
    course = {
      id: courseId, title: 'TypeScript thực hành', slug: 'typescript-thuc-hanh',
      instructorId, categoryId: '507f1f77bcf86cd799439014', level: CourseLevelEnum.ALL_LEVELS,
      description: '<p>Nội dung khóa học.</p>', price: 0,
      thumbnailUrl: 'https://media.example.com/thumb.webp', trailerUrl: 'https://media.example.com/trailer.mp4',
      status: CourseStatusEnum.DRAFT, studentsCount: 0, createdAt: new Date(), updatedAt: new Date(),
    };
    courseRepository.findById.mockImplementation(async () => course);
    courseRepository.requestApproval.mockImplementation(async () => ({ ...course, status: CourseStatusEnum.PENDING_APPROVAL }));
    categoryRepository.findById.mockResolvedValue({ isActive: true, deletedAt: null });
    sectionRepository.findByCourseId.mockResolvedValue([{ id: sectionId, title: 'Nhập môn', order: 0 }]);
    lessonRepository.findBySectionIds.mockResolvedValue([{
      id: 'lesson', sectionId, title: 'Giới thiệu', order: 0,
      content: { type: LessonContentTypeEnum.VIDEO, url: 'https://media.example.com/lesson.mp4' },
    }]);
    const courseService = new CourseService(
      courseRepository as unknown as CourseRepository,
      categoryRepository as unknown as CourseCategoryRepository,
      sectionRepository as unknown as SectionRepository,
      lessonRepository as unknown as LessonRepository,
      {} as CourseMindmapRepository,
      { countByCourseId: vi.fn().mockResolvedValue(0), countByCourseIds: vi.fn().mockResolvedValue(new Map()) } as unknown as EnrollmentRepository,
      {} as UserRepository, {} as StorageService, { get: vi.fn() } as unknown as ClsService,
    );
    service = new CourseApprovalService(
      courseService,
      courseRepository as unknown as CourseRepository,
      categoryRepository as unknown as CourseCategoryRepository,
      sectionRepository as unknown as SectionRepository,
      lessonRepository as unknown as LessonRepository,
    );
  });

  it('submits the persisted draft and passes the checked version and actor to the conditional write', async () => {
    const result = await service.requestApproval(courseId, instructorId, RoleEnum.INSTRUCTOR);
    expect(result.status).toBe(CourseStatusEnum.PENDING_APPROVAL);
    expect(courseRepository.requestApproval).toHaveBeenCalledWith(course, instructorId);
    expect(lessonRepository.findBySectionIds).toHaveBeenCalledWith([sectionId]);
  });

  it.each(['getChecklist', 'requestApproval'] as const)('rejects another instructor before exposing checklist data: %s', async (method) => {
    await expect(service[method](courseId, 'other-instructor', RoleEnum.INSTRUCTOR)).rejects.toThrow(ForbiddenException);
    expect(sectionRepository.findByCourseId).not.toHaveBeenCalled();
    expect(courseRepository.requestApproval).not.toHaveBeenCalled();
  });

  it('rejects a deleted course', async () => {
    course.deletedAt = new Date();
    await expect(service.requestApproval(courseId, instructorId, RoleEnum.INSTRUCTOR)).rejects.toThrow(NotFoundException);
  });

  it('returns authoritative issues without changing status when data changed after opening the dialog', async () => {
    expect((await service.getChecklist(courseId, instructorId, RoleEnum.INSTRUCTOR)).canSubmit).toBe(true);
    lessonRepository.findBySectionIds.mockResolvedValue([]);
    const error = await service.requestApproval(courseId, instructorId, RoleEnum.INSTRUCTOR).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(BadRequestException);
    const response = (error as BadRequestException).getResponse() as { checklist: ICourseApprovalChecklist };
    expect(response.checklist.canSubmit).toBe(false);
    expect(response.checklist.items.at(-1)?.issues[0].target.sectionId).toBe(sectionId);
    expect(courseRepository.requestApproval).not.toHaveBeenCalled();
  });

  it.each([null, { isActive: false }, { isActive: true, deletedAt: new Date() }])
  ('requires an existing active category at submission time', async (category) => {
    categoryRepository.findById.mockResolvedValue(category);
    await expect(service.requestApproval(courseId, instructorId, RoleEnum.INSTRUCTOR)).rejects.toThrow(BadRequestException);
    expect(courseRepository.requestApproval).not.toHaveBeenCalled();
  });

  it.each([CourseStatusEnum.PENDING_APPROVAL, CourseStatusEnum.PUBLISHED, CourseStatusEnum.ARCHIVED])
  ('rejects a non-draft: %s', async (status) => {
    course.status = status;
    await expect(service.requestApproval(courseId, instructorId, RoleEnum.INSTRUCTOR)).rejects.toThrow(ConflictException);
    expect(courseRepository.requestApproval).not.toHaveBeenCalled();
  });

  it('reports a conflict if another request wins the conditional status transition', async () => {
    courseRepository.requestApproval.mockResolvedValueOnce({ ...course, status: CourseStatusEnum.PENDING_APPROVAL })
      .mockResolvedValueOnce(null);
    const results = await Promise.allSettled([
      service.requestApproval(courseId, instructorId, RoleEnum.INSTRUCTOR),
      service.requestApproval(courseId, instructorId, RoleEnum.INSTRUCTOR),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({ reason: expect.any(ConflictException) });
  });

  it('propagates a storage read failure instead of marking missing data as complete', async () => {
    lessonRepository.findBySectionIds.mockRejectedValue(new Error('database unavailable'));
    await expect(service.requestApproval(courseId, instructorId, RoleEnum.INSTRUCTOR)).rejects.toThrow('database unavailable');
    expect(courseRepository.requestApproval).not.toHaveBeenCalled();
  });

  describe('withdrawApproval', () => {
    it('successfully withdraws approval when course is in PENDING_APPROVAL status', async () => {
      course.status = CourseStatusEnum.PENDING_APPROVAL;
      courseRepository.withdrawApproval.mockResolvedValueOnce({
        ...course,
        status: CourseStatusEnum.DRAFT,
      });

      const result = await service.withdrawApproval(courseId, instructorId, RoleEnum.INSTRUCTOR);
      expect(result.status).toBe(CourseStatusEnum.DRAFT);
      expect(courseRepository.withdrawApproval).toHaveBeenCalledWith(courseId, instructorId);
    });

    it('rejects withdrawal if course is not in PENDING_APPROVAL status', async () => {
      course.status = CourseStatusEnum.DRAFT;
      await expect(
        service.withdrawApproval(courseId, instructorId, RoleEnum.INSTRUCTOR),
      ).rejects.toThrow(ConflictException);
      expect(courseRepository.withdrawApproval).not.toHaveBeenCalled();
    });

    it('throws ConflictException if concurrent update makes withdrawApproval return null', async () => {
      course.status = CourseStatusEnum.PENDING_APPROVAL;
      courseRepository.withdrawApproval.mockResolvedValueOnce(null);

      await expect(
        service.withdrawApproval(courseId, instructorId, RoleEnum.INSTRUCTOR),
      ).rejects.toThrow(ConflictException);
    });
  });
});
