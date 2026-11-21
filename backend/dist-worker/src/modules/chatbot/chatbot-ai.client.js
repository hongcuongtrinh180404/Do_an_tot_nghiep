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
var ChatbotAiClient_1;
import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CHATBOT_CONFIG, CHATBOT_OPENAI_CLIENT, } from './chatbot.config.js';
import { ChatbotAiError, normalizeChatbotError } from './chatbot.errors.js';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/;
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isToolCall(value) {
    return (isRecord(value) &&
        value.type === 'function' &&
        typeof value.id === 'string' &&
        value.id.trim().length > 0 &&
        isRecord(value.function) &&
        typeof value.function.name === 'string' &&
        /^[A-Za-z0-9_-]{1,128}$/.test(value.function.name) &&
        typeof value.function.arguments === 'string');
}
let ChatbotAiClient = ChatbotAiClient_1 = class ChatbotAiClient {
    config;
    client;
    logger = new Logger(ChatbotAiClient_1.name);
    constructor(config, client) {
        this.config = config;
        this.client = client;
    }
    async complete(input) {
        const startedAt = Date.now();
        const requestId = input.requestId &&
            UUID_PATTERN.test(input.requestId) &&
            input.requestId !== this.config.apiKey
            ? input.requestId
            : randomUUID();
        try {
            if (!this.config.enabled || !this.client)
                throw new ChatbotAiError('CHATBOT_DISABLED');
            if (input.signal?.aborted)
                throw new ChatbotAiError('CHATBOT_CANCELLED');
            if (!Array.isArray(input.messages) ||
                input.messages.length === 0 ||
                (input.toolChoice !== undefined &&
                    !['auto', 'none'].includes(input.toolChoice))) {
                throw new ChatbotAiError('CHATBOT_REQUEST_INVALID');
            }
            const hasTools = Boolean(input.tools?.length);
            const completion = await this.client.chat.completions.create({
                model: this.config.model,
                messages: [...input.messages],
                ...(hasTools ? { tools: [...input.tools] } : {}),
                tool_choice: hasTools ? (input.toolChoice ?? 'auto') : 'none',
                stream: false,
                temperature: 0.2,
                max_tokens: this.config.maxOutputTokens,
            }, {
                timeout: this.config.timeoutMs,
                maxRetries: 0,
                signal: input.signal,
            });
            if (input.signal?.aborted)
                throw new ChatbotAiError('CHATBOT_CANCELLED');
            const result = this.readResponse(completion, requestId, Date.now() - startedAt);
            const model = MODEL_PATTERN.test(this.config.model) &&
                !this.config.model.includes(this.config.apiKey)
                ? this.config.model
                : '[redacted]';
            this.logger.log(JSON.stringify({
                requestId,
                model,
                durationMs: result.durationMs,
                finishReason: result.finishReason,
                toolCalls: result.assistantMessage.tool_calls?.length ?? 0,
                usage: result.usage,
            }));
            return result;
        }
        catch (error) {
            const safeError = normalizeChatbotError(error, input.signal);
            this.logger.warn(JSON.stringify({
                requestId,
                durationMs: Date.now() - startedAt,
                code: safeError.code,
            }));
            throw safeError;
        }
    }
    readResponse(completion, requestId, durationMs) {
        if (!isRecord(completion) ||
            !Array.isArray(completion.choices) ||
            completion.choices.length !== 1) {
            throw new ChatbotAiError('CHATBOT_RESPONSE_INVALID');
        }
        const choice = completion.choices[0];
        if (!isRecord(choice))
            throw new ChatbotAiError('CHATBOT_RESPONSE_INVALID');
        if (choice.finish_reason === 'length')
            throw new ChatbotAiError('CHATBOT_RESPONSE_INCOMPLETE');
        if (choice.finish_reason === 'content_filter')
            throw new ChatbotAiError('CHATBOT_RESPONSE_BLOCKED');
        if (choice.finish_reason !== 'stop' &&
            choice.finish_reason !== 'tool_calls') {
            throw new ChatbotAiError('CHATBOT_RESPONSE_INVALID');
        }
        const message = choice.message;
        if (!isRecord(message) ||
            message.role !== 'assistant' ||
            (message.content !== null && typeof message.content !== 'string') ||
            typeof completion.model !== 'string' ||
            !completion.model.trim() ||
            typeof completion.id !== 'string' ||
            !completion.id.trim()) {
            throw new ChatbotAiError('CHATBOT_RESPONSE_INVALID');
        }
        if (typeof message.refusal === 'string' && message.refusal.trim()) {
            throw new ChatbotAiError('CHATBOT_RESPONSE_BLOCKED');
        }
        const calls = message.tool_calls ?? [];
        if (!Array.isArray(calls) ||
            !calls.every(isToolCall) ||
            new Set(calls.map((call) => call.id)).size !== calls.length ||
            (choice.finish_reason === 'tool_calls') !== calls.length > 0) {
            throw new ChatbotAiError('CHATBOT_RESPONSE_INVALID');
        }
        if (calls.length === 0 && !message.content?.trim()) {
            throw new ChatbotAiError('CHATBOT_RESPONSE_INVALID');
        }
        const assistantMessage = {
            role: 'assistant',
            content: message.content,
            ...(calls.length
                ? {
                    tool_calls: calls.map((call) => ({
                        id: call.id,
                        type: call.type,
                        function: {
                            name: call.function.name,
                            arguments: call.function.arguments,
                        },
                    })),
                }
                : {}),
            ...(typeof message.reasoning_content === 'string'
                ? { reasoning_content: message.reasoning_content }
                : {}),
        };
        const usage = completion.usage;
        const hasUsage = isRecord(usage) &&
            [usage.prompt_tokens, usage.completion_tokens, usage.total_tokens].every((count) => typeof count === 'number' &&
                Number.isSafeInteger(count) &&
                count >= 0);
        return {
            assistantMessage,
            finishReason: choice.finish_reason,
            model: completion.model,
            providerResponseId: completion.id,
            requestId,
            durationMs,
            ...(hasUsage
                ? {
                    usage: {
                        promptTokens: usage.prompt_tokens,
                        completionTokens: usage.completion_tokens,
                        totalTokens: usage.total_tokens,
                    },
                }
                : {}),
        };
    }
};
ChatbotAiClient = ChatbotAiClient_1 = __decorate([
    Injectable(),
    __param(0, Inject(CHATBOT_CONFIG)),
    __param(1, Inject(CHATBOT_OPENAI_CLIENT)),
    __metadata("design:paramtypes", [Object, Object])
], ChatbotAiClient);
export { ChatbotAiClient };
//# sourceMappingURL=chatbot-ai.client.js.map