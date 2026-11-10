import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { RoleEnum } from 'share-lib';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { CompleteLessonVideoDto, SubmitLessonQuizAnswerDto } from './dto/lesson-completion.dto.js';
import { LessonCompletionService } from './services/lesson-completion.service.js';

@Controller('learning-progress/courses/:courseId/lessons')
@Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
export class LessonCompletionController {
  constructor(private readonly service: LessonCompletionService) {}

  @Get()
  async getLessons(@CurrentUser('id') userId: string, @Param('courseId', ParseObjectIdPipe) courseId: string) {
    return ApiResponse.success(await this.service.getLessons(userId, courseId));
  }

  @Get(':lessonId')
  async getLesson(@CurrentUser('id') userId: string, @Param('courseId', ParseObjectIdPipe) courseId: string, @Param('lessonId', ParseObjectIdPipe) lessonId: string) {
    return ApiResponse.success(await this.service.getLesson(userId, courseId, lessonId));
  }

  @Post(':lessonId/quiz-answers')
  @HttpCode(HttpStatus.OK)
  async submitAnswer(@CurrentUser('id') userId: string, @Param('courseId', ParseObjectIdPipe) courseId: string, @Param('lessonId', ParseObjectIdPipe) lessonId: string, @Body() dto: SubmitLessonQuizAnswerDto) {
    return ApiResponse.success(await this.service.submitAnswer(userId, courseId, lessonId, dto));
  }

  @Post(':lessonId/video-ended')
  @HttpCode(HttpStatus.OK)
  async videoEnded(@CurrentUser('id') userId: string, @Param('courseId', ParseObjectIdPipe) courseId: string, @Param('lessonId', ParseObjectIdPipe) lessonId: string, @Body() dto: CompleteLessonVideoDto) {
    return ApiResponse.success(await this.service.videoEnded(userId, courseId, lessonId, dto));
  }
}
