import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ILesson, RoleEnum } from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { LessonService } from './services/lesson.service.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';

@Controller('sections')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Post(':sectionId/lessons')
  @HttpCode(HttpStatus.CREATED)
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async createLesson(
    @Param('sectionId', ParseObjectIdPipe) sectionId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateLessonDto,
  ): Promise<ApiResponse<ILesson>> {
    const lesson = await this.lessonService.createLesson(sectionId, {
      title: dto.title,
      description: dto.description,
      order: dto.order,
      content: dto.content
        ? {
            type: dto.content.type,
            url: dto.content.url,
            publicId: dto.content.publicId,
            fileName: dto.content.fileName,
            fileSize: dto.content.fileSize,
            mimeType: dto.content.mimeType,
            duration: dto.content.duration,
          }
        : null,
      isPreview: dto.isPreview ?? false,
      userId,
    });
    return ApiResponse.success(lesson, 'Tạo bài học thành công');
  }

  @Get(':sectionId/lessons')
  @Public()
  async getLessons(
    @Param('sectionId', ParseObjectIdPipe) sectionId: string,
  ): Promise<ApiResponse<ILesson[]>> {
    const lessons = await this.lessonService.getLessonsBySectionId(sectionId);
    return ApiResponse.success(lessons, 'Lấy danh sách bài học thành công');
  }
}

