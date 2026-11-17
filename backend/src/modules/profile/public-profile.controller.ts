import { Controller, Get, Param, Query } from '@nestjs/common';
import type { IPublicProfileCourses } from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { ProfileCoursesDto } from './dto/profile-courses.dto.js';
import { PublicProfileService } from './public-profile.service.js';

@Controller('users/public')
export class PublicProfileController {
  constructor(private readonly profiles: PublicProfileService) {}

  @Get(':username/courses')
  @Public()
  async getCourses(
    @Param('username') username: string,
    @Query() query: ProfileCoursesDto,
  ): Promise<ApiResponse<IPublicProfileCourses>> {
    return ApiResponse.success(
      await this.profiles.getCourses(username, query), 'Lấy khóa học hồ sơ thành công',
    );
  }
}
