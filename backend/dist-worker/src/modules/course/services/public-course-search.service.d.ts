import type { PublicCourseSearchFilters, PublicCourseSearchResult } from '../interfaces/public-course-search.interface.js';
import { PublicCourseSearchRepository } from '../repositories/public-course-search.repository.js';
export declare class PublicCourseSearchService {
    private readonly repository;
    constructor(repository: PublicCourseSearchRepository);
    search(filters: PublicCourseSearchFilters): Promise<PublicCourseSearchResult>;
}
