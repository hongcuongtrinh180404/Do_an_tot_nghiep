import { Logger } from '@nestjs/common';
import OpenAI, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
} from 'openai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatbotAiClient } from '../chatbot-ai.client.js';
import { parseChatbotConfig, type ChatbotConfig } from '../chatbot.config.js';
import { ChatbotAiError } from '../chatbot.errors.js';
import type {
  ChatbotCompletionInput,
  ChatbotMessage,
  ChatbotToolCall,
  ChatbotToolDefinition,
} from '../chatbot.types.js';

const config = parseChatbotConfig({
  CHATBOT_ENABLED: true,
  CHATBOT_API_KEY: 'synthetic-private-api-key',
  CHATBOT_BASE_URL: 'https://chatbot.example/v1',
  CHATBOT_MODEL: 'synthetic/chat-model',
  CHATBOT_TIMEOUT_MS: 17000,
  CHATBOT_MAX_OUTPUT_TOKENS: 512,
});
const messages: ChatbotMessage[] = [
  { role: 'system', content: 'private-system-prompt' },
  { role: 'user', content: 'private-user-message' },
];
const tool: ChatbotToolDefinition = {
  type: 'function',
  function: {
    name: 'read_synthetic_progress',
    description: 'Read a synthetic progress record.',
    parameters: {
      type: 'object',
      properties: { recordId: { type: 'string' } },
      required: ['recordId'],
      additionalProperties: false,
    },
  },
};

function toolCall(
  id = 'call_1',
  args = '{"recordId":"synthetic-record"}',
): ChatbotToolCall {
  return {
    id,
    type: 'function',
    function: { name: tool.function.name, arguments: args },
  };
}

function response(
  message: Record<string, unknown> = {
    role: 'assistant',
    content: 'private-assistant-response',
  },
  finishReason = 'stop',
  overrides: Record<string, unknown> = {},
) {
  return {
    id: 'synthetic-response-id',
    model: 'synthetic/returned-model',
    choices: [{ index: 0, message, finish_reason: finishReason }],
    usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
    ...overrides,
  };
}

describe('ChatbotAiClient', () => {
  let create: ReturnType<typeof vi.fn>;
  let client: ChatbotAiClient;
  let log: ReturnType<typeof vi.spyOn>;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    create = vi.fn().mockResolvedValue(response());
    client = new ChatbotAiClient(config, {
      chat: { completions: { create } },
    } as unknown as OpenAI);
    log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('sends a single non-streaming request with isolated settings and normalizes a text response', async () => {
    const requestId = 'b6077b89-cd46-4002-a01b-aabbccddeeff';
    const signal = new AbortController().signal;
    const result = await client.complete({ messages, requestId, signal });

    expect(create).toHaveBeenCalledExactlyOnceWith(
      {
        model: config.model,
        messages,
        tool_choice: 'none',
        stream: false,
        temperature: 0.2,
        max_tokens: 512,
      },
      { timeout: 17000, maxRetries: 0, signal },
    );
    expect(result).toMatchObject({
      requestId,
      providerResponseId: 'synthetic-response-id',
      model: 'synthetic/returned-model',
      assistantMessage: {
        role: 'assistant',
        content: 'private-assistant-response',
      },
      finishReason: 'stop',
      durationMs: expect.any(Number),
      usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
    });
    expect(log).toHaveBeenCalledOnce();
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([undefined, 'auto', 'none'] as const)(
    'sends tools and toolChoice=%s',
    async (toolChoice) => {
      await client.complete({ messages, tools: [tool], toolChoice });
      expect(create.mock.calls[0][0]).toMatchObject({
        tools: [tool],
        tool_choice: toolChoice ?? 'auto',
      });
    },
  );

  it('omits empty tools and uses none when no functions are available', async () => {
    await client.complete({ messages, tools: [], toolChoice: 'auto' });
    expect(create.mock.calls[0][0]).not.toHaveProperty('tools');
    expect(create.mock.calls[0][0].tool_choice).toBe('none');
  });

  it('preserves multiple function calls, nullable content and reasoning in a continuation', async () => {
    const calls = [
      toolCall('call_1'),
      toolCall('call_2', ' { "recordId" : "other" } '),
    ];
    create.mockResolvedValueOnce(
      response(
        {
          role: 'assistant',
          content: null,
          tool_calls: calls,
          reasoning_content: 'private-provider-reasoning',
        },
        'tool_calls',
      ),
    );
    const first = await client.complete({ messages, tools: [tool] });
    expect(first.assistantMessage).toEqual({
      role: 'assistant',
      content: null,
      tool_calls: calls,
      reasoning_content: 'private-provider-reasoning',
    });
    expect(first.finishReason).toBe('tool_calls');

    const continuation: ChatbotMessage[] = [
      ...messages,
      first.assistantMessage,
      { role: 'tool', tool_call_id: 'call_1', content: '{"progress":37}' },
      { role: 'tool', tool_call_id: 'call_2', content: '{"progress":62}' },
    ];
    const final = await client.complete({
      messages: continuation,
      tools: [tool],
      toolChoice: 'none',
    });
    expect(create.mock.calls[1][0].messages).toEqual(continuation);
    expect(create.mock.calls[1][0].tool_choice).toBe('none');
    expect(final.finishReason).toBe('stop');
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('accepts content alongside tool calls', async () => {
    create.mockResolvedValue(
      response(
        {
          role: 'assistant',
          content: 'Checking progress.',
          tool_calls: [toolCall()],
        },
        'tool_calls',
      ),
    );
    expect(
      (await client.complete({ messages, tools: [tool] })).assistantMessage
        .content,
    ).toBe('Checking progress.');
  });

  it.each([' { "recordId" : "one" } ', '{"broken":', '', 'null'])(
    'keeps arguments verbatim for the future authorized executor (%j)',
    async (args) => {
      create.mockResolvedValue(
        response(
          {
            role: 'assistant',
            content: null,
            tool_calls: [toolCall('call_raw', args)],
          },
          'tool_calls',
        ),
      );
      const result = await client.complete({ messages, tools: [tool] });
      expect(result.assistantMessage.tool_calls?.[0].function.arguments).toBe(
        args,
      );
      expect(create).toHaveBeenCalledOnce();
    },
  );

  it.each([
    ['null payload', null],
    ['missing choices', {}],
    ['empty choices', response(undefined, 'stop', { choices: [] })],
    ['multiple choices', response(undefined, 'stop', { choices: [{}, {}] })],
    ['null choice', response(undefined, 'stop', { choices: [null] })],
    ['missing content', response({ role: 'assistant' })],
    ['wrong role', response({ role: 'user', content: 'text' })],
    [
      'non-text content',
      response({ role: 'assistant', content: { text: 'text' } }),
    ],
    ['null empty response', response({ role: 'assistant', content: null })],
    ['blank response', response({ role: 'assistant', content: ' \n ' })],
    ['missing model', response(undefined, 'stop', { model: undefined })],
    ['missing response id', response(undefined, 'stop', { id: '' })],
    ['unknown finish reason', response(undefined, 'unexpected')],
    ['legacy function_call', response(undefined, 'function_call')],
    [
      'tool_calls without calls',
      response({ role: 'assistant', content: 'text' }, 'tool_calls'),
    ],
    [
      'calls with stop',
      response({ role: 'assistant', content: null, tool_calls: [toolCall()] }),
    ],
    [
      'non-array calls',
      response(
        { role: 'assistant', content: null, tool_calls: {} },
        'tool_calls',
      ),
    ],
    [
      'null call',
      response(
        { role: 'assistant', content: null, tool_calls: [null] },
        'tool_calls',
      ),
    ],
    [
      'blank call id',
      response(
        { role: 'assistant', content: null, tool_calls: [toolCall(' ')] },
        'tool_calls',
      ),
    ],
    [
      'duplicate call ids',
      response(
        {
          role: 'assistant',
          content: null,
          tool_calls: [toolCall(), toolCall()],
        },
        'tool_calls',
      ),
    ],
    [
      'custom tool',
      response(
        {
          role: 'assistant',
          content: null,
          tool_calls: [{ id: 'call_1', type: 'custom', custom: {} }],
        },
        'tool_calls',
      ),
    ],
    [
      'non-string arguments',
      response(
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              ...toolCall(),
              function: { name: tool.function.name, arguments: {} },
            },
          ],
        },
        'tool_calls',
      ),
    ],
  ])('rejects malformed responses: %s', async (_name, payload) => {
    create.mockResolvedValue(payload);
    await expect(
      client.complete({ messages, tools: [tool] }),
    ).rejects.toMatchObject({
      code: 'CHATBOT_RESPONSE_INVALID',
      retryable: false,
    });
  });

  it('rejects truncated tool calls even when their outer structure is valid', async () => {
    create.mockResolvedValue(
      response(
        {
          role: 'assistant',
          content: null,
          tool_calls: [toolCall('call_1', '{"recordId":')],
        },
        'length',
      ),
    );
    await expect(
      client.complete({ messages, tools: [tool] }),
    ).rejects.toMatchObject({
      code: 'CHATBOT_RESPONSE_INCOMPLETE',
    });
  });

  it.each([
    response(undefined, 'content_filter'),
    response({
      role: 'assistant',
      content: null,
      refusal: 'private-refusal-content',
    }),
  ])('classifies blocked/refused responses', async (payload) => {
    create.mockResolvedValue(payload);
    await expect(client.complete({ messages })).rejects.toMatchObject({
      code: 'CHATBOT_RESPONSE_BLOCKED',
    });
  });

  it.each([
    undefined,
    null,
    { prompt_tokens: 1, completion_tokens: -1, total_tokens: 0 },
    { prompt_tokens: '1', completion_tokens: 1, total_tokens: 2 },
    { prompt_tokens: 1 },
    { prompt_tokens: 1, completion_tokens: 0.5, total_tokens: 1.5 },
  ])('omits unavailable or invalid token usage (%j)', async (usage) => {
    create.mockResolvedValue(response(undefined, 'stop', { usage }));
    expect(await client.complete({ messages })).not.toHaveProperty('usage');
  });

  it('rejects disabled and locally invalid requests without contacting the provider', async () => {
    const disabled = new ChatbotAiClient(parseChatbotConfig({}), null);
    await expect(disabled.complete({ messages })).rejects.toMatchObject({
      code: 'CHATBOT_DISABLED',
    });
    await expect(client.complete({ messages: [] })).rejects.toMatchObject({
      code: 'CHATBOT_REQUEST_INVALID',
    });
    await expect(
      client.complete({
        messages,
        toolChoice: 'required',
      } as unknown as ChatbotCompletionInput),
    ).rejects.toMatchObject({ code: 'CHATBOT_REQUEST_INVALID' });
    expect(create).not.toHaveBeenCalled();
  });

  it('does not dispatch an already cancelled request', async () => {
    await expect(
      client.complete({
        messages,
        signal: AbortSignal.abort('private-abort-reason'),
      }),
    ).rejects.toMatchObject({ code: 'CHATBOT_CANCELLED', retryable: false });
    expect(create).not.toHaveBeenCalled();
  });

  it('drops a response if its caller cancelled while the provider was responding', async () => {
    const controller = new AbortController();
    create.mockImplementation(() => {
      controller.abort('private-abort-reason');
      return Promise.resolve(response());
    });
    await expect(
      client.complete({ messages, signal: controller.signal }),
    ).rejects.toMatchObject({ code: 'CHATBOT_CANCELLED' });
    expect(log).not.toHaveBeenCalled();
  });

  it.each([
    [400, 'CHATBOT_REQUEST_INVALID', false],
    [401, 'CHATBOT_PROVIDER_AUTH', false],
    [403, 'CHATBOT_PROVIDER_AUTH', false],
    [404, 'CHATBOT_REQUEST_INVALID', false],
    [408, 'CHATBOT_TIMEOUT', true],
    [422, 'CHATBOT_REQUEST_INVALID', false],
    [429, 'CHATBOT_RATE_LIMITED', true],
    [500, 'CHATBOT_PROVIDER_UNAVAILABLE', true],
    [503, 'CHATBOT_PROVIDER_UNAVAILABLE', true],
  ])(
    'normalizes provider HTTP %i without leaking its error or retrying',
    async (status, code, retryable) => {
      const secret = 'private-provider-error-sentinel';
      const sdkError = new APIError(
        status,
        { message: secret },
        secret,
        new Headers({
          authorization: `Bearer ${config.apiKey}`,
          'x-request-id': secret,
        }),
      );
      create.mockRejectedValue(sdkError);
      const error: unknown = await client
        .complete({ messages })
        .catch((error: unknown) => error);
      expect(error).toBeInstanceOf(ChatbotAiError);
      expect(error).toMatchObject({ code, retryable });
      expect(error).not.toHaveProperty('cause');
      expect(error).not.toHaveProperty('originalError');
      expect(error).not.toHaveProperty('headers');
      expect(error).not.toHaveProperty('getStatus');
      expect(
        String(error) + JSON.stringify(error) + JSON.stringify(warn.mock.calls),
      ).not.toContain(secret);
      expect(create).toHaveBeenCalledOnce();
    },
  );

  it.each([
    [new APIConnectionTimeoutError(), 'CHATBOT_TIMEOUT', true],
    [
      new APIConnectionError({ message: 'private-network-detail' }),
      'CHATBOT_PROVIDER_UNAVAILABLE',
      true,
    ],
    [new APIUserAbortError(), 'CHATBOT_CANCELLED', false],
    [new Error('private-unknown-detail'), 'CHATBOT_PROVIDER_ERROR', false],
  ])('normalizes SDK/network failures: %s', async (error, code, retryable) => {
    create.mockRejectedValue(error);
    await expect(client.complete({ messages })).rejects.toMatchObject({
      code,
      retryable,
    });
    expect(create).toHaveBeenCalledOnce();
  });

  it('logs only safe metadata and replaces an untrusted request id', async () => {
    const privateValues = {
      apiKey: config.apiKey,
      system: 'private-system-prompt',
      user: 'private-user-message',
      toolResult: 'private-tool-result',
      assistant: 'private-assistant-response',
      reasoning: 'private-reasoning',
      arguments: 'private-tool-arguments',
      requestId: 'private-request-id',
      responseId: 'private-provider-response-id',
      model: 'private-provider-model-metadata',
    };
    create.mockResolvedValue(
      response(
        {
          role: 'assistant',
          content: privateValues.assistant,
          reasoning_content: privateValues.reasoning,
          tool_calls: [toolCall('call_1', privateValues.arguments)],
        },
        'tool_calls',
        { id: privateValues.responseId, model: privateValues.model },
      ),
    );
    const result = await client.complete({
      messages: [
        ...messages,
        {
          role: 'tool',
          tool_call_id: 'old_call',
          content: privateValues.toolResult,
        },
      ],
      tools: [tool],
      requestId: privateValues.requestId,
    });
    expect(result.requestId).toMatch(/^[0-9a-f-]{36}$/);
    const logs = JSON.stringify([...log.mock.calls, ...warn.mock.calls]);
    for (const value of Object.values(privateValues))
      expect(logs).not.toContain(value);
    expect(JSON.parse(log.mock.calls[0][0] as string)).toEqual({
      requestId: result.requestId,
      model: config.model,
      durationMs: expect.any(Number),
      finishReason: 'tool_calls',
      toolCalls: 1,
      usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
    });
  });

  describe('real SDK transport with a synthetic fetch', () => {
    function transportClient(
      fetch: typeof globalThis.fetch,
      overrides: Partial<ChatbotConfig> = {},
    ) {
      const settings = { ...config, ...overrides };
      // Leave SDK retries at their default here: complete() must override them to zero.
      const sdk = new OpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.baseUrl,
        fetch,
        logLevel: 'off',
      });
      return new ChatbotAiClient(settings, sdk);
    }

    it('sends one HTTP request on rate limiting despite the SDK retry default', async () => {
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              error: { message: 'private-rate-limit-response' },
            }),
            {
              status: 429,
              headers: {
                'content-type': 'application/json',
                'retry-after': '0',
              },
            },
          ),
        );
      await expect(
        transportClient(fetch).complete({ messages }),
      ).rejects.toMatchObject({ code: 'CHATBOT_RATE_LIMITED' });
      expect(fetch).toHaveBeenCalledOnce();
    });

    it('propagates in-flight cancellation to the actual fetch signal', async () => {
      const controller = new AbortController();
      let started!: () => void;
      const ready = new Promise<void>((resolve) => {
        started = resolve;
      });
      let receivedSignal: AbortSignal | null | undefined;
      const fetch = vi
        .fn<typeof globalThis.fetch>()
        .mockImplementation((_url, options) => {
          receivedSignal = options?.signal;
          return new Promise<Response>((_resolve, reject) => {
            receivedSignal?.addEventListener(
              'abort',
              () => {
                reject(new DOMException('Synthetic abort', 'AbortError'));
              },
              { once: true },
            );
            started();
          });
        });
      const result = transportClient(fetch).complete({
        messages,
        signal: controller.signal,
      });
      const assertion = expect(result).rejects.toMatchObject({
        code: 'CHATBOT_CANCELLED',
      });
      await ready;
      controller.abort('private-abort-reason');
      await assertion;
      expect(receivedSignal?.aborted).toBe(true);
      expect(fetch).toHaveBeenCalledOnce();
    });

    it('enforces the configured timeout through the SDK without a retry', async () => {
      vi.useFakeTimers();
      let started!: () => void;
      const ready = new Promise<void>((resolve) => {
        started = resolve;
      });
      const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(
        (_url, options) =>
          new Promise<Response>((_resolve, reject) => {
            options?.signal?.addEventListener(
              'abort',
              () => {
                reject(new DOMException('Synthetic timeout', 'AbortError'));
              },
              { once: true },
            );
            started();
          }),
      );
      const result = transportClient(fetch, { timeoutMs: 1000 }).complete({
        messages,
      });
      const assertion = expect(result).rejects.toMatchObject({
        code: 'CHATBOT_TIMEOUT',
      });
      await ready;
      await vi.advanceTimersByTimeAsync(1001);
      await assertion;
      expect(fetch).toHaveBeenCalledOnce();
    });
  });
});
