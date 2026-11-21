import Joi from 'joi';
import type { ChatbotToolDefinition } from '../chatbot.types.js';
import { type ChatbotConversationContext, type MyCoursesFilters } from './my-learning.types.js';
export declare const GET_MY_COURSES_NAME = "get_my_courses";
export declare const GET_MY_LEARNING_PROGRESS_NAME = "get_my_learning_progress";
export declare const learningTextSchema: Joi.StringSchema<string>;
export declare const objectIdSchema: Joi.StringSchema<string>;
export declare const myCoursesFiltersSchema: Joi.ObjectSchema<any>;
export declare function validateLearning<T>(schema: Joi.Schema, value: unknown): T;
export declare function resolveMyCoursesArguments(raw: string, context?: ChatbotConversationContext): MyCoursesFilters;
export interface LearningProgressArguments {
    scope: 'overview' | 'course' | 'next_page';
    courseId?: string;
    courseName?: string;
    position?: number;
    current?: true;
    page: number;
    limit: number;
}
export declare function parseLearningProgressArguments(raw: string): LearningProgressArguments;
export declare const GET_MY_COURSES_DEFINITION: ChatbotToolDefinition;
export declare const GET_MY_LEARNING_PROGRESS_DEFINITION: ChatbotToolDefinition;
