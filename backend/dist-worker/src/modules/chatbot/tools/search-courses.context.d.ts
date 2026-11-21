import type { PublicCourseSearchFilters } from '../../course/interfaces/public-course-search.interface.js';
export interface ChatbotSearchContext {
    filters: PublicCourseSearchFilters;
    lowestPrice: number | null;
    hasMore: boolean;
}
export declare class ChatbotFollowUpError extends Error {
    readonly reason: 'missing_context' | 'no_more' | 'no_price' | 'already_free';
    constructor(reason: 'missing_context' | 'no_more' | 'no_price' | 'already_free');
}
export declare function resolveSearchCoursesArguments(raw: string, previous?: ChatbotSearchContext): PublicCourseSearchFilters;
