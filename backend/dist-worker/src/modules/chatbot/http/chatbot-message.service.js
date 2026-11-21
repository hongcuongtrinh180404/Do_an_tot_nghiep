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
var ChatbotMessageService_1;
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ChatbotAiError } from '../chatbot.errors.js';
import { ChatbotConversationService } from '../services/chatbot-conversation.service.js';
import { CHATBOT_HTTP_TIMEOUT_MS } from './chatbot-http.constants.js';
import { mapChatbotHttpError } from './chatbot-http.errors.js';
import { ChatbotContextService } from './chatbot-context.service.js';
import { projectChatbotReply } from './chatbot-response.projection.js';
let ChatbotMessageService = ChatbotMessageService_1 = class ChatbotMessageService {
    conversations;
    contexts;
    logger = new Logger(ChatbotMessageService_1.name);
    constructor(conversations, contexts) {
        this.conversations = conversations;
        this.contexts = contexts;
    }
    async respond(message, requestId, callerSignal, conversation) {
        const deadline = new AbortController();
        const signal = callerSignal
            ? AbortSignal.any([callerSignal, deadline.signal])
            : deadline.signal;
        let timedOut = false;
        let onAbort;
        let timer;
        try {
            if (signal.aborted)
                throw new ChatbotAiError('CHATBOT_CANCELLED');
            if (!conversation?.userId)
                throw new ChatbotAiError('CHATBOT_REQUEST_INVALID');
            const context = conversation?.context
                ? this.contexts.readConversation(conversation.userId, conversation.context)
                : undefined;
            const interrupted = new Promise((_resolve, reject) => {
                onAbort = () => reject(new ChatbotAiError(timedOut ? 'CHATBOT_TIMEOUT' : 'CHATBOT_CANCELLED'));
                signal.addEventListener('abort', onAbort, { once: true });
            });
            timer = setTimeout(() => {
                timedOut = true;
                deadline.abort();
            }, CHATBOT_HTTP_TIMEOUT_MS);
            timer.unref();
            const reply = await Promise.race([
                this.conversations.respond(message, {
                    userId: conversation.userId,
                    requestId,
                    signal,
                    ...(context ? { context } : {}),
                }),
                interrupted,
            ]);
            if (signal.aborted)
                throw new ChatbotAiError(timedOut ? 'CHATBOT_TIMEOUT' : 'CHATBOT_CANCELLED');
            return {
                ...projectChatbotReply(reply),
                requestId,
                ...(reply.nextContext ? { context: this.contexts.createConversation(conversation.userId, reply.nextContext) } : {}),
            };
        }
        catch (error) {
            const safeError = mapChatbotHttpError(callerSignal?.aborted
                ? new ChatbotAiError('CHATBOT_CANCELLED')
                : timedOut
                    ? new ChatbotAiError('CHATBOT_TIMEOUT')
                    : error, requestId);
            const body = safeError.getResponse();
            this.logger.warn(JSON.stringify({ requestId, code: body.code }));
            throw safeError;
        }
        finally {
            if (timer)
                clearTimeout(timer);
            if (onAbort)
                signal.removeEventListener('abort', onAbort);
        }
    }
};
ChatbotMessageService = ChatbotMessageService_1 = __decorate([
    Injectable(),
    __param(0, Inject(ChatbotConversationService)),
    __param(1, Inject(ChatbotContextService)),
    __metadata("design:paramtypes", [ChatbotConversationService,
        ChatbotContextService])
], ChatbotMessageService);
export { ChatbotMessageService };
//# sourceMappingURL=chatbot-message.service.js.map