// @vitest-environment jsdom

import axios, { AxiosError, AxiosHeaders, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/lib/api-client';
import { chatbotFailure, retryAtFromHeader, sendChatbotMessage } from '../api/chatbot.api';
import { foundReply } from './fixtures';

const originalAdapter = apiClient.defaults.adapter;
const adapter = vi.fn();
class MemoryStorage {
  private data = new Map<string, string>();
  get length() { return this.data.size; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string) { this.data.delete(key); }
  setItem(key: string, value: string) { this.data.set(key, String(value)); }
}
function response(config: InternalAxiosRequestConfig, status = 200, data: unknown = {
  success: true, data: foundReply(),
}): AxiosResponse {
  return { status, statusText: '', config, data, headers: new AxiosHeaders() };
}
function httpError(status: number, headers: Record<string, string> = {}, data: unknown = {}) {
  const config = { headers: new AxiosHeaders() } as InternalAxiosRequestConfig;
  return new AxiosError('private-error', 'ERR_BAD_RESPONSE', config, null, {
    ...response(config, status, data), headers,
  });
}
beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
  localStorage.setItem('accessToken', 'test-mindly-token');
  adapter.mockReset().mockImplementation(async (config) => response(config));
  apiClient.defaults.adapter = adapter;
});
afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Chatbot HTTP client and auth integration', () => {
  it('sends only message, uses existing JWT interceptor, 45s timeout and cancellation', async () => {
    const controller = new AbortController();
    const result = await sendChatbotMessage('Python', controller.signal);
    const config = adapter.mock.calls[0][0];
    expect(config.url).toBe('/chatbot/messages');
    expect(JSON.parse(config.data)).toEqual({ message: 'Python' });
    expect(config.headers.Authorization).toBe('Bearer test-mindly-token');
    expect(config.timeout).toBe(45000);
    expect(config.signal).toBe(controller.signal);
    if (result.reply.kind !== undefined && result.reply.kind !== 'course_search') throw new Error('Expected catalog response');
    expect(result.reply.result?.items[0].price).toBe(299000);
  });

  it('refreshes a Mindly 401 once and reuses timeout/signal when replaying', async () => {
    localStorage.setItem('refreshToken', 'test-refresh');
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { data: { accessToken: 'test-new-token', refreshToken: 'test-new-refresh' } },
    });
    adapter.mockImplementationOnce(async (config) => {
      throw new AxiosError('expired', 'ERR_BAD_RESPONSE', config, null, response(config, 401, {}));
    });
    const signal = new AbortController().signal;
    await sendChatbotMessage('Python', signal);
    expect(refresh).toHaveBeenCalledOnce();
    expect(adapter).toHaveBeenCalledTimes(2);
    expect(adapter.mock.calls[1][0]).toMatchObject({ timeout: 45000, signal });
    expect(adapter.mock.calls[1][0].headers.Authorization).toBe('Bearer test-new-token');
  });

  it.each([429, 502, 503, 504])('does not refresh or retry on chatbot HTTP %i', async (status) => {
    const refresh = vi.spyOn(axios, 'post');
    adapter.mockImplementationOnce(async (config) => {
      throw new AxiosError('provider failed', 'ERR_BAD_RESPONSE', config, null, response(config, status, {}));
    });
    await expect(sendChatbotMessage('Python', new AbortController().signal)).rejects.toThrow();
    expect(refresh).not.toHaveBeenCalled();
    expect(adapter).toHaveBeenCalledOnce();
    expect(localStorage.getItem('accessToken')).toBe('test-mindly-token');
  });

  it('never issues an already-aborted request', async () => {
    await expect(sendChatbotMessage('Python', AbortSignal.abort())).rejects.toMatchObject({ code: 'ERR_CANCELED' });
    expect(adapter).not.toHaveBeenCalled();
  });

  it('honors a depleted local quota on successful responses', async () => {
    adapter.mockImplementationOnce(async (config) => ({
      ...response(config), headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '60' },
    }));
    const now = Date.now();
    const result = await sendChatbotMessage('Python', new AbortController().signal);
    expect(result.retryAt).toBeGreaterThanOrEqual(now + 60000);
  });

  it('sends the opaque server context only when continuing a conversation', async () => {
    adapter.mockImplementationOnce(async (config) => response(config, 200, {
      success: true, data: { ...foundReply(), context: 'next-server-context' },
    }));
    const result = await sendChatbotMessage('Xem thêm', new AbortController().signal, 'previous-server-context');
    expect(JSON.parse(adapter.mock.calls[0][0].data)).toEqual({
      message: 'Xem thêm', context: 'previous-server-context',
    });
    expect(result.reply.context).toBe('next-server-context');
  });

  it('accepts bounded AI-expanded filters while rendering only actual returned courses', async () => {
    const reply = foundReply();
    reply.result!.filtersApplied = {
      keyword: 'làm website', relatedKeywords: ['HTML', 'CSS', 'React'],
      maxPrice: 200000, maxPriceExclusive: true, page: 1, limit: 5,
    };
    reply.result!.items[0].price = 150000;
    adapter.mockImplementationOnce(async (config) => response(config, 200, { success: true, data: reply }));
    const result = await sendChatbotMessage('Học làm website dưới 200k', new AbortController().signal);
    if (result.reply.kind !== undefined && result.reply.kind !== 'course_search') throw new Error('Expected catalog response');
    expect(result.reply.result?.filtersApplied.relatedKeywords).toEqual(['HTML', 'CSS', 'React']);
    expect(result.reply.result?.items).toEqual(reply.result!.items);
  });

  it('rejects overlong/unbounded expanded filter metadata', async () => {
    const reply = foundReply();
    reply.result!.filtersApplied.relatedKeywords = Array(9).fill('React');
    adapter.mockImplementationOnce(async (config) => response(config, 200, { success: true, data: reply }));
    await expect(sendChatbotMessage('Website', new AbortController().signal)).rejects.toThrow();
  });

  it.each(['javascript:alert(1)', '//external.example', '/courses/another-id', 'https://external.example'])(
    'rejects unsafe or inconsistent course URLs: %s', async (url) => {
      const reply = foundReply();
      reply.result!.items[0].url = url;
      adapter.mockImplementationOnce(async (config) => response(config, 200, { success: true, data: reply }));
      await expect(sendChatbotMessage('Python', new AbortController().signal)).rejects.toThrow();
    },
  );

  it('strips internal metadata and rejects missing results instead of inventing cards', async () => {
    adapter.mockImplementationOnce(async (config) => response(config, 200, {
      success: true, data: { ...foundReply(), reasoning_content: 'private' },
    }));
    expect((await sendChatbotMessage('Python', new AbortController().signal)).reply)
      .not.toHaveProperty('reasoning_content');
    adapter.mockImplementationOnce(async (config) => response(config, 200, {
      success: true, data: { ...foundReply(), result: undefined },
    }));
    await expect(sendChatbotMessage('Python', new AbortController().signal)).rejects.toThrow();
  });
});

describe('Safe error messages and retry hints', () => {
  it('uses local Retry-After and does not invent a wait time for provider 429', () => {
    expect(chatbotFailure(httpError(429, { 'retry-after': '30' })).retryAt).toBeGreaterThan(Date.now());
    expect(chatbotFailure(httpError(429)).retryAt).toBeUndefined();
  });
  it('shows authentication action only for Mindly 401, not provider 503', () => {
    expect(chatbotFailure(httpError(401)).requiresLogin).toBe(true);
    expect(chatbotFailure(httpError(503)).requiresLogin).toBe(false);
  });
  it('marks invalid context as a fresh-start error, not authentication failure', () => {
    expect(chatbotFailure(httpError(400, {}, { code: 'CHATBOT_CONTEXT_INVALID' }))).toMatchObject({
      resetContext: true, requiresLogin: false, retryable: false,
    });
  });
  it('does not echo arbitrary error bodies, HTML or invalid request IDs', () => {
    expect(JSON.stringify(chatbotFailure(httpError(503, {}, {
      message: '<script>private-api-key</script>', requestId: 'private-request-id', retryable: false,
    })))).not.toContain('private');
    expect(chatbotFailure(httpError(503, {}, { retryable: false })).retryable).toBe(false);
  });
  it('recognizes network and timeout failures', () => {
    expect(chatbotFailure(new AxiosError('private', 'ERR_NETWORK')).message).toContain('kết nối');
    expect(chatbotFailure(new AxiosError('private', 'ECONNABORTED')).message).toContain('thời gian');
  });
  it('parses both allowed Retry-After formats', () => {
    const now = Date.parse('2026-11-19T00:00:00Z');
    expect(retryAtFromHeader('2', now)).toBe(now + 2000);
    expect(retryAtFromHeader('Thu, 19 Nov 2026 00:00:03 GMT', now)).toBe(now + 3000);
    for (const value of [null, '', 'NaN', '-1', 'Infinity', 0, 999999999, {}]) {
      expect(retryAtFromHeader(value, now)).toBeUndefined();
    }
  });
});
