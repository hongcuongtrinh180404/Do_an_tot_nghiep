import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { ApiResponse } from '../../base/dto/api-response.dto.js';
import { CreateChatbotMessageDto } from './create-chatbot-message.dto.js';
import {
  ChatbotMessageService,
  type ChatbotMessageResponse,
} from './chatbot-message.service.js';
import { ChatbotRateLimitGuard } from './chatbot-rate-limit.guard.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';

@Controller('chatbot')
@UseGuards(ChatbotRateLimitGuard)
export class ChatbotController {
  constructor(
    @Inject(ChatbotMessageService)
    private readonly messages: ChatbotMessageService,
  ) {}

  @Post('messages')
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  async createMessage(
    @Body(
      new ValidationPipe({
        expectedType: CreateChatbotMessageDto,
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        validationError: { target: false, value: false },
      }),
    )
    dto: CreateChatbotMessageDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @CurrentUser('id') userId: string,
  ): Promise<ApiResponse<ChatbotMessageResponse>> {
    const requestId = randomUUID();
    response.setHeader('X-Request-Id', requestId);
    const cancellation = new AbortController();
    const onClose = () => {
      if (!response.writableEnded) cancellation.abort();
    };
    response.once('close', onClose);
    if (request.aborted || response.destroyed) cancellation.abort();
    try {
      return ApiResponse.success(
        await this.messages.respond(
          dto.message,
          requestId,
          cancellation.signal,
          { userId, ...(dto.context ? { context: dto.context } : {}) },
        ),
      );
    } finally {
      response.off('close', onClose);
    }
  }
}
