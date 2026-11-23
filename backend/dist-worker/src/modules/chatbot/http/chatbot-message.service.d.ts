import { ChatbotConversationService } from '../services/chatbot-conversation.service.js';
import { ChatbotContextService } from './chatbot-context.service.js';
import { type ChatbotMessageResponse } from './chatbot-response.projection.js';
import type { RoleEnum } from 'share-lib';
export type { ChatbotMessageResponse } from './chatbot-response.projection.js';
export declare class ChatbotMessageService {
    private readonly conversations;
    private readonly contexts;
    private readonly logger;
    constructor(conversations: ChatbotConversationService, contexts: ChatbotContextService);
    respond(message: string, requestId: string, callerSignal?: AbortSignal, conversation?: {
        userId: string;
        role?: RoleEnum;
        context?: string;
    }): Promise<ChatbotMessageResponse>;
}
