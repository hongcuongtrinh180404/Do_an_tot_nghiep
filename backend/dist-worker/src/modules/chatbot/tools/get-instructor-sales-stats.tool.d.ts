import { ChatbotInstructorBusinessService } from '../services/chatbot-instructor-business.service.js';
import type { ChatbotConversationContext } from './my-learning.types.js';
export declare class GetInstructorSalesStatsTool {
    private readonly business;
    readonly definition: import("openai/resources/index.mjs").ChatCompletionFunctionTool;
    constructor(business: ChatbotInstructorBusinessService);
    execute(raw: string, userId: string, question: string, signal?: AbortSignal, context?: ChatbotConversationContext): Promise<{
        result: import("./instructor-business.types.js").BusinessResult;
        nextContext: ChatbotConversationContext;
    }>;
}
