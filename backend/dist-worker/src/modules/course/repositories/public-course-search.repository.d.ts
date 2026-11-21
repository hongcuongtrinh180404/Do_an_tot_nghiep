import { Model } from 'mongoose';
import type { PublicCourseSearchFilters, PublicCourseSearchItem } from '../interfaces/public-course-search.interface.js';
import { CourseEntity } from '../schemas/course.schema.js';
import { CourseCategoryEntity } from '../schemas/course-category.schema.js';
export declare const PUBLIC_COURSE_SEARCH_TIMEOUT_MS = 3000;
export declare class PublicCourseSearchRepository {
    private readonly courses;
    private readonly categories;
    constructor(courses: Model<CourseEntity>, categories: Model<CourseCategoryEntity>);
    search(filters: PublicCourseSearchFilters): Promise<{
        items: PublicCourseSearchItem[];
        total: number;
    }>;
}
