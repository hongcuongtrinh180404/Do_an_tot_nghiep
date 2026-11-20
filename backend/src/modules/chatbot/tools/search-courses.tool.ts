import { Inject, Injectable } from '@nestjs/common';
import { PublicCourseSearchService } from '../../course/services/public-course-search.service.js';
import type { PublicCourseSearchResult } from '../../course/interfaces/public-course-search.interface.js';
import { ChatbotAiError } from '../chatbot.errors.js';
import {
  SEARCH_COURSES_DEFINITION,
  SearchCoursesError,
} from './search-courses.contract.js';
import {
  resolveSearchCoursesArguments,
  type ChatbotSearchContext,
} from './search-courses.context.js';

@Injectable()
export class SearchCoursesTool {
  readonly definition = SEARCH_COURSES_DEFINITION;

  constructor(
    @Inject(PublicCourseSearchService)
    private readonly searchService: PublicCourseSearchService,
  ) {}

  async execute(
    rawArguments: string,
    signal?: AbortSignal,
    context?: ChatbotSearchContext,
  ): Promise<PublicCourseSearchResult> {
    const filters = resolveSearchCoursesArguments(rawArguments, context);
    if (signal?.aborted) throw new ChatbotAiError('CHATBOT_CANCELLED');
    try {
      const result = await this.searchService.search(filters);
      if (signal?.aborted) throw new ChatbotAiError('CHATBOT_CANCELLED');
      return result;
    } catch {
      if (signal?.aborted) throw new ChatbotAiError('CHATBOT_CANCELLED');
      throw new SearchCoursesError('CHATBOT_SEARCH_UNAVAILABLE');
    }
  }
}
