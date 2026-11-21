import { Inject, Injectable } from '@nestjs/common';
import { ChatbotLearningReadService } from '../services/chatbot-learning-read.service.js';
import { GET_MY_COURSES_DEFINITION, resolveMyCoursesArguments } from './my-learning.contract.js';
import type { ChatbotConversationContext, MyCoursesResult } from './my-learning.types.js';

@Injectable()
export class GetMyCoursesTool {
  readonly definition = GET_MY_COURSES_DEFINITION;
  constructor(@Inject(ChatbotLearningReadService) private readonly learning: ChatbotLearningReadService) {}

  execute(raw: string, userId: string, signal?: AbortSignal, context?: ChatbotConversationContext): Promise<MyCoursesResult> {
    return this.learning.list(userId, resolveMyCoursesArguments(raw, context), signal);
  }
}
