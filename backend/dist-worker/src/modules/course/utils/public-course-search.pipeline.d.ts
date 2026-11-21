import type { PipelineStage } from 'mongoose';
import type { PublicCourseSearchFilters } from '../interfaces/public-course-search.interface.js';
export declare function publicCourseDescriptionText(html: string): string;
export declare function courseTopicPattern(terms: readonly string[]): string;
export declare function publicCourseSearchPipeline(filters: PublicCourseSearchFilters, categoryCollection: string): PipelineStage[];
