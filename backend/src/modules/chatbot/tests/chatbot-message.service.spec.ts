import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatbotAiError } from '../chatbot.errors.js';
import { ChatbotMessageService } from '../http/chatbot-message.service.js';
import { CHATBOT_HTTP_TIMEOUT_MS } from '../http/chatbot-http.constants.js';
import type { ChatbotConversationService } from '../services/chatbot-conversation.service.js';
import { ChatbotContextService } from '../http/chatbot-context.service.js';
import { ConfigService } from '@nestjs/config';

describe('ChatbotMessageService lifecycle', () => {
  let search: ReturnType<typeof vi.fn>;
  let service: ChatbotMessageService;
  const requestId = '65ac3483-7075-48e3-8bbe-4c3a6eb9cced';

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    search = vi.fn().mockResolvedValue({
      kind: 'clarification',
      status: 'needs_clarification',
      answer: 'Cần làm rõ.',
    });
    service = new ChatbotMessageService(
      {
        respond: search,
      } as unknown as ChatbotConversationService,
      new ChatbotContextService(
        new ConfigService({ JWT_SECRET: 'synthetic-context-secret' }),
      ),
    );
  });

  function respond(signal?: AbortSignal) {
    return service.respond('React', requestId, signal, { userId: '0123456789abcdef01234567' });
  }

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('removes the overall deadline when a request succeeds', async () => {
    vi.useFakeTimers();
    expect(await respond()).toEqual({
      kind: 'clarification',
      requestId,
      status: 'needs_clarification',
      answer: 'Cần làm rõ.',
    });
    expect(vi.getTimerCount()).toBe(0);
    expect(search).toHaveBeenCalledOnce();
  });

  it('removes the deadline on provider failure too', async () => {
    vi.useFakeTimers();
    search.mockRejectedValue(new ChatbotAiError('CHATBOT_RATE_LIMITED'));
    await expect(respond()).rejects.toMatchObject({
      status: 429,
      response: { code: 'CHATBOT_RATE_LIMITED' },
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('returns 504 at the total deadline and aborts the in-flight work without retries', async () => {
    vi.useFakeTimers();
    let receivedSignal: AbortSignal | undefined;
    search.mockImplementation((_message, options) => {
      receivedSignal = options.signal as AbortSignal;
      return new Promise(() => {});
    });
    const promise = respond();
    const assertion = expect(promise).rejects.toMatchObject({
      status: 504,
      response: { code: 'CHATBOT_TIMEOUT', requestId },
    });
    await vi.advanceTimersByTimeAsync(CHATBOT_HTTP_TIMEOUT_MS);
    await assertion;
    expect(receivedSignal?.aborted).toBe(true);
    expect(search).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('never starts work for an already disconnected caller', async () => {
    await expect(
      respond(AbortSignal.abort()),
    ).rejects.toMatchObject({
      status: 408,
      response: { code: 'CHATBOT_CANCELLED' },
    });
    expect(search).not.toHaveBeenCalled();
  });

  it('immediately releases the request when the caller disconnects, even if the DB ignores abort', async () => {
    vi.useFakeTimers();
    search.mockImplementation(() => new Promise(() => {}));
    const controller = new AbortController();
    const promise = respond(controller.signal);
    const assertion = expect(promise).rejects.toMatchObject({
      status: 408,
      response: { code: 'CHATBOT_CANCELLED' },
    });
    controller.abort('private-caller-abort-reason');
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('requires the authenticated caller even without conversation context', async () => {
    await expect(service.respond('Khóa của tôi', requestId)).rejects.toMatchObject({
      response: { code: 'CHATBOT_REQUEST_INVALID' },
    });
    expect(search).not.toHaveBeenCalled();
  });
});
