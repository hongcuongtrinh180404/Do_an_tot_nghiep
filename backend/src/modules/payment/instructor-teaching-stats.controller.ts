import {
  Controller,
  Get,
  Query,
  Header,
  UnprocessableEntityException,
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
import { InstructorRevenueDataError } from './utils/instructor-revenue.pipeline.js';

function rethrowTeachingStatsError(error: unknown): never {
  if (error instanceof InstructorRevenueDataError) {
    throw new UnprocessableEntityException({
      statusCode: 422,
      code: 'INSTRUCTOR_REVENUE_DATA_INCOMPLETE',
      reason: error.reason,
      message: error.reason === 'missing_payment_date'
        ? 'Có đơn hàng thiếu ngày thanh toán đã xác thực. Vui lòng liên hệ quản trị viên để đối soát trước khi xem báo cáo theo ngày.'
        : 'Dữ liệu thu nhập hoặc hoa hồng của một số đơn hàng chưa đầy đủ. Vui lòng liên hệ quản trị viên để đối soát.',
    });
  }
  throw error;
}

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
    try {
      const overview = await this.revenueService.getInstructorTeachingOverview(
        instructorId,
        query,
      );
      return ApiResponse.success(overview, 'Lấy dữ liệu tổng quan thống kê giảng dạy thành công');
    } catch (error) {
      rethrowTeachingStatsError(error);
    }
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
    try {
      const result = await this.revenueService.getInstructorCoursesStats(
        instructorId,
        query,
      );
      return ApiResponse.success(result, 'Lấy danh sách doanh thu theo khóa học thành công');
    } catch (error) {
      rethrowTeachingStatsError(error);
    }
  }
}
