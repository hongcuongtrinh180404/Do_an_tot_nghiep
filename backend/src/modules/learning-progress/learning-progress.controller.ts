import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { RoleEnum } from 'share-lib';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { PlaybackHeartbeatDto, StartPlaybackSessionDto } from './dto/playback-session.dto.js';
import { LearningProgressService } from './services/learning-progress.service.js';

@Controller('learning-progress')
@Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
export class LearningProgressController {
  constructor(private readonly service: LearningProgressService) {}

  @Get('my-courses')
  async getMyProgress(@CurrentUser('id') userId: string) {
    return ApiResponse.success(await this.service.getMyProgress(userId));
  }

  @Get('courses/:courseId')
  async getProgress(@CurrentUser('id') userId: string, @Param('courseId', ParseObjectIdPipe) courseId: string) {
    return ApiResponse.success(await this.service.getProgress(userId, courseId));
  }

  @Post('courses/:courseId/sessions')
  @HttpCode(HttpStatus.OK)
  async startSession(@CurrentUser('id') userId: string, @Param('courseId', ParseObjectIdPipe) courseId: string, @Body() dto: StartPlaybackSessionDto) {
    return ApiResponse.success(await this.service.startSession(userId, courseId, dto));
  }

  @Post('courses/:courseId/heartbeat')
  @HttpCode(HttpStatus.OK)
  async heartbeat(@CurrentUser('id') userId: string, @Param('courseId', ParseObjectIdPipe) courseId: string, @Body() dto: PlaybackHeartbeatDto) {
    return ApiResponse.success(await this.service.heartbeat(userId, courseId, dto));
  }

  @Post('courses/:courseId/end')
  @HttpCode(HttpStatus.OK)
  async endSession(@CurrentUser('id') userId: string, @Param('courseId', ParseObjectIdPipe) courseId: string, @Body() dto: PlaybackHeartbeatDto) {
    return ApiResponse.success(await this.service.heartbeat(userId, courseId, dto, true));
  }
}
