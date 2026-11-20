import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CourseLevelEnum } from 'share-lib';
import {
  ChatbotContextService,
  ChatbotContextError,
  CHATBOT_CONTEXT_TTL_MS,
} from '../http/chatbot-context.service.js';

const service = new ChatbotContextService(
  new ConfigService({ JWT_SECRET: 'synthetic-context-secret-not-a-real-key' }),
);
const result = {
  filtersApplied: {
    keyword: 'backend',
    maxPrice: 200000,
    maxPriceExclusive: true,
    page: 1,
    limit: 5,
  },
  items: [
    {
      id: '0123456789abcdef01234567',
      title: 'Do not retain title',
      price: 30000,
      level: CourseLevelEnum.BEGINNER,
      categoryName: null,
      url: '/courses/0123456789abcdef01234567',
    },
  ],
  total: 10,
  hasMore: true,
  page: 1,
  limit: 5,
  currency: 'VND' as const,
};
afterEach(() => vi.useRealTimers());

describe('Signed account-bound chatbot context', () => {
  it('round trips only normalized filters, cheapest price and pagination metadata', () => {
    const token = service.create('account-a', result);
    expect(service.read('account-a', token)).toEqual({
      filters: result.filtersApplied,
      lowestPrice: 30000,
      hasMore: true,
    });
    const payload = Buffer.from(token.split('.')[0], 'base64url').toString(
      'utf8',
    );
    expect(payload).not.toContain('Do not retain title');
    expect(payload).not.toContain('account-a');
    expect(payload).not.toContain('0123456789abcdef01234567');
  });
  it('does not accept another account, even with a valid Mindly JWT', () => {
    expect(() =>
      service.read('account-b', service.create('account-a', result)),
    ).toThrow(ChatbotContextError);
  });
  it('rejects changed payloads and signatures without exposing their content', () => {
    const token = service.create('account-a', result);
    const [payload, mac] = token.split('.');
    for (const tampered of [
      `${payload}x.${mac}`,
      `${payload}.${'0'.repeat(64)}`,
      'malformed',
      'a'.repeat(8193),
    ]) {
      expect(() => service.read('account-a', tampered)).toThrow(
        ChatbotContextError,
      );
    }
  });
  it('expires after 30 minutes and accepts an empty result without inventing prices', () => {
    vi.useFakeTimers();
    const token = service.create('account-a', {
      ...result,
      items: [],
      total: 0,
      hasMore: false,
    });
    expect(service.read('account-a', token).lowestPrice).toBeNull();
    vi.advanceTimersByTime(CHATBOT_CONTEXT_TTL_MS);
    expect(() => service.read('account-a', token)).toThrow(ChatbotContextError);
  });
});
