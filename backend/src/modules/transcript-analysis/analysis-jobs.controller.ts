import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RoleEnum, type IUserProfile, IJob } from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AnalysisJobService } from './services/analysis-job.service.js';

@Controller('lessons')
export class AnalysisJobsController {
  constructor(private readonly analysisJobService: AnalysisJobService) {}

  /**
   * Lấy danh sách Job của bài học (cho phép truy cập cả khi PENDING_APPROVAL)
   */
  @Get(':id/analysis/jobs')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async getLessonJobs(
    @Param('id', ParseObjectIdPipe) lessonId: string,
    @CurrentUser() user: Pick<IUserProfile, 'id' | 'role'>,
    @Query('limit') limit?: number,
  ): Promise<ApiResponse<IJob[]>> {
    const jobs = await this.analysisJobService.getRecentJobs(
      lessonId,
      user,
      limit ? Number(limit) : 10,
    );
    return ApiResponse.success(jobs, 'Lấy danh sách tác vụ thành công');
  }

  /**
   * Xem chi tiết trạng thái của một Job cụ thể
   */
  @Get(':id/analysis/jobs/:jobId')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async getJobDetail(
    @Param('id', ParseObjectIdPipe) lessonId: string,
    @Param('jobId', ParseObjectIdPipe) jobId: string,
    @CurrentUser() user: Pick<IUserProfile, 'id' | 'role'>,
  ): Promise<ApiResponse<IJob>> {
    const job = await this.analysisJobService.getJobById(lessonId, jobId, user);
    return ApiResponse.success(job, 'Lấy thông tin tác vụ thành công');
  }

  /**
   * Thử lại thủ công một Job đã thất bại
   */
  @Post(':id/analysis/jobs/:jobId/retry')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async retryJob(
    @Param('id', ParseObjectIdPipe) lessonId: string,
    @Param('jobId', ParseObjectIdPipe) jobId: string,
    @CurrentUser() user: Pick<IUserProfile, 'id' | 'role'>,
  ): Promise<ApiResponse<IJob>> {
    const newJob = await this.analysisJobService.retryJob(lessonId, jobId, user);
    return ApiResponse.success(newJob, 'Đã tiếp nhận yêu cầu thử lại tác vụ');
  }
}
