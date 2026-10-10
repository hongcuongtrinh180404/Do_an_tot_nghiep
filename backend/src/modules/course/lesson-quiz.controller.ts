import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ILessonQuiz, RoleEnum } from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { LessonQuizService } from './services/lesson-quiz.service.js';
import { SyncLessonQuizzesAtTimestampDto } from './dto/sync-lesson-quizzes.dto.js';

@Controller('lessons')
export class LessonQuizController {
  constructor(private readonly lessonQuizService: LessonQuizService) {}

  @Get(':id/quizzes')
  @Public()
  async getQuizzes(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<ApiResponse<ILessonQuiz[]>> {
    const quizzes = await this.lessonQuizService.getQuizzesByLessonId(id);
    return ApiResponse.success(quizzes, 'Lấy danh sách câu hỏi video thành công');
  }

  @Put(':id/quizzes/sync')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.USER)
  async syncQuizzes(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: SyncLessonQuizzesAtTimestampDto,
  ): Promise<ApiResponse<ILessonQuiz[]>> {
    const synced = await this.lessonQuizService.syncQuizzesAtTimestamp(id, dto);
    return ApiResponse.success(synced, 'Đồng bộ câu hỏi video thành công');
  }

  @Delete('quizzes/:quizId')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async deleteQuiz(
    @Param('quizId', ParseObjectIdPipe) quizId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await this.lessonQuizService.deleteQuiz(quizId);
    return ApiResponse.success({ deleted: true }, 'Xóa câu hỏi video thành công');
  }

  @Delete(':id/quizzes/timestamp/:timestamp')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.USER)
  async deleteQuizzesAtTimestamp(
    @Param('id', ParseObjectIdPipe) id: string,
    @Param('timestamp') timestamp: string,
  ): Promise<ApiResponse<{ deletedCount: number }>> {
    const deletedCount = await this.lessonQuizService.deleteQuizzesAtTimestamp(
      id,
      Number(timestamp),
    );
    return ApiResponse.success({ deletedCount }, 'Xóa cụm câu hỏi video thành công');
  }
}
