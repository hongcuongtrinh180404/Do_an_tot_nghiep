import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import {
  IReview,
  ICourseReviewStats,
  IReviewEligibility,
  CourseStatusEnum,
} from 'share-lib';
import { BaseService, isDuplicateKeyError, PaginationResult } from '../../base/index.js';
import { ReviewRepository } from '../repositories/review.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { LearningProgressService } from '../../learning-progress/services/learning-progress.service.js';
import { CreateReviewDto } from '../dto/create-review.dto.js';
import { UpdateReviewDto } from '../dto/update-review.dto.js';
import { QueryReviewsDto } from '../dto/query-reviews.dto.js';

@Injectable()
export class ReviewService extends BaseService<IReview, string> {
  constructor(
    protected readonly reviewRepository: ReviewRepository,
    protected readonly courseRepository: CourseRepository,
    protected readonly enrollmentRepository: EnrollmentRepository,
    protected readonly learningProgressService: LearningProgressService,
    cls: ClsService,
  ) {
    super(reviewRepository, cls, ReviewService.name);
  }

  async checkEligibility(userId: string, courseId: string): Promise<IReviewEligibility> {
    const course = await this.courseRepository.findById(courseId);
    if (!course || course.deletedAt) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }

    // 1. Giảng viên tạo khóa học không được đánh giá khóa học của chính mình
    const isInstructor = course.instructorId === userId;
    if (isInstructor) {
      return {
        canReview: false,
        reason: 'Giảng viên không thể đánh giá khóa học của chính mình',
        isEnrolled: false,
        progressPercent: null,
        isInstructor: true,
        hasReviewed: false,
        existingReviewId: null,
      };
    }

    // 2. Học viên phải sở hữu khóa học hợp lệ (có enrollment active)
    const enrollment = await this.enrollmentRepository.findByUserAndCourse(userId, courseId);
    const isEnrolled = Boolean(enrollment && !enrollment.deletedAt);
    if (!isEnrolled) {
      return {
        canReview: false,
        reason: 'Bạn cần mua hoặc đăng ký khóa học để có thể đánh giá',
        isEnrolled: false,
        progressPercent: null,
        isInstructor: false,
        hasReviewed: false,
        existingReviewId: null,
      };
    }

    // 3. Kiểm tra đã có đánh giá hiện có hay chưa
    const existingReview = await this.reviewRepository.findByUserAndCourse(userId, courseId);
    const hasReviewed = Boolean(existingReview && !existingReview.deletedAt);
    if (hasReviewed && existingReview) {
      return {
        canReview: false,
        reason: 'Bạn đã đánh giá khóa học này rồi',
        isEnrolled: true,
        progressPercent: null,
        isInstructor: false,
        hasReviewed: true,
        existingReviewId: existingReview.id,
      };
    }

    // 4. Kiểm tra tiến độ học tập thực tế (> 20%)
    const progress = await this.learningProgressService.getProgress(userId, courseId);
    const progressPercent = progress?.progressPercent ?? 0;
    if (progressPercent <= 20) {
      return {
        canReview: false,
        reason: `Bạn cần hoàn thành hơn 20% khóa học để có thể đánh giá. Tiến độ hiện tại: ${progressPercent}%.`,
        isEnrolled: true,
        progressPercent,
        isInstructor: false,
        hasReviewed: false,
        existingReviewId: null,
      };
    }

    // 5. Thỏa mãn tất cả điều kiện
    return {
      canReview: true,
      reason: null,
      isEnrolled: true,
      progressPercent,
      isInstructor: false,
      hasReviewed: false,
      existingReviewId: null,
    };
  }

  async createReview(
    userId: string,
    courseId: string,
    dto: CreateReviewDto,
  ): Promise<IReview> {
    const eligibility = await this.checkEligibility(userId, courseId);
    if (!eligibility.canReview) {
      if (eligibility.hasReviewed) {
        throw new ConflictException(eligibility.reason || 'Bạn đã đánh giá khóa học này rồi');
      }
      throw new ForbiddenException(eligibility.reason || 'Bạn không đủ điều kiện để đánh giá khóa học');
    }

    try {
      return await this.reviewRepository.withTransaction(async (session) => {
        const created = await this.reviewRepository.create(
          {
            userId,
            courseId,
            rating: dto.rating,
            comment: dto.comment ?? null,
            createdById: userId,
            updatedById: userId,
          },
          session,
        );

        // Tự động tính toán lại thống kê và cập nhật Course
        const stats = await this.reviewRepository.calculateCourseReviewStats(courseId, session);
        await this.courseRepository.updateRatingStats(
          courseId,
          stats.averageRating,
          stats.totalReviews,
          session,
        );

        return created;
      });
    } catch (error: unknown) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('Bạn đã đánh giá khóa học này rồi');
      }
      throw error;
    }
  }

  async updateReview(
    userId: string,
    reviewId: string,
    dto: UpdateReviewDto,
  ): Promise<IReview> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review || review.deletedAt) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa đánh giá của người khác');
    }

    // Xác minh học viên vẫn sở hữu khóa học hợp lệ
    const enrollment = await this.enrollmentRepository.findByUserAndCourse(userId, review.courseId);
    if (!enrollment || enrollment.deletedAt) {
      throw new ForbiddenException('Bạn không còn quyền sở hữu khóa học này');
    }

    if (dto.rating === undefined && dto.comment === undefined) {
      return review;
    }

    return await this.reviewRepository.withTransaction(async (session) => {
      const updatePayload: Partial<IReview> = {
        updatedById: userId,
      };
      if (dto.rating !== undefined) updatePayload.rating = dto.rating;
      if (dto.comment !== undefined) updatePayload.comment = dto.comment;

      const updated = await this.reviewRepository.update(reviewId, updatePayload, session);
      if (!updated) {
        throw new NotFoundException('Không tìm thấy đánh giá để cập nhật');
      }

      // Tự động tính toán lại thống kê và cập nhật Course
      const stats = await this.reviewRepository.calculateCourseReviewStats(review.courseId, session);
      await this.courseRepository.updateRatingStats(
        review.courseId,
        stats.averageRating,
        stats.totalReviews,
        session,
      );

      return updated;
    });
  }

  async deleteReview(userId: string, reviewId: string): Promise<boolean> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review || review.deletedAt) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa đánh giá của người khác');
    }

    return await this.reviewRepository.withTransaction(async (session) => {
      const deleted = await this.reviewRepository.softDelete(reviewId, userId, session);
      if (!deleted) return false;

      // Tự động tính toán lại thống kê và cập nhật Course sau khi xóa mềm
      const stats = await this.reviewRepository.calculateCourseReviewStats(review.courseId, session);
      await this.courseRepository.updateRatingStats(
        review.courseId,
        stats.averageRating,
        stats.totalReviews,
        session,
      );

      return true;
    });
  }

  async getMyReview(userId: string, courseId: string): Promise<IReview | null> {
    return this.reviewRepository.findByUserAndCourse(userId, courseId);
  }

  async getCourseReviews(
    courseId: string,
    query: QueryReviewsDto,
  ): Promise<PaginationResult<IReview>> {
    return this.reviewRepository.findCourseReviews(
      courseId,
      query.page || 1,
      query.limit || 10,
    );
  }

  async getCourseStats(courseId: string): Promise<ICourseReviewStats> {
    return this.reviewRepository.calculateCourseReviewStats(courseId);
  }
}

