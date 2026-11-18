import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatbotAiClient } from './chatbot-ai.client.js';
import {
  CHATBOT_CONFIG,
  CHATBOT_ENV_KEYS,
  CHATBOT_OPENAI_CLIENT,
  parseChatbotConfig,
  type ChatbotConfig,
} from './chatbot.config.js';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: CHATBOT_CONFIG,
      inject: [ConfigService],
      useFactory: (config: ConfigService): ChatbotConfig =>
        parseChatbotConfig(
          Object.fromEntries(
            CHATBOT_ENV_KEYS.map((key) => [key, config.get<unknown>(key)]),
          ),
        ),
    },
    {
      provide: CHATBOT_OPENAI_CLIENT,
      inject: [CHATBOT_CONFIG],
      useFactory: (config: ChatbotConfig): OpenAI | null =>
        config.enabled
          ? new OpenAI({
              apiKey: config.apiKey,
              baseURL: config.baseUrl,
              timeout: config.timeoutMs,
              maxRetries: 0,
              // Override OPENAI_LOG too: SDK diagnostics may contain request/response bodies.
              logLevel: 'off',
            })
          : null,
    },
    ChatbotAiClient,
  ],
  exports: [ChatbotAiClient],
})
export class ChatbotModule {}
