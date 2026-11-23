import type { Request, Response } from 'express';
import { ApiResponse } from '../../base/dto/api-response.dto.js';
import { CreateChatbotMessageDto } from './create-chatbot-message.dto.js';
import { ChatbotMessageService, type ChatbotMessageResponse } from './chatbot-message.service.js';
import { RoleEnum } from 'share-lib';
export declare class ChatbotController {
    private readonly messages;
    constructor(messages: ChatbotMessageService);
    createMessage(dto: CreateChatbotMessageDto, request: Request, response: Response, userId: string, role: RoleEnum): Promise<ApiResponse<ChatbotMessageResponse>>;
}
