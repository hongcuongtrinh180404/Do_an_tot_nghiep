import 'reflect-metadata';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import OpenAI from 'openai';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatbotAiClient } from '../chatbot-ai.client.js';
import {
  CHATBOT_CONFIG,
  CHATBOT_ENV_KEYS,
  CHATBOT_OPENAI_CLIENT,
  type ChatbotConfig,
} from '../chatbot.config.js';
import { ChatbotModule } from '../chatbot.module.js';

@Injectable()
class ChatbotConsumer {
  constructor(@Inject(ChatbotAiClient) readonly client: ChatbotAiClient) {}
}

describe('ChatbotModule', () => {
  let module: TestingModule | undefined;

  async function compile(env: Record<string, unknown>) {
    const get = vi.fn((key: string) => env[key]);
    module = await Test.createTestingModule({
      imports: [ChatbotModule],
      providers: [ChatbotConsumer],
    })
      .overrideProvider(ConfigService)
      .useValue({ get })
      .compile();
    await module.init();
    return { module, get };
  }

  afterEach(async () => {
    await module?.close();
    module = undefined;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('exports an injectable client while disabled without initializing an SDK or fetching', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected network request'));
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const { module, get } = await compile({});
    const client = module.get(ChatbotConsumer).client;

    expect(client).toBeInstanceOf(ChatbotAiClient);
    expect(module.get(CHATBOT_OPENAI_CLIENT)).toBeNull();
    expect(get.mock.calls.map(([key]) => key)).toEqual([...CHATBOT_ENV_KEYS]);
    await expect(
      client.complete({ messages: [{ role: 'user', content: 'hello' }] }),
    ).rejects.toMatchObject({ code: 'CHATBOT_DISABLED' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('initializes its own SDK from CHATBOT settings without probing the provider', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected network request'));
    vi.stubEnv('OPENAI_LOG', 'debug');
    vi.stubEnv('OPENAI_API_KEY', 'unrelated-openai-key');
    vi.stubEnv('OPENAI_BASE_URL', 'https://unrelated.example/v1');
    const { module, get } = await compile({
      CHATBOT_ENABLED: 'true',
      CHATBOT_API_KEY: 'synthetic-chatbot-key',
      CHATBOT_BASE_URL: 'https://chatbot.example/v1/',
      CHATBOT_MODEL: 'chatbot-only-model',
      CHATBOT_TIMEOUT_MS: '12000',
      CHATBOT_MAX_OUTPUT_TOKENS: '1024',
      RIVER_API_KEY: 'unrelated-river-key',
      RIVER_MODEL_1: 'unrelated-river-model',
      RIVER_TIMEOUT_MS: '90000',
      GEMINI_API_KEY: 'unrelated-gemini-key',
    });
    const sdk = module.get<OpenAI>(CHATBOT_OPENAI_CLIENT);
    expect(sdk).toBeInstanceOf(OpenAI);
    expect(sdk.apiKey).toBe('synthetic-chatbot-key');
    expect(sdk.baseURL).toBe('https://chatbot.example/v1');
    expect(sdk.timeout).toBe(12000);
    expect(sdk.maxRetries).toBe(0);
    expect(sdk.logLevel).toBe('off');
    expect(module.get<ChatbotConfig>(CHATBOT_CONFIG)).toMatchObject({
      model: 'chatbot-only-model',
      maxOutputTokens: 1024,
    });
    expect(module.get(ChatbotConsumer).client).toBe(
      module.get(ChatbotAiClient),
    );
    expect(get.mock.calls.map(([key]) => key)).toEqual([...CHATBOT_ENV_KEYS]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fails at initialization when enabled without an explicit chatbot key', async () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected network request'));
    await expect(
      compile({
        CHATBOT_ENABLED: true,
        RIVER_API_KEY: 'must-not-be-used-as-fallback',
      }),
    ).rejects.toMatchObject({
      code: 'CHATBOT_CONFIG_INVALID',
      configurationFields: ['CHATBOT_API_KEY'],
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
