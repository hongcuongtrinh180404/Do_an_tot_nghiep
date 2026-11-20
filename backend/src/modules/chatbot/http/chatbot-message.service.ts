import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PublicCourseSearchResult } from '../../course/interfaces/public-course-search.interface.js';
import { ChatbotAiError } from '../chatbot.errors.js';
import {
  ChatbotSearchService,
  type ChatbotSearchReply,
} from '../services/chatbot-search.service.js';
import { CHATBOT_HTTP_TIMEOUT_MS } from './chatbot-http.constants.js';
import {
  ChatbotSearchUnavailableException,
  mapChatbotHttpError,
} from './chatbot-http.errors.js';
import { ChatbotContextService } from './chatbot-context.service.js';

export interface ChatbotMessageResponse {
  requestId: string;
  status: Exclude<ChatbotSearchReply['status'], 'unavailable'>;
  answer: string;
  result?: PublicCourseSearchResult;
  context?: string;
}

/** Explicit HTTP projection; never serialize an entire internal protocol/result object. */
function publicSearchResult(
  result: PublicCourseSearchResult,
): PublicCourseSearchResult {
  const filters = result.filtersApplied;
  return {
    filtersApplied: {
      ...(filters.keyword !== undefined ? { keyword: filters.keyword } : {}),
      ...(filters.relatedKeywords !== undefined
        ? { relatedKeywords: [...filters.relatedKeywords] }
        : {}),
      ...(filters.minPrice !== undefined ? { minPrice: filters.minPrice } : {}),
      ...(filters.maxPrice !== undefined ? { maxPrice: filters.maxPrice } : {}),
      ...(filters.isFree !== undefined ? { isFree: filters.isFree } : {}),
      ...(filters.level !== undefined ? { level: filters.level } : {}),
      maxPriceExclusive: filters.maxPriceExclusive,
      page: filters.page,
      limit: filters.limit,
    },
    items: result.items.map((item) => ({
      id: item.id,
      title: item.title,
      price: item.price,
      level: item.level,
      categoryName: item.categoryName,
      url: item.url,
    })),
    currency: result.currency,
    total: result.total,
    page: result.page,
    limit: result.limit,
    hasMore: result.hasMore,
  };
}

@Injectable()
export class ChatbotMessageService {
  private readonly logger = new Logger(ChatbotMessageService.name);

  constructor(
    @Inject(ChatbotSearchService) private readonly search: ChatbotSearchService,
    @Inject(ChatbotContextService)
    private readonly contexts: ChatbotContextService,
  ) {}

  async respond(
    message: string,
    requestId: string,
    callerSignal?: AbortSignal,
    conversation?: { userId: string; context?: string },
  ): Promise<ChatbotMessageResponse> {
    const deadline = new AbortController();
    const signal = callerSignal
      ? AbortSignal.any([callerSignal, deadline.signal])
      : deadline.signal;
    let timedOut = false;
    let onAbort: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (signal.aborted) throw new ChatbotAiError('CHATBOT_CANCELLED');
      const context = conversation?.context
        ? this.contexts.read(conversation.userId, conversation.context)
        : undefined;
      const interrupted = new Promise<never>((_resolve, reject) => {
        onAbort = () =>
          reject(
            new ChatbotAiError(
              timedOut ? 'CHATBOT_TIMEOUT' : 'CHATBOT_CANCELLED',
            ),
          );
        signal.addEventListener('abort', onAbort, { once: true });
      });
      timer = setTimeout(() => {
        timedOut = true;
        deadline.abort();
      }, CHATBOT_HTTP_TIMEOUT_MS);
      timer.unref();
      const reply = await Promise.race([
        this.search.search(message, {
          requestId,
          signal,
          ...(context ? { context } : {}),
        }),
        interrupted,
      ]);
      if (signal.aborted)
        throw new ChatbotAiError(
          timedOut ? 'CHATBOT_TIMEOUT' : 'CHATBOT_CANCELLED',
        );
      if (reply.status === 'unavailable') {
        throw new ChatbotSearchUnavailableException(requestId);
      }
      const result = reply.result
        ? publicSearchResult(reply.result)
        : undefined;
      return {
        requestId,
        status: reply.status,
        answer: reply.answer,
        ...(result
          ? {
              result,
              ...(conversation
                ? { context: this.contexts.create(conversation.userId, result) }
                : {}),
            }
          : {}),
      };
    } catch (error) {
      // Preserve only the safe exception constructed here, never arbitrary HttpExceptions.
      const safeError =
        error instanceof ChatbotSearchUnavailableException && !signal.aborted
          ? error
          : mapChatbotHttpError(
              callerSignal?.aborted
                ? new ChatbotAiError('CHATBOT_CANCELLED')
                : timedOut
                  ? new ChatbotAiError('CHATBOT_TIMEOUT')
                  : error,
              requestId,
            );
      const body = safeError.getResponse() as { code: string };
      this.logger.warn(JSON.stringify({ requestId, code: body.code }));
      throw safeError;
    } finally {
      if (timer) clearTimeout(timer);
      if (onAbort) signal.removeEventListener('abort', onAbort);
    }
  }
}
