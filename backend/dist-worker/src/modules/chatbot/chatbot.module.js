var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatbotAiClient } from './chatbot-ai.client.js';
import { CHATBOT_CONFIG, CHATBOT_ENV_KEYS, CHATBOT_OPENAI_CLIENT, parseChatbotConfig, } from './chatbot.config.js';
let ChatbotModule = class ChatbotModule {
};
ChatbotModule = __decorate([
    Module({
        imports: [ConfigModule],
        providers: [
            {
                provide: CHATBOT_CONFIG,
                inject: [ConfigService],
                useFactory: (config) => parseChatbotConfig(Object.fromEntries(CHATBOT_ENV_KEYS.map((key) => [key, config.get(key)]))),
            },
            {
                provide: CHATBOT_OPENAI_CLIENT,
                inject: [CHATBOT_CONFIG],
                useFactory: (config) => config.enabled
                    ? new OpenAI({
                        apiKey: config.apiKey,
                        baseURL: config.baseUrl,
                        timeout: config.timeoutMs,
                        maxRetries: 0,
                        logLevel: 'off',
                    })
                    : null,
            },
            ChatbotAiClient,
        ],
        exports: [ChatbotAiClient],
    })
], ChatbotModule);
export { ChatbotModule };
//# sourceMappingURL=chatbot.module.js.map