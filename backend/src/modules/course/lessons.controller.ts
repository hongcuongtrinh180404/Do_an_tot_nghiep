import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ILesson, RoleEnum } from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { LessonService } from './services/lesson.service.js';
import { LessonFileValidationPipe } from './pipes/lesson-file-validation.pipe.js';

@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonService: LessonService) {}

  @Get(':id')
  @Public()
  async getLessonDetail(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<ApiResponse<ILesson>> {
    const lesson = await this.lessonService.getLessonById(id);
    return ApiResponse.success(lesson, 'Lấy thông tin bài học thành công');
  }

  @Post(':id/materials')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadMaterial(
    @Param('id', ParseObjectIdPipe) id: string,
    @UploadedFile(LessonFileValidationPipe) file: Express.Multer.File,
    @Body('title') title?: string,
    @CurrentUser('id') userId?: string,
    @CurrentUser('role') userRole?: RoleEnum,
  ): Promise<ApiResponse<ILesson>> {
    const updatedLesson = await this.lessonService.addMaterial(
      id,
      file,
      title,
      userId,
      userRole,
    );
    return ApiResponse.success(updatedLesson, 'Đính kèm tài liệu thành công');
  }

  @Delete(':id/materials/:materialId')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteMaterial(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('materialId', ParseObjectIdPipe) materialId: string,
    @CurrentUser('id') userId?: string,
    @CurrentUser('role') userRole?: RoleEnum,
  ): Promise<ApiResponse<ILesson>> {
    const updatedLesson = await this.lessonService.deleteMaterial(
      id,
      materialId,
      userId,
      userRole,
    );
    return ApiResponse.success(updatedLesson, 'Xóa tài liệu thành công');
  }

  @Delete(':id')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteLesson(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('id') userId?: string,
    @CurrentUser('role') userRole?: RoleEnum,
  ): Promise<ApiResponse<null>> {
    await this.lessonService.deleteLesson(id, userId, userRole);
    return ApiResponse.success(null, 'Xóa bài học thành công');
  }
}
