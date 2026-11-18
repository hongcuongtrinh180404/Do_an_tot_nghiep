import Joi from 'joi';
import { ChatbotAiError } from './chatbot.errors.js';

export const CHATBOT_CONFIG = Symbol('CHATBOT_CONFIG');
export const CHATBOT_OPENAI_CLIENT = Symbol('CHATBOT_OPENAI_CLIENT');

export const CHATBOT_ENV_KEYS = [
  'CHATBOT_ENABLED',
  'CHATBOT_API_KEY',
  'CHATBOT_BASE_URL',
  'CHATBOT_MODEL',
  'CHATBOT_TIMEOUT_MS',
  'CHATBOT_MAX_OUTPUT_TOKENS',
] as const;

/** Reused by application env validation and the standalone client/smoke test. */
export const chatbotEnvSchema = Joi.object({
  CHATBOT_ENABLED: Joi.boolean().default(false),
  CHATBOT_API_KEY: Joi.string()
    .trim()
    .when('CHATBOT_ENABLED', {
      is: true,
      // oxlint-disable-next-line unicorn/no-thenable -- Joi names its conditional branch "then".
      then: Joi.required(),
      otherwise: Joi.allow('').default(''),
    })
    .messages({
      'any.required': 'CHATBOT_API_KEY is required when CHATBOT_ENABLED=true',
      'string.empty':
        'CHATBOT_API_KEY must not be empty when CHATBOT_ENABLED=true',
      'string.base': 'CHATBOT_API_KEY must be a string',
    }),
  CHATBOT_BASE_URL: Joi.string()
    .trim()
    .uri({ scheme: ['https'] })
    .custom((value: string, helpers) => {
      const url = new URL(value);
      if (url.username || url.password || url.search || url.hash) {
        return helpers.error('any.invalid');
      }
      return value.replace(/\/+$/, '');
    })
    .default('https://api.river.ai/v1')
    .messages({
      'string.uri': 'CHATBOT_BASE_URL must be an HTTPS URL',
      'string.uriCustomScheme': 'CHATBOT_BASE_URL must be an HTTPS URL',
      'any.invalid':
        'CHATBOT_BASE_URL must not contain credentials, a query or a fragment',
      'any.custom': 'CHATBOT_BASE_URL must be a valid HTTPS URL',
    }),
  CHATBOT_MODEL: Joi.string()
    .trim()
    .pattern(/^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/)
    .default('deepseek-ai/DeepSeek-V4.1-Flash-1017')
    .messages({ 'string.pattern.base': 'CHATBOT_MODEL has an invalid format' }),
  CHATBOT_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1000)
    .max(120000)
    .default(30000),
  CHATBOT_MAX_OUTPUT_TOKENS: Joi.number()
    .integer()
    .min(1)
    .max(8192)
    .default(2048),
});

export interface ChatbotConfig {
  readonly enabled: boolean;
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
  readonly timeoutMs: number;
  readonly maxOutputTokens: number;
}

interface ValidatedChatbotEnv {
  CHATBOT_ENABLED: boolean;
  CHATBOT_API_KEY: string;
  CHATBOT_BASE_URL: string;
  CHATBOT_MODEL: string;
  CHATBOT_TIMEOUT_MS: number;
  CHATBOT_MAX_OUTPUT_TOKENS: number;
}

export function parseChatbotConfig(
  env: Record<string, unknown>,
): ChatbotConfig {
  const selected = Object.fromEntries(
    CHATBOT_ENV_KEYS.map((key) => [key, env[key]]),
  );
  const { value, error } = chatbotEnvSchema.validate(selected, {
    abortEarly: false,
  });
  if (error) {
    const fields = [
      ...new Set(error.details.map((detail) => String(detail.path[0]))),
    ];
    throw new ChatbotAiError('CHATBOT_CONFIG_INVALID', fields);
  }
  const config = value as ValidatedChatbotEnv;
  return Object.freeze({
    enabled: config.CHATBOT_ENABLED,
    apiKey: config.CHATBOT_API_KEY,
    baseUrl: config.CHATBOT_BASE_URL,
    model: config.CHATBOT_MODEL,
    timeoutMs: config.CHATBOT_TIMEOUT_MS,
    maxOutputTokens: config.CHATBOT_MAX_OUTPUT_TOKENS,
  });
}
