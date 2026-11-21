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
import { HttpStatus, Inject, Injectable, UnauthorizedException, } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CHATBOT_HTTP_RATE_LIMIT, CHATBOT_HTTP_RATE_STORAGE, CHATBOT_HTTP_RATE_TTL_MS, } from './chatbot-http.constants.js';
import { chatbotHttpException } from './chatbot-http.errors.js';
let ChatbotRateLimitGuard = class ChatbotRateLimitGuard extends ThrottlerGuard {
    constructor(storage, reflector) {
        super([
            {
                name: 'default',
                limit: CHATBOT_HTTP_RATE_LIMIT,
                ttl: CHATBOT_HTTP_RATE_TTL_MS,
            },
        ], storage, reflector);
    }
    async getTracker(request) {
        const user = request.user;
        if (!user || typeof user.id !== 'string' || !user.id)
            throw new UnauthorizedException();
        return `chatbot-user:${user.id}`;
    }
    async throwThrottlingException() {
        throw chatbotHttpException('CHATBOT_HTTP_RATE_LIMITED', HttpStatus.TOO_MANY_REQUESTS, 'Bạn đã gửi quá nhiều câu hỏi. Vui lòng chờ trước khi thử lại.', true);
    }
};
ChatbotRateLimitGuard = __decorate([
    Injectable(),
    __param(0, Inject(CHATBOT_HTTP_RATE_STORAGE)),
    __param(1, Inject(Reflector)),
    __metadata("design:paramtypes", [Object, Reflector])
], ChatbotRateLimitGuard);
export { ChatbotRateLimitGuard };
//# sourceMappingURL=chatbot-rate-limit.guard.js.map