import { Controller, Get, Header, Param, UnprocessableEntityException } from '@nestjs/common';
import { RoleEnum, type IAdminUserEnrolledCourse, type IAdminUserTeaching } from 'share-lib';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { InstructorRevenueDataError } from '../payment/utils/instructor-revenue.pipeline.js';
import { AdminUserCoursesService } from './services/admin-user-courses.service.js';

@Controller('users')
@Roles(RoleEnum.ADMIN)
export class AdminUserCoursesController {
  constructor(private readonly service: AdminUserCoursesService) {}

  @Get(':id/enrolled-courses')
  @Header('Cache-Control', 'no-store')
  async getEnrolledCourses(
    @Param('id', ParseObjectIdPipe) userId: string,
  ): Promise<ApiResponse<IAdminUserEnrolledCourse[]>> {
    return ApiResponse.success(await this.service.getEnrolledCourses(userId), 'Lấy khóa học đã đăng ký thành công');
  }

  @Get(':id/teaching')
  @Header('Cache-Control', 'no-store')
  async getTeaching(
    @Param('id', ParseObjectIdPipe) userId: string,
  ): Promise<ApiResponse<IAdminUserTeaching>> {
    try {
      return ApiResponse.success(await this.service.getTeaching(userId), 'Lấy số liệu giảng dạy thành công');
    } catch (error) {
      if (error instanceof InstructorRevenueDataError) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          code: 'INSTRUCTOR_REVENUE_DATA_INCOMPLETE',
          reason: error.reason,
          message: 'Dữ liệu doanh thu hoặc hoa hồng của tài khoản chưa đầy đủ. Cần đối soát đơn hàng trước khi hiển thị thống kê.',
        });
      }
      throw error;
    }
  }
}
