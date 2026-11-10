import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { CourseStatusEnum } from 'share-lib';
import { ReviewService } from '../services/review.service.js';
import { ReviewRepository } from '../repositories/review.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { LearningProgressService } from '../../learning-progress/services/learning-progress.service.js';

describe('ReviewService', () => {
  let service: ReviewService;
  let mockReviewRepo: Record<string, unknown>;
  let mockCourseRepo: Record<string, unknown>;
  let mockEnrollmentRepo: Record<string, unknown>;
  let mockProgressService: Record<string, unknown>;
  let mockCls: ClsService;

  const userId = 'user_student_1';
  const instructorId = 'user_instructor_1';
  const courseId = 'course_test_1';
  const reviewId = 'review_test_1';

  beforeEach(() => {
    mockReviewRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      findByUserAndCourse: vi.fn(),
      findCourseReviews: vi.fn(),
      calculateCourseReviewStats: vi.fn(),
      withTransaction: vi.fn().mockImplementation((fn: (s: unknown) => unknown) => fn({})),
    };

    mockCourseRepo = {
      findById: vi.fn(),
      updateRatingStats: vi.fn(),
    };

    mockEnrollmentRepo = {
      findByUserAndCourse: vi.fn(),
    };

    mockProgressService = {
      getProgress: vi.fn(),
    };

    mockCls = {
      get: vi.fn().mockReturnValue(userId),
    } as unknown as ClsService;

    service = new ReviewService(
      mockReviewRepo as unknown as ReviewRepository,
      mockCourseRepo as unknown as CourseRepository,
      mockEnrollmentRepo as unknown as EnrollmentRepository,
      mockProgressService as unknown as LearningProgressService,
      mockCls,
    );
  });

  describe('checkEligibility', () => {
    it('1. should throw NotFoundException if course does not exist', async () => {
      (mockCourseRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(service.checkEligibility(userId, courseId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('2. should not allow instructor of the course to review their own course', async () => {
      (mockCourseRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: courseId,
        instructorId: instructorId,
        status: CourseStatusEnum.PUBLISHED,
      });

      const result = await service.checkEligibility(instructorId, courseId);

      expect(result.canReview).toBe(false);
      expect(result.isInstructor).toBe(true);
      expect(result.reason).toContain('Giảng viên không thể đánh giá');
    });

    it('3. should not allow user who has not enrolled to review', async () => {
      (mockCourseRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: courseId,
        instructorId,
        status: CourseStatusEnum.PUBLISHED,
      });
      (mockEnrollmentRepo.findByUserAndCourse as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await service.checkEligibility(userId, courseId);

      expect(result.canReview).toBe(false);
      expect(result.isEnrolled).toBe(false);
      expect(result.reason).toContain('Bạn cần mua hoặc đăng ký khóa học');
    });

    it('4. should not allow user who already has an active review', async () => {
      (mockCourseRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: courseId,
        instructorId,
        status: CourseStatusEnum.PUBLISHED,
      });
      (mockEnrollmentRepo.findByUserAndCourse as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'enrollment_1',
      });
      (mockReviewRepo.findByUserAndCourse as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: reviewId,
        rating: 5,
        deletedAt: null,
      });

      const result = await service.checkEligibility(userId, courseId);

      expect(result.canReview).toBe(false);
      expect(result.hasReviewed).toBe(true);
      expect(result.existingReviewId).toBe(reviewId);
      expect(result.reason).toContain('Bạn đã đánh giá khóa học này rồi');
    });

    it('5. should reject user with exactly 20.0% progress', async () => {
      (mockCourseRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: courseId,
        instructorId,
        status: CourseStatusEnum.PUBLISHED,
      });
      (mockEnrollmentRepo.findByUserAndCourse as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'enrollment_1',
      });
      (mockReviewRepo.findByUserAndCourse as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockProgressService.getProgress as ReturnType<typeof vi.fn>).mockResolvedValue({
        progressPercent: 20.0,
      });

      const result = await service.checkEligibility(userId, courseId);

      expect(result.canReview).toBe(false);
      expect(result.progressPercent).toBe(20.0);
      expect(result.reason).toContain('Bạn cần hoàn thành hơn 20% khóa học');
    });

    it('6. should reject user with 15% progress', async () => {
      (mockCourseRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: courseId,
        instructorId,
        status: CourseStatusEnum.PUBLISHED,
      });
      (mockEnrollmentRepo.findByUserAndCourse as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'enrollment_1',
      });
      (mockReviewRepo.findByUserAndCourse as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockProgressService.getProgress as ReturnType<typeof vi.fn>).mockResolvedValue({
        progressPercent: 15,
      });

      const result = await service.checkEligibility(userId, courseId);

      expect(result.canReview).toBe(false);
      expect(result.progressPercent).toBe(15);
      expect(result.reason).toContain('Tiến độ hiện tại: 15%');
    });

    it('7. should allow user with 20.1% progress', async () => {
      (mockCourseRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: courseId,
        instructorId,
        status: CourseStatusEnum.PUBLISHED,
      });
      (mockEnrollmentRepo.findByUserAndCourse as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'enrollment_1',
      });
      (mockReviewRepo.findByUserAndCourse as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockProgressService.getProgress as ReturnType<typeof vi.fn>).mockResolvedValue({
        progressPercent: 20.1,
      });

      const result = await service.checkEligibility(userId, courseId);

      expect(result.canReview).toBe(true);
      expect(result.progressPercent).toBe(20.1);
      expect(result.reason).toBeNull();
    });

    it('8. should allow user with 50% progress', async () => {
      (mockCourseRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: courseId,
        instructorId,
        status: CourseStatusEnum.PUBLISHED,
      });
      (mockEnrollmentRepo.findByUserAndCourse as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'enrollment_1',
      });
      (mockReviewRepo.findByUserAndCourse as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockProgressService.getProgress as ReturnType<typeof vi.fn>).mockResolvedValue({
        progressPercent: 50,
      });

      const result = await service.checkEligibility(userId, courseId);

      expect(result.canReview).toBe(true);
      expect(result.progressPercent).toBe(50);
      expect(result.reason).toBeNull();
    });
  });

  describe('createReview', () => {
    it('9. should throw ForbiddenException when user has progress <= 20%', async () => {
      (mockCourseRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: courseId,
        instructorId,
      });
      (mockEnrollmentRepo.findByUserAndCourse as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'enrollment_1',
      });
      (mockReviewRepo.findByUserAndCourse as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockProgressService.getProgress as ReturnType<typeof vi.fn>).mockResolvedValue({
        progressPercent: 19.9,
      });

      await expect(
        service.createReview(userId, courseId, { rating: 5, comment: 'Hay' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('10. should create review, recalculate stats, and update course on success', async () => {
      (mockCourseRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: courseId,
        instructorId,
      });
      (mockEnrollmentRepo.findByUserAndCourse as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'enrollment_1',
      });
      (mockReviewRepo.findByUserAndCourse as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockProgressService.getProgress as ReturnType<typeof vi.fn>).mockResolvedValue({
        progressPercent: 35,
      });

      const mockCreated = {
        id: reviewId,
        userId,
        courseId,
        rating: 5,
        comment: 'Khóa học tuyệt đỉnh',
      };
      (mockReviewRepo.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockCreated);
      (mockReviewRepo.calculateCourseReviewStats as ReturnType<typeof vi.fn>).mockResolvedValue({
        averageRating: 5.0,
        totalReviews: 1,
      });

      const result = await service.createReview(userId, courseId, {
        rating: 5,
        comment: 'Khóa học tuyệt đỉnh',
      });

      expect(mockReviewRepo.create).toHaveBeenCalled();
      expect(mockReviewRepo.calculateCourseReviewStats).toHaveBeenCalledWith(courseId, expect.anything());
      expect(mockCourseRepo.updateRatingStats).toHaveBeenCalledWith(courseId, 5.0, 1, expect.anything());
      expect(result).toEqual(mockCreated);
    });

    it('11. should throw ConflictException if duplicate review key error occurs', async () => {
      (mockCourseRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: courseId,
        instructorId,
      });
      (mockEnrollmentRepo.findByUserAndCourse as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'enrollment_1',
      });
      (mockReviewRepo.findByUserAndCourse as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockProgressService.getProgress as ReturnType<typeof vi.fn>).mockResolvedValue({
        progressPercent: 30,
      });

      (mockReviewRepo.create as ReturnType<typeof vi.fn>).mockRejectedValue({
        code: 11000,
        message: 'E11000 duplicate key error',
      });

      await expect(
        service.createReview(userId, courseId, { rating: 5 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateReview', () => {
    it('12. should throw ForbiddenException if user tries to update another student review', async () => {
      (mockReviewRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: reviewId,
        userId: 'other_user',
        courseId,
      });

      await expect(
        service.updateReview(userId, reviewId, { rating: 4 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('13. should update rating and recalculate stats when owner edits review', async () => {
      (mockReviewRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: reviewId,
        userId,
        courseId,
        rating: 5,
      });
      (mockEnrollmentRepo.findByUserAndCourse as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'enrollment_1',
      });
      (mockReviewRepo.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: reviewId,
        userId,
        courseId,
        rating: 4,
      });
      (mockReviewRepo.calculateCourseReviewStats as ReturnType<typeof vi.fn>).mockResolvedValue({
        averageRating: 4.0,
        totalReviews: 1,
      });

      const updated = await service.updateReview(userId, reviewId, { rating: 4 });

      expect(mockReviewRepo.update).toHaveBeenCalled();
      expect(mockCourseRepo.updateRatingStats).toHaveBeenCalledWith(courseId, 4.0, 1, expect.anything());
      expect(updated.rating).toBe(4);
    });
  });

  describe('deleteReview', () => {
    it('14. should throw ForbiddenException if user tries to delete another student review', async () => {
      (mockReviewRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: reviewId,
        userId: 'other_user',
        courseId,
      });

      await expect(service.deleteReview(userId, reviewId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('15. should soft-delete review, recalculate stats, and update course', async () => {
      (mockReviewRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: reviewId,
        userId,
        courseId,
      });
      (mockReviewRepo.softDelete as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (mockReviewRepo.calculateCourseReviewStats as ReturnType<typeof vi.fn>).mockResolvedValue({
        averageRating: 0,
        totalReviews: 0,
      });

      const success = await service.deleteReview(userId, reviewId);

      expect(success).toBe(true);
      expect(mockReviewRepo.softDelete).toHaveBeenCalledWith(reviewId, userId, expect.anything());
      expect(mockCourseRepo.updateRatingStats).toHaveBeenCalledWith(courseId, 0, 0, expect.anything());
    });
  });
});

