import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatbotContextService, CHATBOT_CONTEXT_TTL_MS } from '../http/chatbot-context.service.js';
import type { ChatbotConversationContext } from '../tools/my-learning.types.js';

const secret = 'synthetic-v2-context-secret';
const service = new ChatbotContextService(new ConfigService({ JWT_SECRET: secret }));
const state: ChatbotConversationContext = {
  mode: 'learning_progress',
  selectedCourseId: '0123456789abcdef01234567',
  list: { kind: 'my_courses', ids: ['0123456789abcdef01234567'], filters: { page: 2, limit: 2 }, hasMore: true },
};
afterEach(() => vi.useRealTimers());
describe('Conversation context v2', () => {
  it('round trips navigation with account binding and expiry', () => {
    vi.useFakeTimers();
    const token = service.createConversation('account-a', state);
    expect(service.readConversation('account-a', token)).toEqual(state);
    expect(() => service.readConversation('account-b', token)).toThrow();
    expect(() => service.readConversation('account-a', `${token}x`)).toThrow();
    vi.advanceTimersByTime(CHATBOT_CONTEXT_TTL_MS);
    expect(() => service.readConversation('account-a', token)).toThrow();
  });
  it('upgrades a still-valid v1 search without inventing list references', () => {
    const token = service.create('a', { filtersApplied: { page: 1, limit: 5, maxPriceExclusive: false },
      items: [], total: 0, page: 1, limit: 5, hasMore: false, currency: 'VND' });
    expect(service.readConversation('a', token)).toEqual({
      mode: 'catalog', list: { kind: 'catalog', ids: [], filters: { page: 1, limit: 5, maxPriceExclusive: false },
        lowestPrice: null, hasMore: false },
    });
  });
  it.each([
    { ...state, transcript: 'private' },
    { ...state, selectedCourseId: 'bad' },
    { ...state, mode: 'catalog' },
    { ...state, list: { ...state.list, ids: Array(11).fill(state.selectedCourseId) } },
    { ...state, list: { ...state.list, filters: { userId: 'other', page: 1, limit: 5 } } },
  ])('rejects invalid state even with a correct test signature', (invalid) => {
    const payload = Buffer.from(JSON.stringify({ v: 2, expiresAt: Date.now() + 10000, state: invalid })).toString('base64url');
    const mac = createHmac('sha256', secret).update(`mindly:chatbot-conversation-context:v2\0a\0${payload}`).digest('hex');
    expect(() => service.readConversation('a', `${payload}.${mac}`)).toThrow();
  });
});
