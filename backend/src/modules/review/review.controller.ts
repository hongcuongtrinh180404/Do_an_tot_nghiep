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
} from 'share-lib';
import { ApiResponse, ParseObjectIdPipe, PaginationResult } from '../base/index.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ReviewService } from './services/review.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { QueryReviewsDto } from './dto/query-reviews.dto.js';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

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
}

