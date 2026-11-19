import {
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, type ThrottlerStorage } from '@nestjs/throttler';
import {
  CHATBOT_HTTP_RATE_LIMIT,
  CHATBOT_HTTP_RATE_STORAGE,
  CHATBOT_HTTP_RATE_TTL_MS,
} from './chatbot-http.constants.js';
import { chatbotHttpException } from './chatbot-http.errors.js';

@Injectable()
export class ChatbotRateLimitGuard extends ThrottlerGuard {
  constructor(
    @Inject(CHATBOT_HTTP_RATE_STORAGE) storage: ThrottlerStorage,
    @Inject(Reflector) reflector: Reflector,
  ) {
    // Local storage/options: do not reconfigure the global auth ThrottlerModule.
    super(
      [
        {
          name: 'default',
          limit: CHATBOT_HTTP_RATE_LIMIT,
          ttl: CHATBOT_HTTP_RATE_TTL_MS,
        },
      ],
      storage,
      reflector,
    );
  }

  protected override async getTracker(
    request: Record<string, unknown>,
  ): Promise<string> {
    const user = request.user as { id?: unknown } | undefined;
    // The global JwtAuthGuard resolves this profile; never trust x-user-id, JWT
    // strings, IP changes or caller-supplied userId as the rate-limit identity.
    if (!user || typeof user.id !== 'string' || !user.id)
      throw new UnauthorizedException();
    return `chatbot-user:${user.id}`;
  }

  protected override async throwThrottlingException(): Promise<void> {
    throw chatbotHttpException(
      'CHATBOT_HTTP_RATE_LIMITED',
      HttpStatus.TOO_MANY_REQUESTS,
      'Bạn đã gửi quá nhiều câu hỏi. Vui lòng chờ trước khi thử lại.',
      true,
    );
  }
}
