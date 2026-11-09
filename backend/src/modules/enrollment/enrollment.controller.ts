import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ICourse, IEnrollment, RoleEnum } from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { EnrollmentService } from './services/enrollment.service.js';
import { RegisterFreeCourseDto } from './dto/register-free-course.dto.js';

@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get('my-courses')
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async getMyCourses(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: RoleEnum,
  ): Promise<ApiResponse<ICourse[]>> {
    const courses = await this.enrollmentService.getMyPurchasedCourses(userId, role);
    return ApiResponse.success(courses, 'Lấy danh sách khóa học đã mua thành công');
  }

  @Get('check/:courseId')
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async checkEnrollment(
    @Param('courseId', ParseObjectIdPipe) courseId: string,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponse<{ isEnrolled: boolean }>> {
    const isEnrolled = await this.enrollmentService.checkEnrollment(userId, courseId);
    return ApiResponse.success({ isEnrolled }, 'Kiểm tra trạng thái sở hữu thành công');
  }

  @Post('register-free')
  @HttpCode(HttpStatus.OK)
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async registerFreeCourse(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterFreeCourseDto,
  ): Promise<ApiResponse<IEnrollment>> {
    const result = await this.enrollmentService.registerFreeCourse(userId, dto.courseId);
    return ApiResponse.success(result, 'Đăng ký khóa học miễn phí thành công');
  }
}
