import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ILessonContent, RoleEnum } from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CloudinaryService } from '../cloudinary/cloudinary.service.js';
import { LessonFileValidationPipe } from './pipes/lesson-file-validation.pipe.js';

@Controller('lesson-content')
@Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
export class LessonContentController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadContent(
    @UploadedFile(LessonFileValidationPipe) file: Express.Multer.File,
  ): Promise<ApiResponse<ILessonContent>> {
    const lessonContent = await this.cloudinaryService.uploadLessonMedia(
      file,
      'courses/lessons',
    );
    return ApiResponse.success(lessonContent, 'Tải lên nội dung bài học thành công');
  }
}
