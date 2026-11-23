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
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { ChatbotAiError } from '../chatbot.errors.js';
import { parseSearchCoursesArguments } from '../tools/search-courses.contract.js';
import { validateConversationContext } from '../tools/conversation-context.js';
export const CHATBOT_CONTEXT_MAX_LENGTH = 8192;
export const CHATBOT_CONTEXT_TTL_MS = 30 * 60 * 1000;
export class ChatbotContextError extends Error {
    constructor() {
        super('The chatbot conversation context is invalid or expired.');
    }
}
let ChatbotContextService = class ChatbotContextService {
    config;
    constructor(config) {
        this.config = config;
    }
    signature(payload, userId, version = 1) {
        const secret = this.config.get('JWT_SECRET');
        if (!secret)
            throw new ChatbotAiError('CHATBOT_CONFIG_INVALID');
        return createHmac('sha256', secret)
            .update(`${version === 1 ? 'mindly:chatbot-search-context:v1' : `mindly:chatbot-conversation-context:v${version}`}\0${userId}\0${payload}`)
            .digest();
    }
    create(userId, result) {
        const state = {
            v: 1,
            expiresAt: Date.now() + CHATBOT_CONTEXT_TTL_MS,
            filters: parseSearchCoursesArguments(JSON.stringify(result.filtersApplied)),
            lowestPrice: result.items.length
                ? Math.min(...result.items.map((item) => item.price))
                : null,
            hasMore: result.hasMore,
        };
        const payload = Buffer.from(JSON.stringify(state)).toString('base64url');
        return `${payload}.${this.signature(payload, userId).toString('hex')}`;
    }
    read(userId, token) {
        const invalid = () => new ChatbotContextError();
        if (typeof token !== 'string' ||
            token.length > CHATBOT_CONTEXT_MAX_LENGTH ||
            !/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/.test(token))
            throw invalid();
        const [payload, mac] = token.split('.');
        if (!timingSafeEqual(Buffer.from(mac, 'hex'), this.signature(payload, userId)))
            throw invalid();
        try {
            const state = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
            if (state.v !== 1 ||
                typeof state.expiresAt !== 'number' ||
                !Number.isSafeInteger(state.expiresAt) ||
                state.expiresAt <= Date.now() ||
                typeof state.hasMore !== 'boolean' ||
                (state.lowestPrice !== null &&
                    (typeof state.lowestPrice !== 'number' ||
                        !Number.isSafeInteger(state.lowestPrice) ||
                        state.lowestPrice < 0)))
                throw invalid();
            return {
                filters: parseSearchCoursesArguments(JSON.stringify(state.filters)),
                lowestPrice: state.lowestPrice,
                hasMore: state.hasMore,
            };
        }
        catch {
            throw invalid();
        }
    }
    createConversation(userId, context) {
        const state = validateConversationContext(context);
        const payload = Buffer.from(JSON.stringify({
            v: 3, expiresAt: Date.now() + CHATBOT_CONTEXT_TTL_MS, state,
        })).toString('base64url');
        const token = `${payload}.${this.signature(payload, userId, 3).toString('hex')}`;
        if (token.length > CHATBOT_CONTEXT_MAX_LENGTH)
            throw new ChatbotContextError();
        return token;
    }
    readConversation(userId, token) {
        if (typeof token !== 'string' || token.length > CHATBOT_CONTEXT_MAX_LENGTH
            || !/^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/.test(token))
            throw new ChatbotContextError();
        const [payload, mac] = token.split('.');
        const version = [3, 2].find((value) => timingSafeEqual(Buffer.from(mac, 'hex'), this.signature(payload, userId, value)));
        if (!version) {
            return { mode: 'catalog', list: { kind: 'catalog', ...this.read(userId, token), ids: [] } };
        }
        try {
            const envelope = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
            if (envelope.v !== version || typeof envelope.expiresAt !== 'number'
                || !Number.isSafeInteger(envelope.expiresAt) || envelope.expiresAt <= Date.now()
                || Object.keys(envelope).some((key) => !['v', 'expiresAt', 'state'].includes(key))) {
                throw new ChatbotContextError();
            }
            const state = validateConversationContext(envelope.state);
            if (version === 2 && state.business)
                throw new ChatbotContextError();
            return state;
        }
        catch {
            throw new ChatbotContextError();
        }
    }
};
ChatbotContextService = __decorate([
    Injectable(),
    __param(0, Inject(ConfigService)),
    __metadata("design:paramtypes", [ConfigService])
], ChatbotContextService);
export { ChatbotContextService };
//# sourceMappingURL=chatbot-context.service.js.map