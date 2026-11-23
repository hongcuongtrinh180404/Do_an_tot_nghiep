import { InstructorRevenueReadRepository } from '../../payment/repositories/instructor-revenue-read.repository.js';
import { type BusinessResult } from '../tools/instructor-business.types.js';
import type { ChatbotConversationContext } from '../tools/my-learning.types.js';
export declare const CHATBOT_REVENUE_BUDGET_MS = 8000;
export declare class ChatbotInstructorBusinessService {
    private readonly reads;
    constructor(reads: InstructorRevenueReadRepository);
    execute(tool: 'revenue' | 'stats', raw: string, userId: string, question: string, signal?: AbortSignal, context?: ChatbotConversationContext, now?: Date): Promise<{
        result: BusinessResult;
        nextContext: ChatbotConversationContext;
    }>;
}
