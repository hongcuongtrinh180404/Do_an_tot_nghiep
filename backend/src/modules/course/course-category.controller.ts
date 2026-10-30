import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ICourseCategory, RoleEnum } from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CourseCategoryService } from './services/course-category.service.js';
import { CreateCourseCategoryDto } from './dto/create-course-category.dto.js';
import { UpdateCourseCategoryDto } from './dto/update-course-category.dto.js';
import { QueryCourseCategoriesDto } from './dto/query-course-categories.dto.js';
import { CourseCategoryImageValidationPipe } from './pipes/course-category-image-validation.pipe.js';

@Controller('course-categories')
export class CourseCategoryController {
  constructor(private readonly courseCategoryService: CourseCategoryService) {}

  @Get()
  @Public()
  async getPublic(): Promise<ApiResponse<ICourseCategory[]>> {
    const categories = await this.courseCategoryService.getPublicCategories();
    return ApiResponse.success(categories, 'Lấy danh sách danh mục thành công');
  }

  @Get('admin')
  @Roles(RoleEnum.ADMIN)
  async getAdmin(
    @Query() query: QueryCourseCategoriesDto,
  ): Promise<ApiResponse<ICourseCategory[]>> {
    const categories = await this.courseCategoryService.getAdminCategories(query);
    return ApiResponse.success(categories, 'Lấy danh sách danh mục thành công');
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(RoleEnum.ADMIN)
  async create(
    @Body() dto: CreateCourseCategoryDto,
  ): Promise<ApiResponse<ICourseCategory>> {
    const category = await this.courseCategoryService.createCategory(dto);
    return ApiResponse.success(category, 'Tạo danh mục thành công');
  }

  @Patch(':id')
  @Roles(RoleEnum.ADMIN)
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateCourseCategoryDto,
  ): Promise<ApiResponse<ICourseCategory>> {
    const category = await this.courseCategoryService.updateCategory(id, dto);
    return ApiResponse.success(category, 'Cập nhật danh mục thành công');
  }

  @Patch(':id/image')
  @Roles(RoleEnum.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('id', ParseObjectIdPipe) id: string,
    @UploadedFile(CourseCategoryImageValidationPipe) file: Express.Multer.File,
  ): Promise<ApiResponse<ICourseCategory>> {
    const category = await this.courseCategoryService.uploadImage(id, file);
    return ApiResponse.success(category, 'Cập nhật ảnh danh mục thành công');
  }

  @Delete(':id')
  @Roles(RoleEnum.ADMIN)
  async remove(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<ApiResponse<null>> {
    await this.courseCategoryService.deleteCategory(id);
    return ApiResponse.success(null, 'Xóa danh mục thành công');
  }
}
