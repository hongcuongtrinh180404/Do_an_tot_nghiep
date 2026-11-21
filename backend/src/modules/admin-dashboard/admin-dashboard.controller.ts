import { Controller, Get, Query, Header } from '@nestjs/common';
import {
  ApiResponse,
} from '../base/index.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import {
  RoleEnum,
  type IAdminDashboardAggregateResponse,
  type IDashboardRevenueChartPoint,
  type IDashboardCoursePerformance,
} from 'share-lib';
import { AdminDashboardService } from './services/admin-dashboard.service.js';
import {
  AdminDashboardQueryDto,
  AdminCoursesPerformanceQueryDto,
} from './dto/admin-dashboard.dto.js';

@Controller('admin/dashboard')
@Roles(RoleEnum.ADMIN)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('aggregate')
  @Header('Cache-Control', 'no-store')
  async getAggregate(
    @Query() query: AdminDashboardQueryDto,
  ): Promise<ApiResponse<IAdminDashboardAggregateResponse>> {
    const data = await this.dashboardService.getAggregate(query);
    return ApiResponse.success(data, 'Lấy dữ liệu tổng quan quản trị thành công');
  }

  @Get('chart')
  @Header('Cache-Control', 'no-store')
  async getChart(
    @Query() query: AdminDashboardQueryDto,
  ): Promise<ApiResponse<IDashboardRevenueChartPoint[]>> {
    const chart = await this.dashboardService.getChart(query);
    return ApiResponse.success(chart, 'Lấy dữ liệu biểu đồ doanh thu thành công');
  }

  @Get('courses/performance')
  @Header('Cache-Control', 'no-store')
  async getCoursesPerformance(
    @Query() query: AdminCoursesPerformanceQueryDto,
  ): Promise<ApiResponse<IDashboardCoursePerformance[]>> {
    const courses = await this.dashboardService.getCoursesPerformance(query);
    return ApiResponse.success(courses, 'Lấy hiệu suất khóa học thành công');
  }
}
