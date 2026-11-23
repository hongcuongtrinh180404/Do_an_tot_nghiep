import { Inject, Injectable } from '@nestjs/common';
import { ChatbotInstructorBusinessService } from '../services/chatbot-instructor-business.service.js';
import type { ChatbotConversationContext } from './my-learning.types.js';
import { GET_INSTRUCTOR_REVENUE_DEFINITION } from './instructor-business.contract.js';

@Injectable()
export class GetInstructorRevenueTool {
  readonly definition = GET_INSTRUCTOR_REVENUE_DEFINITION;
  constructor(@Inject(ChatbotInstructorBusinessService) private readonly business: ChatbotInstructorBusinessService) {}
  execute(raw: string, userId: string, question: string, signal?: AbortSignal, context?: ChatbotConversationContext) {
    return this.business.execute('revenue', raw, userId, question, signal, context);
  }
}
