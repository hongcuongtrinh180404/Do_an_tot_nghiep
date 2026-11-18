import {
  Controller,
  Get,
  Patch,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  RoleEnum,
  type IInstructorApplication,
  type IInstructorTerm,
  type IAdminInstructorApplicationsStats,
} from 'share-lib';
import { ApiResponse, PaginationResult } from '../base/index.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { InstructorApplicationService } from './services/instructor-application.service.js';
import { QueryInstructorApplicationsDto } from './dto/query-instructor-applications.dto.js';
import { RejectInstructorApplicationDto } from './dto/reject-instructor-application.dto.js';
import { UpdateInstructorTermsDto } from './dto/update-instructor-terms.dto.js';

@Controller('admin/instructor-applications')
@Roles(RoleEnum.ADMIN)
export class InstructorApplicationController {
  constructor(
    private readonly instructorApplicationService: InstructorApplicationService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getApplications(
    @Query() query: QueryInstructorApplicationsDto,
  ): Promise<ApiResponse<PaginationResult<IInstructorApplication>>> {
    const result = await this.instructorApplicationService.getApplications(query);
    return ApiResponse.success(result, 'Lấy danh sách hồ sơ ứng viên thành công');
  }

  @Get('stats/pending-count')
  @HttpCode(HttpStatus.OK)
  async getPendingCount(): Promise<ApiResponse<{ pendingCount: number }>> {
    const result = await this.instructorApplicationService.getPendingCount();
    return ApiResponse.success(result, 'Lấy số lượng hồ sơ chờ duyệt thành công');
  }

  @Get('stats/overview')
  @HttpCode(HttpStatus.OK)
  async getStats(): Promise<ApiResponse<IAdminInstructorApplicationsStats>> {
    const result = await this.instructorApplicationService.getStats();
    return ApiResponse.success(result, 'Lấy thống kê hồ sơ thành công');
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getApplicationDetail(
    @Param('id') id: string,
  ): Promise<ApiResponse<IInstructorApplication>> {
    const result = await this.instructorApplicationService.getApplicationDetail(id);
    return ApiResponse.success(result, 'Lấy chi tiết hồ sơ thành công');
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approveApplication(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('fullName') adminName: string,
  ): Promise<ApiResponse<IInstructorApplication>> {
    const result = await this.instructorApplicationService.approveApplication(
      id,
      adminId,
      adminName || 'Quản trị viên',
    );
    return ApiResponse.success(result, 'Phê duyệt hồ sơ giảng viên thành công');
  }

  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectApplication(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @CurrentUser('fullName') adminName: string,
    @Body() dto: RejectInstructorApplicationDto,
  ): Promise<ApiResponse<IInstructorApplication>> {
    const result = await this.instructorApplicationService.rejectApplication(
      id,
      adminId,
      adminName || 'Quản trị viên',
      dto.rejectionReason,
    );
    return ApiResponse.success(result, 'Từ chối hồ sơ giảng viên thành công');
  }
}

@Controller('admin/instructor-terms')
@Roles(RoleEnum.ADMIN)
export class InstructorTermsController {
  constructor(
    private readonly instructorApplicationService: InstructorApplicationService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getTerms(): Promise<ApiResponse<IInstructorTerm[]>> {
    const result = await this.instructorApplicationService.getTerms();
    return ApiResponse.success(result, 'Lấy danh sách điều khoản giảng viên thành công');
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  async updateTerms(
    @Body() dto: UpdateInstructorTermsDto,
  ): Promise<ApiResponse<IInstructorTerm[]>> {
    const result = await this.instructorApplicationService.updateTerms(dto);
    return ApiResponse.success(result, 'Cập nhật danh sách điều khoản thành công');
  }
}
