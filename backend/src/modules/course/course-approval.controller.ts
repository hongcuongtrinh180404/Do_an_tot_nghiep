import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { type ICourse, type ICourseApprovalChecklist, RoleEnum } from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CourseApprovalService } from './services/course-approval.service.js';

@Controller('courses')
@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
export class CourseApprovalController {
  constructor(private readonly approvalService: CourseApprovalService) {}

  @Get(':id/approval-checklist')
  async getChecklist(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: RoleEnum,
  ): Promise<ApiResponse<ICourseApprovalChecklist>> {
    return ApiResponse.success(await this.approvalService.getChecklist(id, userId, role));
  }

  @Post(':id/request-approval')
  @HttpCode(HttpStatus.OK)
  async requestApproval(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: RoleEnum,
  ): Promise<ApiResponse<ICourse>> {
    return ApiResponse.success(
      await this.approvalService.requestApproval(id, userId, role),
      'Đã gửi yêu cầu phê duyệt khóa học.',
    );
  }

  @Post(':id/cancel-approval')
  @HttpCode(HttpStatus.OK)
  async cancelApproval(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: RoleEnum,
  ): Promise<ApiResponse<ICourse>> {
    return ApiResponse.success(
      await this.approvalService.withdrawApproval(id, userId, role),
      'Đã hủy yêu cầu phê duyệt khóa học thành công.',
    );
  }

  @Post(':id/withdraw-approval')
  @HttpCode(HttpStatus.OK)
  async withdrawApproval(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: RoleEnum,
  ): Promise<ApiResponse<ICourse>> {
    return ApiResponse.success(
      await this.approvalService.withdrawApproval(id, userId, role),
      'Đã rút yêu cầu phê duyệt khóa học thành công.',
    );
  }
}
