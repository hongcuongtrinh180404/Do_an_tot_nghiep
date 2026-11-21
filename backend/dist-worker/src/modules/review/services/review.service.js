var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ReviewService_1;
import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException, } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ReviewStatusEnum, } from 'share-lib';
import { BaseService, isDuplicateKeyError } from '../../base/index.js';
import { ReviewRepository } from '../repositories/review.repository.js';
import { CourseRepository } from '../../course/repositories/course.repository.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';
import { LearningProgressService } from '../../learning-progress/services/learning-progress.service.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
let ReviewService = ReviewService_1 = class ReviewService extends BaseService {
    reviewRepository;
    courseRepository;
    enrollmentRepository;
    learningProgressService;
    userRepository;
    constructor(reviewRepository, courseRepository, enrollmentRepository, learningProgressService, userRepository, cls) {
        super(reviewRepository, cls, ReviewService_1.name);
        this.reviewRepository = reviewRepository;
        this.courseRepository = courseRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.learningProgressService = learningProgressService;
        this.userRepository = userRepository;
    }
    async checkEligibility(userId, courseId) {
        const course = await this.courseRepository.findById(courseId);
        if (!course || course.deletedAt) {
            throw new NotFoundException('Không tìm thấy khóa học');
        }
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
    async createReview(userId, courseId, dto) {
        const eligibility = await this.checkEligibility(userId, courseId);
        if (!eligibility.canReview) {
            if (eligibility.hasReviewed) {
                throw new ConflictException(eligibility.reason || 'Bạn đã đánh giá khóa học này rồi');
            }
            throw new ForbiddenException(eligibility.reason || 'Bạn không đủ điều kiện để đánh giá khóa học');
        }
        try {
            return await this.reviewRepository.withTransaction(async (session) => {
                const created = await this.reviewRepository.create({
                    userId,
                    courseId,
                    rating: dto.rating,
                    comment: dto.comment ?? null,
                    status: ReviewStatusEnum.VISIBLE,
                    createdById: userId,
                    updatedById: userId,
                }, session);
                const stats = await this.reviewRepository.calculateCourseReviewStats(courseId, session);
                await this.courseRepository.updateRatingStats(courseId, stats.averageRating, stats.totalReviews, session);
                return created;
            });
        }
        catch (error) {
            if (isDuplicateKeyError(error)) {
                throw new ConflictException('Bạn đã đánh giá khóa học này rồi');
            }
            throw error;
        }
    }
    async updateReview(userId, reviewId, dto) {
        const review = await this.reviewRepository.findById(reviewId);
        if (!review || review.deletedAt) {
            throw new NotFoundException('Không tìm thấy đánh giá');
        }
        if (review.userId !== userId) {
            throw new ForbiddenException('Bạn không có quyền chỉnh sửa nội dung hoặc số sao đánh giá của người khác');
        }
        if (review.status === ReviewStatusEnum.HIDDEN) {
            throw new ForbiddenException('Đánh giá của bạn đã bị Quản trị viên ẩn do vi phạm quy tắc cộng đồng và đang bị khóa chỉnh sửa.');
        }
        const enrollment = await this.enrollmentRepository.findByUserAndCourse(userId, review.courseId);
        if (!enrollment || enrollment.deletedAt) {
            throw new ForbiddenException('Bạn không còn quyền sở hữu khóa học này');
        }
        if (dto.rating === undefined && dto.comment === undefined) {
            return review;
        }
        return await this.reviewRepository.withTransaction(async (session) => {
            const updatePayload = {
                updatedById: userId,
            };
            if (dto.rating !== undefined)
                updatePayload.rating = dto.rating;
            if (dto.comment !== undefined)
                updatePayload.comment = dto.comment;
            const updated = await this.reviewRepository.update(reviewId, updatePayload, session);
            if (!updated) {
                throw new NotFoundException('Không tìm thấy đánh giá để cập nhật');
            }
            const stats = await this.reviewRepository.calculateCourseReviewStats(review.courseId, session);
            await this.courseRepository.updateRatingStats(review.courseId, stats.averageRating, stats.totalReviews, session);
            return updated;
        });
    }
    async deleteReview(userId, reviewId) {
        const review = await this.reviewRepository.findById(reviewId);
        if (!review || review.deletedAt) {
            throw new NotFoundException('Không tìm thấy đánh giá');
        }
        if (review.userId !== userId) {
            throw new ForbiddenException('Bạn không có quyền xóa đánh giá của người khác');
        }
        return await this.reviewRepository.withTransaction(async (session) => {
            const deleted = await this.reviewRepository.softDelete(reviewId, userId, session);
            if (!deleted)
                return false;
            const stats = await this.reviewRepository.calculateCourseReviewStats(review.courseId, session);
            await this.courseRepository.updateRatingStats(review.courseId, stats.averageRating, stats.totalReviews, session);
            return true;
        });
    }
    async getMyReview(userId, courseId) {
        return this.reviewRepository.findByUserAndCourse(userId, courseId);
    }
    async getCourseReviews(courseId, query) {
        return this.reviewRepository.findCourseReviews(courseId, query.page || 1, query.limit || 10);
    }
    async getCourseStats(courseId) {
        return this.reviewRepository.calculateCourseReviewStats(courseId);
    }
    async reportReview(userId, reviewId, dto) {
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
    async adminGetReviews(dto) {
        return this.reviewRepository.findAdminReviews(dto);
    }
    async adminGetStats() {
        return this.reviewRepository.getAdminStats();
    }
    async adminGetReviewDetail(id) {
        const review = await this.reviewRepository.findReviewByIdWithDetails(id);
        if (!review) {
            throw new NotFoundException('Không tìm thấy đánh giá');
        }
        return review;
    }
    async adminReplyToReview(adminId, reviewId, dto) {
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
        const reply = {
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
            throw new ConflictException('Đánh giá không còn hiển thị công khai. Vui lòng tải lại trước khi phản hồi.');
        }
        return updated;
    }
    async adminHideReview(adminId, reviewId, dto) {
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
            const updated = await this.reviewRepository.addModerationEntry(reviewId, {
                action: 'HIDE',
                adminId,
                adminName,
                reason: dto.reason,
                createdAt: new Date(),
            }, {
                status: ReviewStatusEnum.HIDDEN,
                hideReason: dto.reason,
                updatedById: adminId,
            }, session);
            if (!updated) {
                throw new NotFoundException('Không thể cập nhật trạng thái ẩn cho đánh giá');
            }
            const stats = await this.reviewRepository.calculateCourseReviewStats(review.courseId, session);
            await this.courseRepository.updateRatingStats(review.courseId, stats.averageRating, stats.totalReviews, session);
            return updated;
        });
    }
    async adminRestoreReview(adminId, reviewId, dto) {
        const review = await this.reviewRepository.findById(reviewId);
        if (!review) {
            throw new NotFoundException('Không tìm thấy đánh giá');
        }
        const adminUser = await this.userRepository.findById(adminId);
        const adminName = adminUser?.fullName || 'Quản trị viên';
        const reason = dto.reason || 'Khôi phục hiển thị đánh giá công khai';
        return await this.reviewRepository.withTransaction(async (session) => {
            const updated = await this.reviewRepository.addModerationEntry(reviewId, {
                action: 'RESTORE',
                adminId,
                adminName,
                reason,
                createdAt: new Date(),
            }, {
                status: ReviewStatusEnum.VISIBLE,
                hideReason: null,
                deletedAt: null,
                updatedById: adminId,
            }, session);
            if (!updated) {
                throw new NotFoundException('Không thể cập nhật trạng thái khôi phục cho đánh giá');
            }
            const stats = await this.reviewRepository.calculateCourseReviewStats(review.courseId, session);
            await this.courseRepository.updateRatingStats(review.courseId, stats.averageRating, stats.totalReviews, session);
            return updated;
        });
    }
    async adminDeleteReview(adminId, reviewId, dto) {
        const review = await this.reviewRepository.findById(reviewId);
        if (!review) {
            throw new NotFoundException('Không tìm thấy đánh giá');
        }
        const adminUser = await this.userRepository.findById(adminId);
        const adminName = adminUser?.fullName || 'Quản trị viên';
        const reason = dto.reason || 'Admin xóa mềm đánh giá vi phạm';
        return await this.reviewRepository.withTransaction(async (session) => {
            const updated = await this.reviewRepository.addModerationEntry(reviewId, {
                action: 'DELETE',
                adminId,
                adminName,
                reason,
                createdAt: new Date(),
            }, {
                status: ReviewStatusEnum.DELETED,
                deletedAt: new Date(),
                updatedById: adminId,
            }, session);
            if (!updated) {
                return false;
            }
            const stats = await this.reviewRepository.calculateCourseReviewStats(review.courseId, session);
            await this.courseRepository.updateRatingStats(review.courseId, stats.averageRating, stats.totalReviews, session);
            return true;
        });
    }
    async adminDismissReports(adminId, reviewId) {
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
        const withEntry = await this.reviewRepository.addModerationEntry(reviewId, {
            action: 'RESTORE',
            adminId,
            adminName,
            reason: 'Quản trị viên xem xét và bỏ qua các báo cáo vi phạm',
            createdAt: new Date(),
        }, {});
        return withEntry || dismissed;
    }
    async getInstructorStats(instructorId, courseId) {
        return this.reviewRepository.calculateInstructorReviewStats(instructorId, courseId);
    }
    async getInstructorReviews(instructorId, query) {
        return this.reviewRepository.findInstructorReviews(instructorId, query);
    }
    async replyToReview(instructorId, reviewId, dto) {
        const review = await this.getReplyableInstructorReview(instructorId, reviewId);
        const instructor = await this.userRepository.findById(instructorId);
        const now = new Date();
        const reply = {
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
    async deleteInstructorReply(instructorId, reviewId) {
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
    async getReplyableInstructorReview(instructorId, reviewId) {
        const review = await this.reviewRepository.findById(reviewId);
        if (!review || review.deletedAt) {
            throw new NotFoundException('Không tìm thấy đánh giá');
        }
        const course = await this.courseRepository.findById(review.courseId);
        if (!course || course.deletedAt) {
            throw new NotFoundException('Không tìm thấy khóa học của đánh giá');
        }
        if (course.instructorId !== instructorId) {
            throw new ForbiddenException('Bạn chỉ có thể phản hồi đánh giá thuộc khóa học của chính mình');
        }
        if (review.status !== ReviewStatusEnum.VISIBLE) {
            throw new ForbiddenException('Không thể phản hồi đánh giá đã bị ẩn hoặc xóa');
        }
        return review;
    }
};
ReviewService = ReviewService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ReviewRepository,
        CourseRepository,
        EnrollmentRepository,
        LearningProgressService,
        UserRepository,
        ClsService])
], ReviewService);
export { ReviewService };
//# sourceMappingURL=review.service.js.map