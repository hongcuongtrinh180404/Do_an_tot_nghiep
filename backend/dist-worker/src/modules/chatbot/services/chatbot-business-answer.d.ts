import type { BusinessResult, BusinessPeriod } from '../tools/instructor-business.types.js';
import type { ChatbotConversationReply } from '../tools/my-learning.types.js';
export declare const businessPeriodLabel: (period: BusinessPeriod) => string;
export declare function businessAnswer(result: BusinessResult): Pick<ChatbotConversationReply, 'status' | 'answer'>;
