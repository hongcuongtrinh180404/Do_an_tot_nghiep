import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type OpenAI from 'openai';
import {
  CHATBOT_CONFIG,
  CHATBOT_OPENAI_CLIENT,
  type ChatbotConfig,
} from './chatbot.config.js';
import { ChatbotAiError, normalizeChatbotError } from './chatbot.errors.js';
import type {
  ChatbotAssistantMessage,
  ChatbotCompletionInput,
  ChatbotCompletionResult,
  ChatbotToolCall,
} from './chatbot.types.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isToolCall(value: unknown): value is ChatbotToolCall {
  return (
    isRecord(value) &&
    value.type === 'function' &&
    typeof value.id === 'string' &&
    value.id.trim().length > 0 &&
    isRecord(value.function) &&
    typeof value.function.name === 'string' &&
    /^[A-Za-z0-9_-]{1,128}$/.test(value.function.name) &&
    typeof value.function.arguments === 'string'
  );
}

/** One non-streaming provider request. Tool execution belongs to a separate, authorized layer. */
@Injectable()
export class ChatbotAiClient {
  private readonly logger = new Logger(ChatbotAiClient.name);

  constructor(
    @Inject(CHATBOT_CONFIG) private readonly config: ChatbotConfig,
    @Inject(CHATBOT_OPENAI_CLIENT) private readonly client: OpenAI | null,
  ) {}

  async complete(
    input: ChatbotCompletionInput,
  ): Promise<ChatbotCompletionResult> {
    const startedAt = Date.now();
    const requestId =
      input.requestId &&
      UUID_PATTERN.test(input.requestId) &&
      input.requestId !== this.config.apiKey
        ? input.requestId
        : randomUUID();
    try {
      if (!this.config.enabled || !this.client)
        throw new ChatbotAiError('CHATBOT_DISABLED');
      if (input.signal?.aborted) throw new ChatbotAiError('CHATBOT_CANCELLED');
      if (
        !Array.isArray(input.messages) ||
        input.messages.length === 0 ||
        (input.toolChoice !== undefined &&
          !['auto', 'none'].includes(input.toolChoice))
      ) {
        throw new ChatbotAiError('CHATBOT_REQUEST_INVALID');
      }

      const hasTools = Boolean(input.tools?.length);
      const completion = await this.client.chat.completions.create(
        {
          model: this.config.model,
          messages: [...input.messages],
          ...(hasTools ? { tools: [...input.tools!] } : {}),
          tool_choice: hasTools ? (input.toolChoice ?? 'auto') : 'none',
          stream: false,
          temperature: 0.2,
          max_tokens: this.config.maxOutputTokens,
        },
        {
          timeout: this.config.timeoutMs,
          maxRetries: 0,
          signal: input.signal,
        },
      );
      if (input.signal?.aborted) throw new ChatbotAiError('CHATBOT_CANCELLED');

      const result = this.readResponse(
        completion,
        requestId,
        Date.now() - startedAt,
      );
      // Log the configured identifier, never arbitrary provider-supplied metadata.
      const model =
        MODEL_PATTERN.test(this.config.model) &&
        !this.config.model.includes(this.config.apiKey)
          ? this.config.model
          : '[redacted]';
      this.logger.log(
        JSON.stringify({
          requestId,
          model,
          durationMs: result.durationMs,
          finishReason: result.finishReason,
          toolCalls: result.assistantMessage.tool_calls?.length ?? 0,
          usage: result.usage,
        }),
      );
      return result;
    } catch (error) {
      const safeError = normalizeChatbotError(error, input.signal);
      this.logger.warn(
        JSON.stringify({
          requestId,
          durationMs: Date.now() - startedAt,
          code: safeError.code,
        }),
      );
      throw safeError;
    }
  }

  private readResponse(
    completion: unknown,
    requestId: string,
    durationMs: number,
  ): ChatbotCompletionResult {
    if (
      !isRecord(completion) ||
      !Array.isArray(completion.choices) ||
      completion.choices.length !== 1
    ) {
      throw new ChatbotAiError('CHATBOT_RESPONSE_INVALID');
    }
    const choice: unknown = completion.choices[0];
    if (!isRecord(choice)) throw new ChatbotAiError('CHATBOT_RESPONSE_INVALID');
    if (choice.finish_reason === 'length')
      throw new ChatbotAiError('CHATBOT_RESPONSE_INCOMPLETE');
    if (choice.finish_reason === 'content_filter')
      throw new ChatbotAiError('CHATBOT_RESPONSE_BLOCKED');
    if (
      choice.finish_reason !== 'stop' &&
      choice.finish_reason !== 'tool_calls'
    ) {
      throw new ChatbotAiError('CHATBOT_RESPONSE_INVALID');
    }

    const message = choice.message;
    if (
      !isRecord(message) ||
      message.role !== 'assistant' ||
      (message.content !== null && typeof message.content !== 'string') ||
      typeof completion.model !== 'string' ||
      !completion.model.trim() ||
      typeof completion.id !== 'string' ||
      !completion.id.trim()
    ) {
      throw new ChatbotAiError('CHATBOT_RESPONSE_INVALID');
    }
    if (typeof message.refusal === 'string' && message.refusal.trim()) {
      throw new ChatbotAiError('CHATBOT_RESPONSE_BLOCKED');
    }

    const calls: unknown = message.tool_calls ?? [];
    if (
      !Array.isArray(calls) ||
      !calls.every(isToolCall) ||
      new Set(calls.map((call) => call.id)).size !== calls.length ||
      (choice.finish_reason === 'tool_calls') !== calls.length > 0
    ) {
      throw new ChatbotAiError('CHATBOT_RESPONSE_INVALID');
    }
    if (calls.length === 0 && !message.content?.trim()) {
      throw new ChatbotAiError('CHATBOT_RESPONSE_INVALID');
    }

    const assistantMessage: ChatbotAssistantMessage = {
      role: 'assistant',
      content: message.content,
      ...(calls.length
        ? {
            tool_calls: calls.map((call) => ({
              id: call.id,
              type: call.type,
              // Arguments intentionally remain unparsed, untrusted JSON until tool execution.
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
    const hasUsage =
      isRecord(usage) &&
      [usage.prompt_tokens, usage.completion_tokens, usage.total_tokens].every(
        (count) =>
          typeof count === 'number' &&
          Number.isSafeInteger(count) &&
          count >= 0,
      );

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
              promptTokens: usage.prompt_tokens as number,
              completionTokens: usage.completion_tokens as number,
              totalTokens: usage.total_tokens as number,
            },
          }
        : {}),
    };
  }
}
