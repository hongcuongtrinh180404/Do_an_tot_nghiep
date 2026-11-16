import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  IReview,
  ICourseReviewStats,
  IReviewEligibility,
  RoleEnum,
  IAdminReviewStats,
} from 'share-lib';
import { ApiResponse, ParseObjectIdPipe, PaginationResult } from '../base/index.js';
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

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // =========================================================================
  // 1. ADMIN MODERATION ENDPOINTS (@Roles(RoleEnum.ADMIN))
  // =========================================================================

  @Get('admin/stats')
  @Roles(RoleEnum.ADMIN)
  async adminGetStats(): Promise<ApiResponse<IAdminReviewStats>> {
    const stats = await this.reviewService.adminGetStats();
    return ApiResponse.success(stats, 'Lấy thống kê đánh giá quản trị thành công');
  }

  @Get('admin')
  @Roles(RoleEnum.ADMIN)
  async adminGetReviews(
    @Query() query: AdminQueryReviewsDto,
  ): Promise<ApiResponse<PaginationResult<IReview>>> {
    const result = await this.reviewService.adminGetReviews(query);
    return ApiResponse.success(result, 'Lấy danh sách đánh giá quản trị thành công');
  }

  @Get('admin/:id')
  @Roles(RoleEnum.ADMIN)
  async adminGetReviewDetail(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<ApiResponse<IReview>> {
    const review = await this.reviewService.adminGetReviewDetail(id);
    return ApiResponse.success(review, 'Lấy chi tiết đánh giá thành công');
  }

  @Patch('admin/:id/hide')
  @Roles(RoleEnum.ADMIN)
  async adminHideReview(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: HideReviewDto,
  ): Promise<ApiResponse<IReview>> {
    const review = await this.reviewService.adminHideReview(adminId, id, dto);
    return ApiResponse.success(review, 'Ẩn đánh giá vi phạm thành công');
  }

  @Patch('admin/:id/restore')
  @Roles(RoleEnum.ADMIN)
  async adminRestoreReview(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: RestoreReviewDto,
  ): Promise<ApiResponse<IReview>> {
    const review = await this.reviewService.adminRestoreReview(adminId, id, dto);
    return ApiResponse.success(review, 'Khôi phục hiển thị đánh giá thành công');
  }

  @Delete('admin/:id')
  @Roles(RoleEnum.ADMIN)
  async adminDeleteReview(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: AdminDeleteReviewDto,
  ): Promise<ApiResponse<{ success: boolean }>> {
    const success = await this.reviewService.adminDeleteReview(adminId, id, dto);
    return ApiResponse.success({ success }, 'Xóa mềm đánh giá vi phạm thành công');
  }

  @Patch('admin/:id/dismiss-reports')
  @Roles(RoleEnum.ADMIN)
  async adminDismissReports(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') adminId: string,
  ): Promise<ApiResponse<IReview>> {
    const review = await this.reviewService.adminDismissReports(adminId, id);
    return ApiResponse.success(review, 'Bỏ qua báo cáo vi phạm thành công');
  }

  // =========================================================================
  // 2. PUBLIC & STUDENT ENDPOINTS
  // =========================================================================

  @Get('courses/:courseId/stats')
  @Public()
  async getCourseStats(
    @Param('courseId', ParseObjectIdPipe) courseId: string,
  ): Promise<ApiResponse<ICourseReviewStats>> {
    const stats = await this.reviewService.getCourseStats(courseId);
    return ApiResponse.success(stats, 'Lấy thống kê đánh giá thành công');
  }

  @Get('courses/:courseId')
  @Public()
  async getCourseReviews(
    @Param('courseId', ParseObjectIdPipe) courseId: string,
    @Query() query: QueryReviewsDto,
  ): Promise<ApiResponse<PaginationResult<IReview>>> {
    const result = await this.reviewService.getCourseReviews(courseId, query);
    return ApiResponse.success(result, 'Lấy danh sách đánh giá thành công');
  }

  @Get('courses/:courseId/eligibility')
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async checkEligibility(
    @Param('courseId', ParseObjectIdPipe) courseId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponse<IReviewEligibility>> {
    const eligibility = await this.reviewService.checkEligibility(userId, courseId);
    return ApiResponse.success(eligibility, 'Kiểm tra điều kiện đánh giá thành công');
  }

  @Get('courses/:courseId/my-review')
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async getMyReview(
    @Param('courseId', ParseObjectIdPipe) courseId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponse<IReview | null>> {
    const review = await this.reviewService.getMyReview(userId, courseId);
    return ApiResponse.success(review, 'Lấy đánh giá của tôi thành công');
  }

  @Post('courses/:courseId')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async createReview(
    @Param('courseId', ParseObjectIdPipe) courseId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReviewDto,
  ): Promise<ApiResponse<IReview>> {
    const review = await this.reviewService.createReview(userId, courseId, dto);
    return ApiResponse.success(review, 'Gửi đánh giá khóa học thành công');
  }

  @Post(':id/report')
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async reportReview(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReportReviewDto,
  ): Promise<ApiResponse<IReview>> {
    const review = await this.reviewService.reportReview(userId, id, dto);
    return ApiResponse.success(review, 'Gửi báo cáo vi phạm thành công');
  }

  @Patch(':id')
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async updateReview(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateReviewDto,
  ): Promise<ApiResponse<IReview>> {
    const updated = await this.reviewService.updateReview(userId, id, dto);
    return ApiResponse.success(updated, 'Cập nhật đánh giá thành công');
  }

  @Delete(':id')
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async deleteReview(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponse<{ success: boolean }>> {
    const success = await this.reviewService.deleteReview(userId, id);
    return ApiResponse.success({ success }, 'Xóa đánh giá thành công');
  }

  // =========================================================================
  // 3. INSTRUCTOR ENDPOINTS (@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN))
  // =========================================================================

  @Get('instructor/stats')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async getInstructorStats(
    @CurrentUser('id') instructorId: string,
    @Query('courseId') courseId?: string,
  ): Promise<ApiResponse<ICourseReviewStats>> {
    const stats = await this.reviewService.getInstructorStats(instructorId, courseId);
    return ApiResponse.success(stats, 'Lấy thống kê đánh giá giảng viên thành công');
  }

  @Get('instructor')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async getInstructorReviews(
    @CurrentUser('id') instructorId: string,
    @Query() query: InstructorQueryReviewsDto,
  ): Promise<ApiResponse<PaginationResult<IReview>>> {
    const result = await this.reviewService.getInstructorReviews(instructorId, query);
    return ApiResponse.success(result, 'Lấy danh sách đánh giá giảng viên thành công');
  }

  @Post(':id/reply')
  @Roles(RoleEnum.INSTRUCTOR)
  async replyToReview(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') instructorId: string,
    @Body() dto: ReplyReviewDto,
  ): Promise<ApiResponse<IReview>> {
    const review = await this.reviewService.replyToReview(instructorId, id, dto);
    return ApiResponse.success(review, 'Gửi phản hồi đánh giá thành công');
  }

  @Delete(':id/reply')
  @Roles(RoleEnum.INSTRUCTOR)
  async deleteInstructorReply(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') instructorId: string,
  ): Promise<ApiResponse<IReview>> {
    const review = await this.reviewService.deleteInstructorReply(instructorId, id);
    return ApiResponse.success(review, 'Xóa phản hồi đánh giá thành công');
  }
}
