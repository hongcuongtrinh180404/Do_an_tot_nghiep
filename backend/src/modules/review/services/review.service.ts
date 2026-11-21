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
  ReviewStatusEnum,
  IAdminReviewStats,
  IInstructorReviewReply,
  IAdminReviewReply,
} from 'share-lib';
import { BaseService, isDuplicateKeyError, PaginationResult } from '../../base/index.js';
import { ReviewRepository } from '../repositories/review.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { LearningProgressService } from '../../learning-progress/services/learning-progress.service.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { CreateReviewDto } from '../dto/create-review.dto.js';
import { UpdateReviewDto } from '../dto/update-review.dto.js';
import { QueryReviewsDto } from '../dto/query-reviews.dto.js';
import { AdminQueryReviewsDto } from '../dto/admin-query-reviews.dto.js';
import { HideReviewDto } from '../dto/hide-review.dto.js';
import { RestoreReviewDto } from '../dto/restore-review.dto.js';
import { AdminDeleteReviewDto } from '../dto/admin-delete-review.dto.js';
import { ReportReviewDto } from '../dto/report-review.dto.js';
import { InstructorQueryReviewsDto } from '../dto/instructor-query-reviews.dto.js';
import { ReplyReviewDto } from '../dto/reply-review.dto.js';

@Injectable()
export class ReviewService extends BaseService<IReview, string> {
  constructor(
    protected readonly reviewRepository: ReviewRepository,
    protected readonly courseRepository: CourseRepository,
    protected readonly enrollmentRepository: EnrollmentRepository,
    protected readonly learningProgressService: LearningProgressService,
    protected readonly userRepository: UserRepository,
    cls: ClsService,
  ) {
    super(reviewRepository, cls, ReviewService.name);
  }

  // =========================================================================
  // 1. PUBLIC & STUDENT METHODS
  // =========================================================================

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
            status: ReviewStatusEnum.VISIBLE,
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

    // Admin không được tự ý sửa nội dung hoặc thay đổi số sao của học viên
    if (review.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa nội dung hoặc số sao đánh giá của người khác');
    }

    // Đánh giá đang bị ẩn thì học viên bị khóa, không được chỉnh sửa
    if (review.status === ReviewStatusEnum.HIDDEN) {
      throw new ForbiddenException('Đánh giá của bạn đã bị Quản trị viên ẩn do vi phạm quy tắc cộng đồng và đang bị khóa chỉnh sửa.');
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
    // Học viên vẫn xem được đánh giá của mình kể cả khi bị ẩn (status === 'hidden')
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

  async reportReview(
    userId: string,
    reviewId: string,
    dto: ReportReviewDto,
  ): Promise<IReview> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review || review.deletedAt) {
      throw new NotFoundException('Không tìm thấy đánh giá để báo cáo');
    }

    if (review.userId === userId) {
      throw new BadRequestException('Bạn không thể tự báo cáo đánh giá của chính mình');
    }

    const reportingUser = await this.userRepository.findById(userId);
    const userName = reportingUser?.fullName || 'Người dùng ẩn danh';

    const updated = await this.reviewRepository.addReportEntry(reviewId, {
      userId,
      userName,
      reason: dto.reason,
      createdAt: new Date(),
    });

    if (!updated) {
      throw new NotFoundException('Không thể cập nhật báo cáo cho đánh giá');
    }

    return updated;
  }

  // =========================================================================
  // 2. ADMIN MODERATION METHODS
  // =========================================================================

  async adminGetReviews(dto: AdminQueryReviewsDto): Promise<PaginationResult<IReview>> {
    return this.reviewRepository.findAdminReviews(dto);
  }

  async adminGetStats(): Promise<IAdminReviewStats> {
    return this.reviewRepository.getAdminStats();
  }

  async adminGetReviewDetail(id: string): Promise<IReview> {
    const review = await this.reviewRepository.findReviewByIdWithDetails(id);
    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }
    return review;
  }

  async adminReplyToReview(
    adminId: string,
    reviewId: string,
    dto: ReplyReviewDto,
  ): Promise<IReview> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review || review.deletedAt || review.status === ReviewStatusEnum.DELETED) {
      throw new NotFoundException('Không tìm thấy đánh giá để phản hồi');
    }
    if (review.status !== ReviewStatusEnum.VISIBLE) {
      throw new ForbiddenException('Chỉ có thể phản hồi đánh giá đang hiển thị công khai');
    }

    const course = await this.courseRepository.findById(review.courseId);
    if (!course || course.deletedAt) {
      throw new NotFoundException('Không tìm thấy khóa học của đánh giá');
    }

    const admin = await this.userRepository.findById(adminId);
    const adminName = admin?.fullName || 'Quản trị viên';
    const existingReply = review.adminReply;
    const now = new Date();
    const reply: IAdminReviewReply = {
      content: dto.reply,
      adminId: existingReply?.adminId ?? adminId,
      adminName: existingReply ? existingReply.adminName ?? null : adminName,
      repliedAt: existingReply ? new Date(existingReply.repliedAt) : now,
      updatedAt: existingReply ? now : null,
      updatedById: existingReply ? adminId : null,
      updatedByName: existingReply ? adminName : null,
    };

    const updated = await this.reviewRepository.setAdminReply(reviewId, reply);
    if (!updated) {
      throw new ConflictException(
        'Đánh giá không còn hiển thị công khai. Vui lòng tải lại trước khi phản hồi.',
      );
    }
    return updated;
  }

  async adminHideReview(
    adminId: string,
    reviewId: string,
    dto: HideReviewDto,
  ): Promise<IReview> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    if (review.deletedAt || review.status === ReviewStatusEnum.DELETED) {
      throw new BadRequestException('Đánh giá này đã bị xóa mềm, không thể thực hiện ẩn');
    }

    const adminUser = await this.userRepository.findById(adminId);
    const adminName = adminUser?.fullName || 'Quản trị viên';

    return await this.reviewRepository.withTransaction(async (session) => {
      const updated = await this.reviewRepository.addModerationEntry(
        reviewId,
        {
          action: 'HIDE',
          adminId,
          adminName,
          reason: dto.reason,
          createdAt: new Date(),
        },
        {
          status: ReviewStatusEnum.HIDDEN,
          hideReason: dto.reason,
          updatedById: adminId,
        },
        session,
      );

      if (!updated) {
        throw new NotFoundException('Không thể cập nhật trạng thái ẩn cho đánh giá');
      }

      // Đánh giá bị ẩn không được tính vào điểm trung bình và tổng số đánh giá công khai
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

  async adminRestoreReview(
    adminId: string,
    reviewId: string,
    dto: RestoreReviewDto,
  ): Promise<IReview> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    const adminUser = await this.userRepository.findById(adminId);
    const adminName = adminUser?.fullName || 'Quản trị viên';
    const reason = dto.reason || 'Khôi phục hiển thị đánh giá công khai';

    return await this.reviewRepository.withTransaction(async (session) => {
      const updated = await this.reviewRepository.addModerationEntry(
        reviewId,
        {
          action: 'RESTORE',
          adminId,
          adminName,
          reason,
          createdAt: new Date(),
        },
        {
          status: ReviewStatusEnum.VISIBLE,
          hideReason: null,
          deletedAt: null,
          updatedById: adminId,
        },
        session,
      );

      if (!updated) {
        throw new NotFoundException('Không thể cập nhật trạng thái khôi phục cho đánh giá');
      }

      // Điểm trung bình và tổng số đánh giá được tính toán lại
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

  async adminDeleteReview(
    adminId: string,
    reviewId: string,
    dto: AdminDeleteReviewDto,
  ): Promise<boolean> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    const adminUser = await this.userRepository.findById(adminId);
    const adminName = adminUser?.fullName || 'Quản trị viên';
    const reason = dto.reason || 'Admin xóa mềm đánh giá vi phạm';

    return await this.reviewRepository.withTransaction(async (session) => {
      const updated = await this.reviewRepository.addModerationEntry(
        reviewId,
        {
          action: 'DELETE',
          adminId,
          adminName,
          reason,
          createdAt: new Date(),
        },
        {
          status: ReviewStatusEnum.DELETED,
          deletedAt: new Date(),
          updatedById: adminId,
        },
        session,
      );

      if (!updated) {
        return false;
      }

      // Tính toán lại thống kê sau khi xóa
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

  async adminDismissReports(
    adminId: string,
    reviewId: string,
  ): Promise<IReview> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    const adminUser = await this.userRepository.findById(adminId);
    const adminName = adminUser?.fullName || 'Quản trị viên';

    const dismissed = await this.reviewRepository.dismissReports(reviewId);
    if (!dismissed) {
      throw new NotFoundException('Không thể bỏ qua báo cáo cho đánh giá này');
    }

    // Ghi nhận vào lịch sử kiểm duyệt
    const withEntry = await this.reviewRepository.addModerationEntry(
      reviewId,
      {
        action: 'RESTORE',
        adminId,
        adminName,
        reason: 'Quản trị viên xem xét và bỏ qua các báo cáo vi phạm',
        createdAt: new Date(),
      },
      {},
    );

    return withEntry || dismissed;
  }

  // =========================================================================
  // 3. INSTRUCTOR METHODS
  // =========================================================================

  async getInstructorStats(
    instructorId: string,
    courseId?: string,
  ): Promise<ICourseReviewStats> {
    return this.reviewRepository.calculateInstructorReviewStats(instructorId, courseId);
  }

  async getInstructorReviews(
    instructorId: string,
    query: InstructorQueryReviewsDto,
  ): Promise<PaginationResult<IReview>> {
    return this.reviewRepository.findInstructorReviews(instructorId, query);
  }

  async replyToReview(
    instructorId: string,
    reviewId: string,
    dto: ReplyReviewDto,
  ): Promise<IReview> {
    const review = await this.getReplyableInstructorReview(instructorId, reviewId);
    const instructor = await this.userRepository.findById(instructorId);
    const now = new Date();

    const reply: IInstructorReviewReply = {
      content: dto.reply,
      instructorId,
      instructorName: instructor?.fullName ?? null,
      repliedAt: review.instructorReply ? new Date(review.instructorReply.repliedAt) : now,
      updatedAt: review.instructorReply ? now : null,
    };

    const updated = await this.reviewRepository.setInstructorReply(reviewId, reply);
    if (!updated) {
      throw new NotFoundException('Không tìm thấy đánh giá để phản hồi');
    }

    return updated;
  }

  async deleteInstructorReply(instructorId: string, reviewId: string): Promise<IReview> {
    const review = await this.getReplyableInstructorReview(instructorId, reviewId);

    if (!review.instructorReply) {
      throw new BadRequestException('Đánh giá này chưa có phản hồi để xóa');
    }

    const updated = await this.reviewRepository.clearInstructorReply(reviewId);
    if (!updated) {
      throw new NotFoundException('Không tìm thấy đánh giá để xóa phản hồi');
    }

    return updated;
  }

  private async getReplyableInstructorReview(
    instructorId: string,
    reviewId: string,
  ): Promise<IReview> {
    const review = await this.reviewRepository.findById(reviewId);
    if (!review || review.deletedAt) {
      throw new NotFoundException('Không tìm thấy đánh giá');
    }

    const course = await this.courseRepository.findById(review.courseId);
    if (!course || course.deletedAt) {
      throw new NotFoundException('Không tìm thấy khóa học của đánh giá');
    }

    if (course.instructorId !== instructorId) {
      throw new ForbiddenException(
        'Bạn chỉ có thể phản hồi đánh giá thuộc khóa học của chính mình',
      );
    }

    if (review.status !== ReviewStatusEnum.VISIBLE) {
      throw new ForbiddenException('Không thể phản hồi đánh giá đã bị ẩn hoặc xóa');
    }

    return review;
  }
}
