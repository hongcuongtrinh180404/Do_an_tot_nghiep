import { ICourseMindmap, RoleEnum } from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { CourseMindmapService } from './services/course-mindmap.service.js';
import { UpsertCourseMindmapDto } from './dto/upsert-course-mindmap.dto.js';
export declare class CourseMindmapController {
    private readonly courseMindmapService;
    constructor(courseMindmapService: CourseMindmapService);
    getMindmap(courseId: string): Promise<ApiResponse<Record<string, unknown> | null>>;
    upsertMindmap(courseId: string, userId: string, role: RoleEnum, dto: UpsertCourseMindmapDto): Promise<ApiResponse<ICourseMindmap>>;
}
