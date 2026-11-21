import { Inject, Injectable, Logger } from '@nestjs/common';
import { ChatbotAiError } from '../chatbot.errors.js';
import { ChatbotConversationService } from '../services/chatbot-conversation.service.js';
import { CHATBOT_HTTP_TIMEOUT_MS } from './chatbot-http.constants.js';
import { mapChatbotHttpError } from './chatbot-http.errors.js';
import { ChatbotContextService } from './chatbot-context.service.js';
import { projectChatbotReply, type ChatbotMessageResponse } from './chatbot-response.projection.js';
export type { ChatbotMessageResponse } from './chatbot-response.projection.js';

@Injectable()
export class ChatbotMessageService {
  private readonly logger = new Logger(ChatbotMessageService.name);

  constructor(
    @Inject(ChatbotConversationService) private readonly conversations: ChatbotConversationService,
    @Inject(ChatbotContextService)
    private readonly contexts: ChatbotContextService,
  ) {}

  async respond(
    message: string,
    requestId: string,
    callerSignal?: AbortSignal,
    conversation?: { userId: string; context?: string },
  ): Promise<ChatbotMessageResponse> {
    const deadline = new AbortController();
    const signal = callerSignal
      ? AbortSignal.any([callerSignal, deadline.signal])
      : deadline.signal;
    let timedOut = false;
    let onAbort: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (signal.aborted) throw new ChatbotAiError('CHATBOT_CANCELLED');
      if (!conversation?.userId) throw new ChatbotAiError('CHATBOT_REQUEST_INVALID');
      const context = conversation?.context
        ? this.contexts.readConversation(conversation.userId, conversation.context)
        : undefined;
      const interrupted = new Promise<never>((_resolve, reject) => {
        onAbort = () =>
          reject(
            new ChatbotAiError(
              timedOut ? 'CHATBOT_TIMEOUT' : 'CHATBOT_CANCELLED',
            ),
          );
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
        throw new ChatbotAiError(
          timedOut ? 'CHATBOT_TIMEOUT' : 'CHATBOT_CANCELLED',
        );
      return {
        ...projectChatbotReply(reply),
        requestId,
        ...(reply.nextContext ? { context: this.contexts.createConversation(conversation.userId, reply.nextContext) } : {}),
      };
    } catch (error) {
      const safeError = mapChatbotHttpError(
        callerSignal?.aborted
          ? new ChatbotAiError('CHATBOT_CANCELLED')
          : timedOut
            ? new ChatbotAiError('CHATBOT_TIMEOUT')
            : error,
        requestId,
      );
      const body = safeError.getResponse() as { code: string };
      this.logger.warn(JSON.stringify({ requestId, code: body.code }));
      throw safeError;
    } finally {
      if (timer) clearTimeout(timer);
      if (onAbort) signal.removeEventListener('abort', onAbort);
    }
  }
}
