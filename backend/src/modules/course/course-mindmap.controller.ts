import {
  Controller,
  Get,
  Put,
  Body,
  Param,
} from '@nestjs/common';
import { ICourseMindmap, RoleEnum } from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { CourseMindmapService } from './services/course-mindmap.service.js';
import { UpsertCourseMindmapDto } from './dto/upsert-course-mindmap.dto.js';

@Controller('courses')
export class CourseMindmapController {
  constructor(private readonly courseMindmapService: CourseMindmapService) {}

  @Get(':courseId/mindmap')
  @Public()
  async getMindmap(
    @Param('courseId', ParseObjectIdPipe) courseId: string,
  ): Promise<ApiResponse<Record<string, unknown> | null>> {
    const mindmapData = await this.courseMindmapService.getMindmapByCourseId(courseId);
    return ApiResponse.success(mindmapData, 'Lấy sơ đồ tư duy khóa học thành công');
  }

  @Put(':courseId/mindmap')
  @Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN)
  async upsertMindmap(
    @Param('courseId', ParseObjectIdPipe) courseId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: RoleEnum,
    @Body() dto: UpsertCourseMindmapDto,
  ): Promise<ApiResponse<ICourseMindmap>> {
    const result = await this.courseMindmapService.upsertMindmap(
      courseId,
      dto.mindmapData,
      userId,
      role,
    );
    return ApiResponse.success(result, 'Cập nhật sơ đồ tư duy khóa học thành công');
  }
}
