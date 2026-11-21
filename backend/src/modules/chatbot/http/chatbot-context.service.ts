import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PublicCourseSearchResult } from '../../course/interfaces/public-course-search.interface.js';
import { ChatbotAiError } from '../chatbot.errors.js';
import { parseSearchCoursesArguments } from '../tools/search-courses.contract.js';
import type { ChatbotSearchContext } from '../tools/search-courses.context.js';
import type { ChatbotConversationContext } from '../tools/my-learning.types.js';
import { validateConversationContext } from '../tools/conversation-context.js';

export const CHATBOT_CONTEXT_MAX_LENGTH = 8192;
export const CHATBOT_CONTEXT_TTL_MS = 30 * 60 * 1000;

export class ChatbotContextError extends Error {
  constructor() {
    super('The chatbot search context is invalid or expired.');
  }
}

/** Signed, account-bound public search state. No database/session/history persistence. */
@Injectable()
export class ChatbotContextService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  private signature(payload: string, userId: string, version = 1): Buffer {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret) throw new ChatbotAiError('CHATBOT_CONFIG_INVALID');
    return createHmac('sha256', secret)
      .update(`${version === 1 ? 'mindly:chatbot-search-context:v1' : 'mindly:chatbot-conversation-context:v2'}\0${userId}\0${payload}`)
      .digest();
  }

  create(userId: string, result: PublicCourseSearchResult): string {
    const state = {
      v: 1,
      expiresAt: Date.now() + CHATBOT_CONTEXT_TTL_MS,
      filters: parseSearchCoursesArguments(
        JSON.stringify(result.filtersApplied),
      ),
      lowestPrice: result.items.length
        ? Math.min(...result.items.map((item) => item.price))
        : null,
      hasMore: result.hasMore,
    };
    const payload = Buffer.from(JSON.stringify(state)).toString('base64url');
    return `${payload}.${this.signature(payload, userId).toString('hex')}`;
  }

  read(userId: string, token: string): ChatbotSearchContext {
    const invalid = () => new ChatbotContextError();
    if (
      typeof token !== 'string' ||
      token.length > CHATBOT_CONTEXT_MAX_LENGTH ||
      !/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/.test(token)
    )
      throw invalid();
    const [payload, mac] = token.split('.');
    if (
      !timingSafeEqual(Buffer.from(mac, 'hex'), this.signature(payload, userId))
    )
      throw invalid();
    try {
      const state = JSON.parse(
        Buffer.from(payload, 'base64url').toString('utf8'),
      ) as Record<string, unknown>;
      if (
        state.v !== 1 ||
        typeof state.expiresAt !== 'number' ||
        !Number.isSafeInteger(state.expiresAt) ||
        state.expiresAt <= Date.now() ||
        typeof state.hasMore !== 'boolean' ||
        (state.lowestPrice !== null &&
          (typeof state.lowestPrice !== 'number' ||
            !Number.isSafeInteger(state.lowestPrice) ||
            state.lowestPrice < 0))
      )
        throw invalid();
      return {
        filters: parseSearchCoursesArguments(JSON.stringify(state.filters)),
        lowestPrice: state.lowestPrice as number | null,
        hasMore: state.hasMore,
      };
    } catch {
      throw invalid();
    }
  }

  createConversation(userId: string, context: ChatbotConversationContext): string {
    const state = validateConversationContext(context);
    const payload = Buffer.from(JSON.stringify({
      v: 2, expiresAt: Date.now() + CHATBOT_CONTEXT_TTL_MS, state,
    })).toString('base64url');
    const token = `${payload}.${this.signature(payload, userId, 2).toString('hex')}`;
    if (token.length > CHATBOT_CONTEXT_MAX_LENGTH) throw new ChatbotContextError();
    return token;
  }

  readConversation(userId: string, token: string): ChatbotConversationContext {
    if (typeof token !== 'string' || token.length > CHATBOT_CONTEXT_MAX_LENGTH
      || !/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/.test(token)) throw new ChatbotContextError();
    const [payload, mac] = token.split('.');
    if (!timingSafeEqual(Buffer.from(mac, 'hex'), this.signature(payload, userId, 2))) {
      // Existing v1 catalog conversations remain usable until their normal expiry.
      return { mode: 'catalog', list: { kind: 'catalog', ...this.read(userId, token), ids: [] } };
    }
    try {
      const envelope = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<string, unknown>;
      if (envelope.v !== 2 || typeof envelope.expiresAt !== 'number'
        || !Number.isSafeInteger(envelope.expiresAt) || envelope.expiresAt <= Date.now()
        || Object.keys(envelope).some((key) => !['v', 'expiresAt', 'state'].includes(key))) {
        throw new ChatbotContextError();
      }
      return validateConversationContext(envelope.state);
    } catch { throw new ChatbotContextError(); }
  }
}
