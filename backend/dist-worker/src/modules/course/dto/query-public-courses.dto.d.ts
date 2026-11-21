import { CourseLevelEnum } from 'share-lib';
export declare class QueryPublicCoursesDto {
    q?: string;
    category?: string;
    level?: CourseLevelEnum;
    priceRange?: string;
    sort?: string;
    instructorId?: string;
    page: number;
    limit: number;
}
