import { ChatbotLearningReadService } from '../services/chatbot-learning-read.service.js';
import type { ChatbotConversationContext, MyCoursesResult } from './my-learning.types.js';
export declare class GetMyCoursesTool {
    private readonly learning;
    readonly definition: import("openai/resources/index.mjs").ChatCompletionFunctionTool;
    constructor(learning: ChatbotLearningReadService);
    execute(raw: string, userId: string, signal?: AbortSignal, context?: ChatbotConversationContext): Promise<MyCoursesResult>;
}
