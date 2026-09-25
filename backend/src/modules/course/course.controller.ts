import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ICourse, RoleEnum } from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CourseService } from './services/course.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';

@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Get('my-courses')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async getMyCourses(
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponse<ICourse[]>> {
    const courses = await this.courseService.findByInstructorId(userId);
    return ApiResponse.success(courses, 'Lấy danh sách khóa học thành công');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCourseDto,
  ): Promise<ApiResponse<ICourse>> {
    const course = await this.courseService.createCourse({
      title: dto.title,
      slug: dto.slug,
      shortDescription: dto.shortDescription,
      description: dto.description,
      thumbnailUrl: dto.thumbnailUrl,
      price: dto.price,
      level: dto.level,
      instructorId: userId,
    });
    return ApiResponse.success(course, 'Tạo khóa học thành công');
  }
}
