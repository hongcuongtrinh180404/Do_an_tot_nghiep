import { ChatbotLearningReadService } from '../services/chatbot-learning-read.service.js';
import { type ChatbotConversationContext, type LearningResult } from './my-learning.types.js';
export declare class GetMyLearningProgressTool {
    private readonly learning;
    readonly definition: import("openai/resources/index.mjs").ChatCompletionFunctionTool;
    constructor(learning: ChatbotLearningReadService);
    execute(raw: string, userId: string, question: string, signal?: AbortSignal, context?: ChatbotConversationContext): Promise<{
        result: LearningResult;
        nextContext: ChatbotConversationContext;
    }>;
}
