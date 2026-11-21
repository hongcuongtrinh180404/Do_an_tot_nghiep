import { CourseLevelEnum, CourseStatusEnum } from 'share-lib';
export declare class UpdateCourseDto {
    title?: string;
    slug?: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    trailerUrl?: string | null;
    price?: number;
    originalPrice?: number | null;
    level?: CourseLevelEnum;
    status?: CourseStatusEnum;
    categoryId?: string | null;
}
