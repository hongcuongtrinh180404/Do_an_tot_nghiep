import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ChatbotContextService } from '../http/chatbot-context.service.js';
import type { ChatbotConversationContext } from '../tools/my-learning.types.js';

const secret = 'synthetic-business-context-secret';
const service = new ChatbotContextService(new ConfigService({ JWT_SECRET: secret }));
const courseId = '0123456789abcdef01234567';
const state: ChatbotConversationContext = {
  mode: 'instructor_revenue',
  business: { query: { mode: 'revenue', period: { timeRange: 'this_month' },
    courseId, metric: 'instructor_earnings', page: 1, limit: 5 }, selectedCourseId: courseId },
};
describe('Business context v3 and backward compatibility', () => {
  it('issues account-bound v3 navigation containing no monetary facts or auth credentials', () => {
    const token = service.createConversation('a', state);
    const envelope = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'));
    expect(envelope.v).toBe(3);
    expect(service.readConversation('a', token)).toEqual(state);
    expect(() => service.readConversation('b', token)).toThrow();
    for (const key of ['instructorEarnings', 'successfulSales', 'userId', 'JWT', 'orderCode']) {
      expect(JSON.stringify(envelope)).not.toContain(key);
    }
  });
  it('still reads unexpired v2 learning conversations, but v2 cannot introduce business state', () => {
    const v2 = (value: unknown) => {
      const payload = Buffer.from(JSON.stringify({ v: 2, expiresAt: Date.now() + 10000, state: value })).toString('base64url');
      const mac = createHmac('sha256', secret).update(`mindly:chatbot-conversation-context:v2\0a\0${payload}`).digest('hex');
      return `${payload}.${mac}`;
    };
    expect(service.readConversation('a', v2({ mode: 'learning_progress' }))).toEqual({ mode: 'learning_progress' });
    expect(() => service.readConversation('a', v2(state))).toThrow();
  });
  it.each([
    { ...state, business: { ...state.business, orderCode: 'private' } },
    { ...state, business: { query: { ...state.business!.query, instructorId: courseId } } },
    { ...state, selectedCourseId: courseId },
    { ...state, mode: 'catalog' },
    { ...state, business: undefined },
    { ...state, business: { ...state.business, selectedCourseId: '0123456789abcdef00000000' } },
  ])('rejects extra fields, conflicting roles/modes and mismatched selections', (value) => {
    expect(() => service.createConversation('a', value as ChatbotConversationContext)).toThrow();
  });
});
