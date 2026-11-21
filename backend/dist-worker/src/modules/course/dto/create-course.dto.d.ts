import { CourseLevelEnum } from 'share-lib';
export declare class CreateCourseDto {
    title: string;
    slug?: string;
    description?: string;
    thumbnailUrl?: string;
    price?: number;
    level?: CourseLevelEnum;
    categoryId?: string;
}
