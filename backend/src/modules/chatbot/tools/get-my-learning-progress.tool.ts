import { Inject, Injectable } from '@nestjs/common';
import { ChatbotLearningReadService } from '../services/chatbot-learning-read.service.js';
import { GET_MY_LEARNING_PROGRESS_DEFINITION, parseLearningProgressArguments } from './my-learning.contract.js';
import {
  ChatbotLearningError, LearningFollowUpError,
  type ChatbotConversationContext, type LearningResult,
} from './my-learning.types.js';

@Injectable()
export class GetMyLearningProgressTool {
  readonly definition = GET_MY_LEARNING_PROGRESS_DEFINITION;
  constructor(@Inject(ChatbotLearningReadService) private readonly learning: ChatbotLearningReadService) {}

  async execute(raw: string, userId: string, question: string, signal?: AbortSignal,
    context?: ChatbotConversationContext): Promise<{ result: LearningResult; nextContext: ChatbotConversationContext }> {
    const args = parseLearningProgressArguments(raw);
    if (args.scope === 'overview') {
      return { result: await this.learning.overview(userId, signal), nextContext: { mode: 'learning_progress' } };
    }
    let id = args.courseId;
    if (id && !question.toLowerCase().includes(id)) {
      throw new ChatbotLearningError('CHATBOT_TOOL_ARGUMENTS_INVALID');
    }
    if (args.position !== undefined) {
      if (!context?.list) throw new LearningFollowUpError('missing_list');
      id = context.list.ids[args.position - 1];
      if (!id) throw new LearningFollowUpError('invalid_position');
    }
    if (args.current) {
      id = context?.selectedCourseId
        ?? (context?.list?.ids.length === 1 ? context.list.ids[0] : undefined);
      if (!id) throw new LearningFollowUpError('missing_course');
    }
    let keyword = args.courseName;
    let page = args.page;
    let limit = args.limit;
    if (args.scope === 'next_page') {
      if (context?.list?.kind !== 'selection') throw new LearningFollowUpError('missing_list');
      if (!context.list.hasMore) throw new LearningFollowUpError('no_more');
      keyword = context.list.keyword;
      page = context.list.page + 1;
      limit = context.list.limit;
    }
    if (keyword) {
      const candidates = await this.learning.candidates(userId, keyword, page, limit, signal);
      if (candidates.total === 1 && page === 1) {
        id = candidates.items[0].id;
      } else {
        return {
          result: candidates.total === 0 ? { scope: 'not_owned' } : candidates,
          nextContext: {
            mode: 'learning_progress',
            list: { kind: 'selection', keyword, page, limit, hasMore: candidates.hasMore,
              ids: candidates.items.map((course) => course.id) },
          },
        };
      }
    }
    if (!id) throw new LearningFollowUpError('missing_course');
    const result = await this.learning.detail(userId, id, signal);
    return {
      result,
      nextContext: {
        mode: 'learning_progress',
        ...(context?.list ? { list: context.list } : {}),
        ...(result.scope === 'course' ? { selectedCourseId: result.course.id } : {}),
      },
    };
  }
}
