import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ICourse, ISection, RoleEnum } from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { CourseService } from './services/course.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { CreateSectionDto } from './dto/create-section.dto.js';
import { UpdateSectionDto } from './dto/update-section.dto.js';
import { ReorderSectionsDto } from './dto/reorder-sections.dto.js';
import { CourseImageValidationPipe } from './pipes/course-image-validation.pipe.js';
import { CourseTrailerValidationPipe } from './pipes/course-trailer-validation.pipe.js';

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

  @Get(':id')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async getDetail(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: RoleEnum,
  ): Promise<ApiResponse<ICourse>> {
    const course = await this.courseService.getCourseDetailForInstructor(
      id,
      userId,
      role,
    );
    return ApiResponse.success(course, 'Lấy chi tiết khóa học thành công');
  }

  @Patch(':id')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: RoleEnum,
    @Body() dto: UpdateCourseDto,
  ): Promise<ApiResponse<ICourse>> {
    const course = await this.courseService.updateCourse(id, dto, userId, role);
    return ApiResponse.success(course, 'Cập nhật khóa học thành công');
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

  @Post(':courseId/sections')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async createSection(
    @Param('courseId', ParseObjectIdPipe) courseId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: RoleEnum,
    @Body() dto: CreateSectionDto,
  ): Promise<ApiResponse<ISection>> {
    const section = await this.courseService.createSection(courseId, dto, userId, role);
    return ApiResponse.success(section, 'Tạo chương học thành công');
  }

  @Patch(':courseId/sections/:sectionId')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async updateSection(
    @Param('courseId', ParseObjectIdPipe) courseId: string,
    @Param('sectionId', ParseObjectIdPipe) sectionId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: RoleEnum,
    @Body() dto: UpdateSectionDto,
  ): Promise<ApiResponse<ISection>> {
    const section = await this.courseService.updateSection(
      courseId,
      sectionId,
      dto,
      userId,
      role,
    );
    return ApiResponse.success(section, 'Cập nhật chương học thành công');
  }

  @Put(':courseId/sections/reorder')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async reorderSections(
    @Param('courseId', ParseObjectIdPipe) courseId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: RoleEnum,
    @Body() dto: ReorderSectionsDto,
  ): Promise<ApiResponse<ISection[]>> {
    const sections = await this.courseService.reorderSections(
      courseId,
      dto,
      userId,
      role,
    );
    return ApiResponse.success(sections, 'Cập nhật thứ tự chương học thành công');
  }

  @Get(':courseId/sections')
  @Public()
  async getSections(
    @Param('courseId', ParseObjectIdPipe) courseId: string,
  ): Promise<ApiResponse<ISection[]>> {
    const sections = await this.courseService.getSectionsByCourseId(courseId);
    return ApiResponse.success(sections, 'Lấy danh sách chương học thành công');
  }

  @Patch(':courseId/thumbnail')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadThumbnail(
    @Param('courseId', ParseObjectIdPipe) courseId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: RoleEnum,
    @UploadedFile(CourseImageValidationPipe) file: Express.Multer.File,
  ): Promise<ApiResponse<ICourse>> {
    const course = await this.courseService.updateCourseThumbnail(
      courseId,
      userId,
      role,
      file,
    );
    return ApiResponse.success(course, 'Cập nhật ảnh bìa khóa học thành công');
  }

  @Patch(':courseId/trailer')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadTrailer(
    @Param('courseId', ParseObjectIdPipe) courseId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: RoleEnum,
    @UploadedFile(CourseTrailerValidationPipe) file: Express.Multer.File,
  ): Promise<ApiResponse<ICourse>> {
    const course = await this.courseService.updateCourseTrailer(
      courseId,
      userId,
      role,
      file,
    );
    return ApiResponse.success(course, 'Cập nhật video trailer khóa học thành công');
  }
}
