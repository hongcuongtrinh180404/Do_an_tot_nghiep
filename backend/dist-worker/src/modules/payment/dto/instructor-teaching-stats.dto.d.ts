import { RevenueTimeRangeQueryDto } from './revenue.dto.js';
export declare class InstructorCoursesRevenueQueryDto extends RevenueTimeRangeQueryDto {
    search?: string;
    sort?: string;
    page: number;
    limit: number;
}
