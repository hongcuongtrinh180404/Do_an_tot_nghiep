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

/** HTTP surface only; JWT authentication is provided by the application's AuthModule. */
@Module({
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
export class ChatbotHttpModule {}
