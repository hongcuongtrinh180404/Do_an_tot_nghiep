import { describe, expect, it } from 'vitest';
import { envValidationSchema } from '../../../config/env.validation.js';
import { parseChatbotConfig } from '../chatbot.config.js';
import { ChatbotAiError } from '../chatbot.errors.js';

describe('Chatbot configuration', () => {
  it('defaults to disabled without requiring a provider credential', () => {
    const config = parseChatbotConfig({});
    expect(config).toEqual({
      enabled: false,
      apiKey: '',
      baseUrl: 'https://api.river.ai/v1',
      model: 'deepseek-ai/DeepSeek-V4.1-Flash-1017',
      timeoutMs: 30000,
      maxOutputTokens: 2048,
    });
    expect(Object.isFrozen(config)).toBe(true);
  });

  it('parses explicit chatbot settings and normalizes the base URL', () => {
    expect(
      parseChatbotConfig({
        CHATBOT_ENABLED: 'true',
        CHATBOT_API_KEY: ' test-chatbot-credential ',
        CHATBOT_BASE_URL: 'https://provider.example/v1/',
        CHATBOT_MODEL: 'provider/chat-model',
        CHATBOT_TIMEOUT_MS: '45000',
        CHATBOT_MAX_OUTPUT_TOKENS: '4096',
      }),
    ).toEqual({
      enabled: true,
      apiKey: 'test-chatbot-credential',
      baseUrl: 'https://provider.example/v1',
      model: 'provider/chat-model',
      timeoutMs: 45000,
      maxOutputTokens: 4096,
    });
  });

  it.each([undefined, '', '   '])(
    'requires a nonblank key when enabled (%j)',
    (key) => {
      expect(() =>
        parseChatbotConfig({
          CHATBOT_ENABLED: true,
          CHATBOT_API_KEY: key,
        }),
      ).toThrowError(
        expect.objectContaining({
          code: 'CHATBOT_CONFIG_INVALID',
          configurationFields: ['CHATBOT_API_KEY'],
          message: expect.stringContaining('CHATBOT_API_KEY'),
        }),
      );
    },
  );

  it('accepts an empty key when explicitly disabled', () => {
    expect(
      parseChatbotConfig({
        CHATBOT_ENABLED: 'false',
        CHATBOT_API_KEY: '',
      }).enabled,
    ).toBe(false);
  });

  it('never falls back to River, Gemini or OpenAI environment variables', () => {
    const otherAiSettings = {
      AI_PRIMARY_PROVIDER: 'GEMINI',
      RIVER_API_KEY: 'river-credential',
      RIVER_API_KEY_1: 'river-credential-1',
      RIVER_BASE_URL: 'https://other.example/v1',
      RIVER_MODEL_1: 'other-model',
      RIVER_TIMEOUT_MS: '90000',
      GEMINI_API_KEY: 'gemini-credential',
      GEMINI_MODEL: 'gemini-model',
      OPENAI_API_KEY: 'openai-credential',
      OPENAI_BASE_URL: 'https://openai.example/v1',
    };
    expect(parseChatbotConfig(otherAiSettings)).toEqual(parseChatbotConfig({}));
    expect(() =>
      parseChatbotConfig({
        ...otherAiSettings,
        CHATBOT_ENABLED: true,
      }),
    ).toThrowError(
      expect.objectContaining({ configurationFields: ['CHATBOT_API_KEY'] }),
    );

    const chatbotSettings = {
      CHATBOT_ENABLED: true,
      CHATBOT_API_KEY: 'explicit-chatbot-credential',
      CHATBOT_MODEL: 'chatbot-model',
    };
    expect(
      parseChatbotConfig({ ...chatbotSettings, ...otherAiSettings }),
    ).toEqual(parseChatbotConfig(chatbotSettings));
  });

  it.each([
    ['CHATBOT_ENABLED', 'yes'],
    ['CHATBOT_TIMEOUT_MS', 'not-a-number'],
    ['CHATBOT_TIMEOUT_MS', 999],
    ['CHATBOT_TIMEOUT_MS', 120001],
    ['CHATBOT_TIMEOUT_MS', 1000.5],
    ['CHATBOT_MAX_OUTPUT_TOKENS', 0],
    ['CHATBOT_MAX_OUTPUT_TOKENS', 8193],
    ['CHATBOT_MAX_OUTPUT_TOKENS', 1.5],
    ['CHATBOT_BASE_URL', 'http://provider.example/v1'],
    ['CHATBOT_BASE_URL', 'not-a-url'],
    ['CHATBOT_BASE_URL', 'https://user:secret@provider.example/v1'],
    ['CHATBOT_BASE_URL', 'https://provider.example/v1?key=secret'],
    ['CHATBOT_BASE_URL', 'https://provider.example/v1#secret'],
    ['CHATBOT_MODEL', 'model\nlog-injection'],
    ['CHATBOT_MODEL', 'm'.repeat(201)],
  ])('rejects invalid %s (%j)', (field, value) => {
    expect(() => parseChatbotConfig({ [field]: value })).toThrowError(
      expect.objectContaining({
        code: 'CHATBOT_CONFIG_INVALID',
        configurationFields: [field],
      }),
    );
  });

  it.each([
    [1000, 1],
    [120000, 8192],
  ])('accepts timeout/token bounds %i/%i', (timeout, tokens) => {
    expect(
      parseChatbotConfig({
        CHATBOT_TIMEOUT_MS: timeout,
        CHATBOT_MAX_OUTPUT_TOKENS: tokens,
      }),
    ).toMatchObject({ timeoutMs: timeout, maxOutputTokens: tokens });
  });

  it('reports invalid field names without retaining secret configuration values', () => {
    const secret = 'private-config-sentinel';
    let caught: unknown;
    try {
      parseChatbotConfig({
        CHATBOT_ENABLED: true,
        CHATBOT_API_KEY: { secret },
        CHATBOT_BASE_URL: `https://user:${secret}@provider.example/v1`,
        CHATBOT_MODEL: `model\n${secret}`,
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ChatbotAiError);
    expect(caught).toMatchObject({
      configurationFields: [
        'CHATBOT_API_KEY',
        'CHATBOT_BASE_URL',
        'CHATBOT_MODEL',
      ],
    });
    expect(String(caught) + JSON.stringify(caught)).not.toContain(secret);
  });

  it('applies the same conditional validation in the application environment schema', () => {
    const requiredAppEnv = {
      NODE_ENV: 'test',
      MONGODB_URI: 'mongodb://localhost:27017/chatbot-config-test',
      JWT_SECRET: 'synthetic-jwt-secret-for-test',
      JWT_REFRESH_SECRET: 'synthetic-refresh-secret-for-test',
    };
    const disabled = envValidationSchema.validate(requiredAppEnv);
    expect(disabled.error).toBeUndefined();
    expect(disabled.value.CHATBOT_ENABLED).toBe(false);

    const missingKey = envValidationSchema.validate({
      ...requiredAppEnv,
      CHATBOT_ENABLED: true,
    });
    expect(missingKey.error?.message).toContain('CHATBOT_API_KEY');

    const secret = 'private-url-sentinel';
    const invalidUrl = envValidationSchema.validate({
      ...requiredAppEnv,
      CHATBOT_ENABLED: true,
      CHATBOT_API_KEY: secret,
      CHATBOT_BASE_URL: `https://user:${secret}@provider.example/v1`,
    });
    expect(invalidUrl.error?.message).toContain('CHATBOT_BASE_URL');
    expect(invalidUrl.error?.message).not.toContain(secret);
  });
});
