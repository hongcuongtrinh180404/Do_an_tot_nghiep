import { ClsService } from 'nestjs-cls';
import { ICourseMindmap, RoleEnum } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { CourseMindmapRepository } from '../repositories/course-mindmap.repository.js';
import { CourseRepository } from '../repositories/course.repository.js';
export declare class CourseMindmapService extends BaseService<ICourseMindmap, string> {
    protected readonly courseMindmapRepository: CourseMindmapRepository;
    protected readonly courseRepository: CourseRepository;
    constructor(courseMindmapRepository: CourseMindmapRepository, courseRepository: CourseRepository, cls: ClsService);
    getMindmapByCourseId(courseId: string): Promise<Record<string, unknown> | null>;
    findMindmapEntity(courseId: string): Promise<ICourseMindmap | null>;
    upsertMindmap(courseId: string, mindmapData: Record<string, unknown>, userId: string, userRole: RoleEnum): Promise<ICourseMindmap>;
}
