import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ClsService } from 'nestjs-cls';
import { ReviewStatusEnum } from 'share-lib';
import type { CourseRepository } from '../../course/repositories/course.repository.js';
import type { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import type { LearningProgressService } from '../../learning-progress/services/learning-progress.service.js';
import type { UserRepository } from '../../user/repositories/user.repository.js';
import type { ReviewRepository } from '../repositories/review.repository.js';
import { ReviewService } from '../services/review.service.js';

describe('Admin review replies', () => {
  const review = {
    id: 'review-1',
    courseId: 'course-1',
    userId: 'student-1',
    comment: 'Video không tải được.',
    rating: 2,
    status: ReviewStatusEnum.VISIBLE,
    deletedAt: null,
    instructorReply: { content: 'Tôi đã kiểm tra nội dung bài giảng.' },
  };
  const repository = {
    findById: vi.fn(),
    setAdminReply: vi.fn(),
    update: vi.fn(),
    calculateCourseReviewStats: vi.fn(),
  };
  const courses = { findById: vi.fn(), updateRatingStats: vi.fn() };
  const users = { findById: vi.fn() };
  let service: ReviewService;

  beforeEach(() => {
    vi.resetAllMocks();
    repository.findById.mockResolvedValue(review);
    repository.setAdminReply.mockImplementation((_id, reply) =>
      Promise.resolve({ ...review, adminReply: reply }));
    courses.findById.mockResolvedValue({ id: review.courseId, instructorId: 'instructor-1' });
    users.findById.mockResolvedValue({ fullName: 'Quản trị viên hỗ trợ' });
    service = new ReviewService(
      repository as unknown as ReviewRepository,
      courses as unknown as CourseRepository,
      {} as EnrollmentRepository,
      {} as LearningProgressService,
      users as unknown as UserRepository,
      { get: vi.fn() } as unknown as ClsService,
    );
  });

  it('creates an independent reply on any visible course review without changing student data or stats', async () => {
    const result = await service.adminReplyToReview('admin-1', review.id, { reply: 'Chúng tôi đang kiểm tra lỗi phát video.' });

    expect(result.adminReply).toEqual({
      content: 'Chúng tôi đang kiểm tra lỗi phát video.',
      adminId: 'admin-1',
      adminName: 'Quản trị viên hỗ trợ',
      repliedAt: expect.any(Date),
      updatedAt: null,
      updatedById: null,
      updatedByName: null,
    });
    expect(result.instructorReply).toEqual(review.instructorReply);
    expect(result).toMatchObject({ comment: review.comment, rating: review.rating });
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.calculateCourseReviewStats).not.toHaveBeenCalled();
    expect(courses.updateRatingStats).not.toHaveBeenCalled();
  });

  it('preserves the original author and send time and records the admin who updates the reply', async () => {
    const existing = {
      content: 'Đang kiểm tra.',
      adminId: 'admin-original',
      adminName: 'Quản trị viên ban đầu',
      repliedAt: '2026-11-20T10:00:00.000Z',
    };
    repository.findById.mockResolvedValue({ ...review, adminReply: existing });

    const result = await service.adminReplyToReview('admin-2', review.id, { reply: 'Lỗi đã được khắc phục.' });

    expect(result.adminReply).toMatchObject({
      content: 'Lỗi đã được khắc phục.',
      adminId: existing.adminId,
      adminName: existing.adminName,
      repliedAt: new Date(existing.repliedAt),
      updatedAt: expect.any(Date),
      updatedById: 'admin-2',
      updatedByName: 'Quản trị viên hỗ trợ',
    });
  });

  it.each([null, { ...review, deletedAt: new Date() }, { ...review, status: ReviewStatusEnum.DELETED }])(
    'rejects a missing or deleted review (%#)', async (value) => {
      repository.findById.mockResolvedValue(value);
      await expect(service.adminReplyToReview('admin-1', review.id, { reply: 'Phản hồi' }))
        .rejects.toBeInstanceOf(NotFoundException);
      expect(repository.setAdminReply).not.toHaveBeenCalled();
    },
  );

  it('rejects a hidden review', async () => {
    repository.findById.mockResolvedValue({ ...review, status: ReviewStatusEnum.HIDDEN });
    await expect(service.adminReplyToReview('admin-1', review.id, { reply: 'Phản hồi' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.setAdminReply).not.toHaveBeenCalled();
  });

  it.each([null, { deletedAt: new Date() }])('rejects a missing or deleted course (%#)', async (course) => {
    courses.findById.mockResolvedValue(course);
    await expect(service.adminReplyToReview('admin-1', review.id, { reply: 'Phản hồi' }))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(repository.setAdminReply).not.toHaveBeenCalled();
  });

  it('reports a conflict if the review is hidden or deleted before the database write', async () => {
    repository.setAdminReply.mockResolvedValue(null);
    await expect(service.adminReplyToReview('admin-1', review.id, { reply: 'Phản hồi' }))
      .rejects.toBeInstanceOf(ConflictException);
  });
});
