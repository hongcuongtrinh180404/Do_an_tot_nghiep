import {
  Controller,
  Post,
  Get,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ILessonContent, RoleEnum } from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { StorageService } from '../storage/index.js';
import { LessonFileValidationPipe } from './pipes/lesson-file-validation.pipe.js';

@Controller('lesson-content')
export class LessonContentController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadContent(
    @UploadedFile(LessonFileValidationPipe) file: Express.Multer.File,
  ): Promise<ApiResponse<ILessonContent>> {
    const lessonContent = await this.storageService.uploadLessonMedia(
      file,
      'courses/lessons',
    );
    return ApiResponse.success(lessonContent, 'Tải lên nội dung bài học thành công');
  }

  @Get('stream-url')
  @Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getStreamUrl(
    @Query('key') key?: string,
  ): Promise<ApiResponse<{ url: string }>> {
    const trimmedKey = typeof key === 'string' ? key.trim() : '';
    if (!trimmedKey) {
      throw new BadRequestException('Khóa file (key) không được để trống');
    }

    const streamUrl = await this.storageService.getPresignedStreamUrl(trimmedKey);
    return ApiResponse.success(
      { url: streamUrl },
      'Tạo đường dẫn phát video thành công',
    );
  }
}
