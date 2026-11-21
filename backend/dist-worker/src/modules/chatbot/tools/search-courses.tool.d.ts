import { PublicCourseSearchService } from '../../course/services/public-course-search.service.js';
import type { PublicCourseSearchResult } from '../../course/interfaces/public-course-search.interface.js';
import { type ChatbotSearchContext } from './search-courses.context.js';
export declare class SearchCoursesTool {
    private readonly searchService;
    readonly definition: import("openai/resources/index.mjs").ChatCompletionFunctionTool;
    constructor(searchService: PublicCourseSearchService);
    execute(rawArguments: string, signal?: AbortSignal, context?: ChatbotSearchContext): Promise<PublicCourseSearchResult>;
}
