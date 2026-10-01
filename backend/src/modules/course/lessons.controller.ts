import { Controller, Get, Param } from '@nestjs/common';
import { ILesson } from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { LessonService } from './services/lesson.service.js';

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
}
