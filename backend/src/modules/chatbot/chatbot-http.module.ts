import { Module } from '@nestjs/common';
import { ThrottlerStorageService } from '@nestjs/throttler';
import { ChatbotSearchModule } from './chatbot-search.module.js';
import { ChatbotController } from './http/chatbot.controller.js';
import { ChatbotMessageService } from './http/chatbot-message.service.js';
import { ChatbotRateLimitGuard } from './http/chatbot-rate-limit.guard.js';
import { CHATBOT_HTTP_RATE_STORAGE } from './http/chatbot-http.constants.js';

/** HTTP surface only; JWT authentication is provided by the application's AuthModule. */
@Module({
  imports: [ChatbotSearchModule],
  controllers: [ChatbotController],
  providers: [
    { provide: CHATBOT_HTTP_RATE_STORAGE, useClass: ThrottlerStorageService },
    ChatbotRateLimitGuard,
    ChatbotMessageService,
  ],
})
export class ChatbotHttpModule {}
