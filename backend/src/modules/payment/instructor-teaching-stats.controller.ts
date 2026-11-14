import {
  Controller,
  Get,
  Query,
  Header,
} from '@nestjs/common';
import { ApiResponse, PaginationResult } from '../base/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import {
  RoleEnum,
  type ITeachingStatsOverview,
  type IInstructorCourseRevenue,
} from 'share-lib';
import { RevenueService } from './services/revenue.service.js';
import { RevenueTimeRangeQueryDto } from './dto/revenue.dto.js';
import { InstructorCoursesRevenueQueryDto } from './dto/instructor-teaching-stats.dto.js';

@Controller('instructor/teaching-stats')
@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
export class InstructorTeachingStatsController {
  constructor(private readonly revenueService: RevenueService) {}

  /**
   * Lấy 4 thẻ thống kê tổng quan (Tổng doanh thu, Thu nhập sau hoa hồng, Lượt mua, Đánh giá trung bình)
   */
  @Get('overview')
  @Header('Cache-Control', 'no-store')
  async getOverview(
    @CurrentUser('id') instructorId: string,
    @Query() query: RevenueTimeRangeQueryDto,
  ): Promise<ApiResponse<ITeachingStatsOverview>> {
    const overview = await this.revenueService.getInstructorTeachingOverview(
      instructorId,
      query,
    );
    return ApiResponse.success(overview, 'Lấy dữ liệu tổng quan thống kê giảng dạy thành công');
  }

  /**
   * Lấy danh sách doanh thu theo từng khóa học của giảng viên
   */
  @Get('courses')
  @Header('Cache-Control', 'no-store')
  async getCourses(
    @CurrentUser('id') instructorId: string,
    @Query() query: InstructorCoursesRevenueQueryDto,
  ): Promise<ApiResponse<PaginationResult<IInstructorCourseRevenue>>> {
    const result = await this.revenueService.getInstructorCoursesStats(
      instructorId,
      query,
    );
    return ApiResponse.success(result, 'Lấy danh sách doanh thu theo khóa học thành công');
  }
}
