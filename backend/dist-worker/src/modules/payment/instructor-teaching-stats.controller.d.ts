import { ApiResponse, PaginationResult } from '../base/index.js';
import { type ITeachingStatsOverview, type IInstructorCourseRevenue } from 'share-lib';
import { RevenueService } from './services/revenue.service.js';
import { RevenueTimeRangeQueryDto } from './dto/revenue.dto.js';
import { InstructorCoursesRevenueQueryDto } from './dto/instructor-teaching-stats.dto.js';
export declare class InstructorTeachingStatsController {
    private readonly revenueService;
    constructor(revenueService: RevenueService);
    getOverview(instructorId: string, query: RevenueTimeRangeQueryDto): Promise<ApiResponse<ITeachingStatsOverview>>;
    getCourses(instructorId: string, query: InstructorCoursesRevenueQueryDto): Promise<ApiResponse<PaginationResult<IInstructorCourseRevenue>>>;
}
