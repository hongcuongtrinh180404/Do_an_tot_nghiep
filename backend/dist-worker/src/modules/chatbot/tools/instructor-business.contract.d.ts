import Joi from 'joi';
import type { ChatbotToolDefinition } from '../chatbot.types.js';
import type { ChatbotConversationContext } from './my-learning.types.js';
import { type BusinessQuery } from './instructor-business.types.js';
export declare const GET_INSTRUCTOR_REVENUE_NAME = "get_instructor_revenue";
export declare const GET_INSTRUCTOR_SALES_STATS_NAME = "get_instructor_sales_stats";
export declare const BUSINESS_TIME_RANGES: readonly ["today", "yesterday", "this_week", "last_week", "7days", "30days", "this_month", "last_month", "this_year", "custom"];
export declare const businessPeriodSchema: Joi.ObjectSchema<any>;
export declare const businessQuerySchema: Joi.ObjectSchema<any>;
export declare function validateBusiness<T>(schema: Joi.Schema, value: unknown): T;
export interface BusinessArguments {
    action: 'new_query' | 'refine' | 'next_page';
    query: BusinessQuery;
    courseId?: string;
    position?: number;
    current?: true;
    preservesList: boolean;
}
export declare function resolveBusinessArguments(raw: string, tool: 'revenue' | 'stats', context?: ChatbotConversationContext): BusinessArguments;
export declare const GET_INSTRUCTOR_REVENUE_DEFINITION: ChatbotToolDefinition;
export declare const GET_INSTRUCTOR_SALES_STATS_DEFINITION: ChatbotToolDefinition;
