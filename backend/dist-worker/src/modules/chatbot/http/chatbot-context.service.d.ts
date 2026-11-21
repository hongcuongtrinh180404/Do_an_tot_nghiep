import { ConfigService } from '@nestjs/config';
import type { PublicCourseSearchResult } from '../../course/interfaces/public-course-search.interface.js';
import type { ChatbotSearchContext } from '../tools/search-courses.context.js';
import type { ChatbotConversationContext } from '../tools/my-learning.types.js';
export declare const CHATBOT_CONTEXT_MAX_LENGTH = 8192;
export declare const CHATBOT_CONTEXT_TTL_MS: number;
export declare class ChatbotContextError extends Error {
    constructor();
}
export declare class ChatbotContextService {
    private readonly config;
    constructor(config: ConfigService);
    private signature;
    create(userId: string, result: PublicCourseSearchResult): string;
    read(userId: string, token: string): ChatbotSearchContext;
    createConversation(userId: string, context: ChatbotConversationContext): string;
    readConversation(userId: string, token: string): ChatbotConversationContext;
}
