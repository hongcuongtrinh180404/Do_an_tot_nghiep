import type { PublicCourseSearchFilters } from '../../course/interfaces/public-course-search.interface.js';
import type { ChatbotToolDefinition } from '../chatbot.types.js';
export declare const SEARCH_COURSES_NAME = "search_courses";
export declare const SEARCH_COURSES_DEFAULT_LIMIT = 5;
export declare const SEARCH_COURSES_MAX_LIMIT = 10;
export declare const SEARCH_COURSES_MAX_PAGE = 1000;
export declare const SEARCH_COURSES_MAX_ARGUMENT_BYTES = 4096;
export declare const SEARCH_COURSES_MAX_RELATED_KEYWORDS = 8;
export declare class SearchCoursesError extends Error {
    readonly code: 'CHATBOT_TOOL_ARGUMENTS_INVALID' | 'CHATBOT_SEARCH_UNAVAILABLE';
    constructor(code: 'CHATBOT_TOOL_ARGUMENTS_INVALID' | 'CHATBOT_SEARCH_UNAVAILABLE');
}
export declare const SEARCH_COURSES_DEFINITION: ChatbotToolDefinition;
export declare function parseSearchCoursesArguments(raw: string): PublicCourseSearchFilters;
