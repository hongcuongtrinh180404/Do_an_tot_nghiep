import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ILessonQuiz, RoleEnum } from 'share-lib';
import { studentQuiz } from './utils/lesson-quiz-version.util.js';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { LessonQuizService } from './services/lesson-quiz.service.js';
import { SyncLessonQuizzesAtTimestampDto } from './dto/sync-lesson-quizzes.dto.js';
import { MoveMergeLessonQuizzesDto } from './dto/move-merge-lesson-quizzes.dto.js';
import { LessonManagementGuard } from './guards/lesson-management.guard.js';
import { SaveLessonQuizDto } from './dto/save-lesson-quiz.dto.js';

@Controller('lessons')
export class LessonQuizController {
  constructor(private readonly lessonQuizService: LessonQuizService) {}

  @Get(':id/quizzes')
  @Public()
  async getQuizzes(
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    const quizzes = await this.lessonQuizService.getQuizzesByLessonId(id);
    return ApiResponse.success(quizzes.map((quiz) => studentQuiz(quiz)), 'Lấy danh sách câu hỏi video thành công');
  }

  @Get(':id/quizzes/manage')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  @UseGuards(LessonManagementGuard)
  async getManagementQuizzes(@Param('id', ParseObjectIdPipe) id: string): Promise<ApiResponse<ILessonQuiz[]>> {
    return ApiResponse.success(await this.lessonQuizService.getQuizzesByLessonId(id));
  }

  @Post(':id/quizzes')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  @UseGuards(LessonManagementGuard)
  async createQuiz(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: SaveLessonQuizDto,
  ): Promise<ApiResponse<ILessonQuiz>> {
    const quiz = await this.lessonQuizService.createQuiz(id, dto);
    return ApiResponse.success(quiz, 'Thêm câu hỏi video thành công');
  }

  @Put('quizzes/:quizId')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  @UseGuards(LessonManagementGuard)
  async updateQuiz(
    @Param('quizId', ParseObjectIdPipe) quizId: string,
    @Body() dto: SaveLessonQuizDto,
  ): Promise<ApiResponse<ILessonQuiz>> {
    const quiz = await this.lessonQuizService.updateQuiz(quizId, dto);
    return ApiResponse.success(quiz, 'Cập nhật câu hỏi video thành công');
  }

  @Put(':id/quizzes/sync')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  @UseGuards(LessonManagementGuard)
  async syncQuizzes(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: SyncLessonQuizzesAtTimestampDto,
  ): Promise<ApiResponse<ILessonQuiz[]>> {
    const synced = await this.lessonQuizService.syncQuizzesAtTimestamp(id, dto);
    return ApiResponse.success(synced, 'Đồng bộ câu hỏi video thành công');
  }

  @Put(':id/quizzes/move-merge')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  @UseGuards(LessonManagementGuard)
  async moveOrMergeQuizzes(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: MoveMergeLessonQuizzesDto,
  ): Promise<ApiResponse<ILessonQuiz[]>> {
    const quizzes = await this.lessonQuizService.moveOrMergeQuizCluster(id, dto);
    return ApiResponse.success(quizzes, 'Cập nhật vị trí câu hỏi video thành công');
  }

  @Delete('quizzes/:quizId')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  @UseGuards(LessonManagementGuard)
  async deleteQuiz(
    @Param('quizId', ParseObjectIdPipe) quizId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    await this.lessonQuizService.deleteQuiz(quizId);
    return ApiResponse.success({ deleted: true }, 'Xóa câu hỏi video thành công');
  }

  @Delete(':id/quizzes/timestamp/:timestamp')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  @UseGuards(LessonManagementGuard)
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
