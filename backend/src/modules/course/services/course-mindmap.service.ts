import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ICourseMindmap, RoleEnum } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { CourseMindmapRepository } from '../repositories/course-mindmap.repository.js';
import { CourseRepository } from '../repositories/course.repository.js';

@Injectable()
export class CourseMindmapService extends BaseService<ICourseMindmap, string> {
  constructor(
    protected readonly courseMindmapRepository: CourseMindmapRepository,
    protected readonly courseRepository: CourseRepository,
    cls: ClsService,
  ) {
    super(courseMindmapRepository, cls, CourseMindmapService.name);
  }

  async getMindmapByCourseId(courseId: string): Promise<Record<string, unknown> | null> {
    const course = await this.courseRepository.findById(courseId);
    if (!course || course.deletedAt) {
      throw new NotFoundException(`Khóa học với ID '${courseId}' không tồn tại`);
    }

    const mindmap = await this.courseMindmapRepository.findByCourseId(courseId);
    return mindmap ? mindmap.mindmapData : null;
  }

  async findMindmapEntity(courseId: string): Promise<ICourseMindmap | null> {
    const course = await this.courseRepository.findById(courseId);
    if (!course || course.deletedAt) {
      throw new NotFoundException(`Khóa học với ID '${courseId}' không tồn tại`);
    }

    return this.courseMindmapRepository.findByCourseId(courseId);
  }

  async upsertMindmap(
    courseId: string,
    mindmapData: Record<string, unknown>,
    userId: string,
    userRole: RoleEnum,
  ): Promise<ICourseMindmap> {
    const course = await this.courseRepository.findById(courseId);
    if (!course || course.deletedAt) {
      throw new NotFoundException(`Khóa học với ID '${courseId}' không tồn tại`);
    }

    const isOwner = course.instructorId === userId;
    const isAdmin = userRole === RoleEnum.ADMIN;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Bạn không có quyền cập nhật sơ đồ tư duy của khóa học này');
    }

    this.logger.log(`Upserting mindmap for courseId=${courseId} by userId=${userId}`);
    return this.courseMindmapRepository.upsertByCourseId(courseId, mindmapData, userId);
  }
}
