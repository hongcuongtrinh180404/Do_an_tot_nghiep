var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Body, Controller, Header, HttpCode, HttpStatus, Inject, Post, Req, Res, UseGuards, ValidationPipe, } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ApiResponse } from '../../base/dto/api-response.dto.js';
import { CreateChatbotMessageDto } from './create-chatbot-message.dto.js';
import { ChatbotMessageService, } from './chatbot-message.service.js';
import { ChatbotRateLimitGuard } from './chatbot-rate-limit.guard.js';
import { CurrentUser } from '../../auth/decorators/current-user.decorator.js';
import { RoleEnum } from 'share-lib';
let ChatbotController = class ChatbotController {
    messages;
    constructor(messages) {
        this.messages = messages;
    }
    async createMessage(dto, request, response, userId, role) {
        const requestId = randomUUID();
        response.setHeader('X-Request-Id', requestId);
        const cancellation = new AbortController();
        const onClose = () => {
            if (!response.writableEnded)
                cancellation.abort();
        };
        response.once('close', onClose);
        if (request.aborted || response.destroyed)
            cancellation.abort();
        try {
            return ApiResponse.success(await this.messages.respond(dto.message, requestId, cancellation.signal, { userId, role, ...(dto.context ? { context: dto.context } : {}) }));
        }
        finally {
            response.off('close', onClose);
        }
    }
};
__decorate([
    Post('messages'),
    HttpCode(HttpStatus.OK),
    Header('Cache-Control', 'no-store'),
    __param(0, Body(new ValidationPipe({
        expectedType: CreateChatbotMessageDto,
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        validationError: { target: false, value: false },
    }))),
    __param(1, Req()),
    __param(2, Res({ passthrough: true })),
    __param(3, CurrentUser('id')),
    __param(4, CurrentUser('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateChatbotMessageDto, Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], ChatbotController.prototype, "createMessage", null);
ChatbotController = __decorate([
    Controller('chatbot'),
    UseGuards(ChatbotRateLimitGuard),
    __param(0, Inject(ChatbotMessageService)),
    __metadata("design:paramtypes", [ChatbotMessageService])
], ChatbotController);
export { ChatbotController };
//# sourceMappingURL=chatbot.controller.js.map