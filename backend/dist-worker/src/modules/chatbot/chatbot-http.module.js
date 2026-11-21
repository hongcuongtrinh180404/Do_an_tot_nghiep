var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerStorageService } from '@nestjs/throttler';
import { ChatbotSearchModule } from './chatbot-search.module.js';
import { ChatbotController } from './http/chatbot.controller.js';
import { ChatbotMessageService } from './http/chatbot-message.service.js';
import { ChatbotRateLimitGuard } from './http/chatbot-rate-limit.guard.js';
import { CHATBOT_HTTP_RATE_STORAGE } from './http/chatbot-http.constants.js';
import { ChatbotContextService } from './http/chatbot-context.service.js';
import { ChatbotLearningModule } from './chatbot-learning.module.js';
import { ChatbotConversationService } from './services/chatbot-conversation.service.js';
let ChatbotHttpModule = class ChatbotHttpModule {
};
ChatbotHttpModule = __decorate([
    Module({
        imports: [ConfigModule, ChatbotSearchModule, ChatbotLearningModule],
        controllers: [ChatbotController],
        providers: [
            { provide: CHATBOT_HTTP_RATE_STORAGE, useClass: ThrottlerStorageService },
            ChatbotRateLimitGuard,
            ChatbotMessageService,
            ChatbotContextService,
            ChatbotConversationService,
        ],
    })
], ChatbotHttpModule);
export { ChatbotHttpModule };
//# sourceMappingURL=chatbot-http.module.js.map