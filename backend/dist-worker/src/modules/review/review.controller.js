var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus, } from '@nestjs/common';
import { RoleEnum, } from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ReviewService } from './services/review.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { QueryReviewsDto } from './dto/query-reviews.dto.js';
import { AdminQueryReviewsDto } from './dto/admin-query-reviews.dto.js';
import { HideReviewDto } from './dto/hide-review.dto.js';
import { RestoreReviewDto } from './dto/restore-review.dto.js';
import { AdminDeleteReviewDto } from './dto/admin-delete-review.dto.js';
import { ReportReviewDto } from './dto/report-review.dto.js';
import { InstructorQueryReviewsDto } from './dto/instructor-query-reviews.dto.js';
import { ReplyReviewDto } from './dto/reply-review.dto.js';
let ReviewController = class ReviewController {
    reviewService;
    constructor(reviewService) {
        this.reviewService = reviewService;
    }
    async adminGetStats() {
        const stats = await this.reviewService.adminGetStats();
        return ApiResponse.success(stats, 'Lấy thống kê đánh giá quản trị thành công');
    }
    async adminGetReviews(query) {
        const result = await this.reviewService.adminGetReviews(query);
        return ApiResponse.success(result, 'Lấy danh sách đánh giá quản trị thành công');
    }
    async adminGetReviewDetail(id) {
        const review = await this.reviewService.adminGetReviewDetail(id);
        return ApiResponse.success(review, 'Lấy chi tiết đánh giá thành công');
    }
    async adminReplyToReview(id, adminId, dto) {
        const review = await this.reviewService.adminReplyToReview(adminId, id, dto);
        return ApiResponse.success(review, 'Gửi phản hồi từ ban quản trị thành công');
    }
    async adminHideReview(id, adminId, dto) {
        const review = await this.reviewService.adminHideReview(adminId, id, dto);
        return ApiResponse.success(review, 'Ẩn đánh giá vi phạm thành công');
    }
    async adminRestoreReview(id, adminId, dto) {
        const review = await this.reviewService.adminRestoreReview(adminId, id, dto);
        return ApiResponse.success(review, 'Khôi phục hiển thị đánh giá thành công');
    }
    async adminDeleteReview(id, adminId, dto) {
        const success = await this.reviewService.adminDeleteReview(adminId, id, dto);
        return ApiResponse.success({ success }, 'Xóa mềm đánh giá vi phạm thành công');
    }
    async adminDismissReports(id, adminId) {
        const review = await this.reviewService.adminDismissReports(adminId, id);
        return ApiResponse.success(review, 'Bỏ qua báo cáo vi phạm thành công');
    }
    async getCourseStats(courseId) {
        const stats = await this.reviewService.getCourseStats(courseId);
        return ApiResponse.success(stats, 'Lấy thống kê đánh giá thành công');
    }
    async getCourseReviews(courseId, query) {
        const result = await this.reviewService.getCourseReviews(courseId, query);
        return ApiResponse.success(result, 'Lấy danh sách đánh giá thành công');
    }
    async checkEligibility(courseId, userId) {
        const eligibility = await this.reviewService.checkEligibility(userId, courseId);
        return ApiResponse.success(eligibility, 'Kiểm tra điều kiện đánh giá thành công');
    }
    async getMyReview(courseId, userId) {
        const review = await this.reviewService.getMyReview(userId, courseId);
        return ApiResponse.success(review, 'Lấy đánh giá của tôi thành công');
    }
    async createReview(courseId, userId, dto) {
        const review = await this.reviewService.createReview(userId, courseId, dto);
        return ApiResponse.success(review, 'Gửi đánh giá khóa học thành công');
    }
    async reportReview(id, userId, dto) {
        const review = await this.reviewService.reportReview(userId, id, dto);
        return ApiResponse.success(review, 'Gửi báo cáo vi phạm thành công');
    }
    async updateReview(id, userId, dto) {
        const updated = await this.reviewService.updateReview(userId, id, dto);
        return ApiResponse.success(updated, 'Cập nhật đánh giá thành công');
    }
    async deleteReview(id, userId) {
        const success = await this.reviewService.deleteReview(userId, id);
        return ApiResponse.success({ success }, 'Xóa đánh giá thành công');
    }
    async getInstructorStats(instructorId, courseId) {
        const stats = await this.reviewService.getInstructorStats(instructorId, courseId);
        return ApiResponse.success(stats, 'Lấy thống kê đánh giá giảng viên thành công');
    }
    async getInstructorReviews(instructorId, query) {
        const result = await this.reviewService.getInstructorReviews(instructorId, query);
        return ApiResponse.success(result, 'Lấy danh sách đánh giá giảng viên thành công');
    }
    async replyToReview(id, instructorId, dto) {
        const review = await this.reviewService.replyToReview(instructorId, id, dto);
        return ApiResponse.success(review, 'Gửi phản hồi đánh giá thành công');
    }
    async deleteInstructorReply(id, instructorId) {
        const review = await this.reviewService.deleteInstructorReply(instructorId, id);
        return ApiResponse.success(review, 'Xóa phản hồi đánh giá thành công');
    }
};
__decorate([
    Get('admin/stats'),
    Roles(RoleEnum.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "adminGetStats", null);
__decorate([
    Get('admin'),
    Roles(RoleEnum.ADMIN),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AdminQueryReviewsDto]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "adminGetReviews", null);
__decorate([
    Get('admin/:id'),
    Roles(RoleEnum.ADMIN),
    __param(0, Param('id', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "adminGetReviewDetail", null);
__decorate([
    Post('admin/:id/reply'),
    Roles(RoleEnum.ADMIN),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, ReplyReviewDto]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "adminReplyToReview", null);
__decorate([
    Patch('admin/:id/hide'),
    Roles(RoleEnum.ADMIN),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, HideReviewDto]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "adminHideReview", null);
__decorate([
    Patch('admin/:id/restore'),
    Roles(RoleEnum.ADMIN),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, RestoreReviewDto]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "adminRestoreReview", null);
__decorate([
    Delete('admin/:id'),
    Roles(RoleEnum.ADMIN),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, AdminDeleteReviewDto]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "adminDeleteReview", null);
__decorate([
    Patch('admin/:id/dismiss-reports'),
    Roles(RoleEnum.ADMIN),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "adminDismissReports", null);
__decorate([
    Get('courses/:courseId/stats'),
    Public(),
    __param(0, Param('courseId', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "getCourseStats", null);
__decorate([
    Get('courses/:courseId'),
    Public(),
    __param(0, Param('courseId', ParseObjectIdPipe)),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, QueryReviewsDto]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "getCourseReviews", null);
__decorate([
    Get('courses/:courseId/eligibility'),
    Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, Param('courseId', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "checkEligibility", null);
__decorate([
    Get('courses/:courseId/my-review'),
    Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, Param('courseId', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "getMyReview", null);
__decorate([
    Post('courses/:courseId'),
    HttpCode(HttpStatus.CREATED),
    Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, Param('courseId', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, CreateReviewDto]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "createReview", null);
__decorate([
    Post(':id/report'),
    Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, ReportReviewDto]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "reportReview", null);
__decorate([
    Patch(':id'),
    Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, UpdateReviewDto]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "updateReview", null);
__decorate([
    Delete(':id'),
    Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "deleteReview", null);
__decorate([
    Get('instructor/stats'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, CurrentUser('id')),
    __param(1, Query('courseId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "getInstructorStats", null);
__decorate([
    Get('instructor'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, CurrentUser('id')),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, InstructorQueryReviewsDto]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "getInstructorReviews", null);
__decorate([
    Post(':id/reply'),
    Roles(RoleEnum.INSTRUCTOR),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, ReplyReviewDto]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "replyToReview", null);
__decorate([
    Delete(':id/reply'),
    Roles(RoleEnum.INSTRUCTOR),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ReviewController.prototype, "deleteInstructorReply", null);
ReviewController = __decorate([
    Controller('reviews'),
    __metadata("design:paramtypes", [ReviewService])
], ReviewController);
export { ReviewController };
//# sourceMappingURL=review.controller.js.map