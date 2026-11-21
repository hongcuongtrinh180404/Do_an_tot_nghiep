import type { ChatbotConversationReply } from '../tools/my-learning.types.js';
type WithoutContext<T> = T extends unknown ? Omit<T, 'nextContext'> : never;
export type ChatbotPublicReply = WithoutContext<ChatbotConversationReply>;
export type ChatbotMessageResponse = ChatbotPublicReply & {
    requestId: string;
    context?: string;
};
export declare function projectChatbotReply(reply: ChatbotConversationReply): ChatbotPublicReply;
export {};
