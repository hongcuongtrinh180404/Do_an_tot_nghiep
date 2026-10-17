import { HttpException, HttpStatus } from '@nestjs/common';

export abstract class GeminiBaseException extends HttpException {
  public abstract readonly retryable: boolean;
  public abstract readonly requiresKeyRotation: boolean;
  public readonly originalError?: unknown;

  constructor(message: string, status: HttpStatus, originalError?: unknown) {
    super(
      {
        statusCode: status,
        message,
        error: new.target.name,
        timestamp: new Date().toISOString(),
      },
      status,
    );
    this.originalError = originalError;
  }
}

/**
 * 429 RESOURCE_EXHAUSTED: Vượt quá quota hoặc rate limit (RPM/TPM) của project
 */
export class GeminiRateLimitException extends GeminiBaseException {
  public readonly retryable = true;
  public readonly requiresKeyRotation = true;
  public readonly cooldownMs: number;

  constructor(message = 'Gemini API Rate Limit / Quota exceeded (429)', originalError?: unknown, cooldownMs = 30000) {
    super(message, HttpStatus.TOO_MANY_REQUESTS, originalError);
    this.cooldownMs = cooldownMs;
  }
}

/**
 * 401 / 403 API_KEY_INVALID / PERMISSION_DENIED: Key sai hoặc bị thu hồi
 */
export class GeminiAuthException extends GeminiBaseException {
  public readonly retryable = false;
  public readonly requiresKeyRotation = true;
  public readonly disableKey = true;

  constructor(message = 'Gemini API Key is invalid or permission denied', originalError?: unknown) {
    super(message, HttpStatus.UNAUTHORIZED, originalError);
  }
}

/**
 * 400 INVALID_ARGUMENT: Prompt hoặc tham số request không hợp lệ (Fail-fast, không đổi key)
 */
export class GeminiInvalidRequestException extends GeminiBaseException {
  public readonly retryable = false;
  public readonly requiresKeyRotation = false;

  constructor(message = 'Invalid request arguments for Gemini API', originalError?: unknown) {
    super(message, HttpStatus.BAD_REQUEST, originalError);
  }
}

/**
 * 404 NOT_FOUND: Model không tồn tại trên hệ thống Gemini
 */
export class GeminiModelNotFoundException extends GeminiBaseException {
  public readonly retryable = false;
  public readonly requiresKeyRotation = false;

  constructor(message = 'Configured Gemini model not found', originalError?: unknown) {
    super(message, HttpStatus.NOT_FOUND, originalError);
  }
}

/**
 * 500 / 503 INTERNAL / UNAVAILABLE: Dịch vụ Google gặp sự cố tạm thời
 */
export class GeminiServiceUnavailableException extends GeminiBaseException {
  public readonly retryable = true;
  public readonly requiresKeyRotation = true;

  constructor(message = 'Gemini service temporarily unavailable', originalError?: unknown) {
    super(message, HttpStatus.SERVICE_UNAVAILABLE, originalError);
  }
}

/**
 * 422 UNPROCESSABLE_ENTITY: Model sinh kết quả không parse được JSON hoặc vi phạm schema
 */
export class GeminiResponseParsingException extends GeminiBaseException {
  public readonly retryable = true;
  public readonly requiresKeyRotation = false;

  constructor(message = 'Failed to parse JSON response from Gemini model', originalError?: unknown) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY, originalError);
  }
}

/**
 * 429: Toàn bộ 6 API key đều đang bị COOLDOWN hoặc DEAD
 */
export class GeminiAllKeysExhaustedException extends GeminiBaseException {
  public readonly retryable = false;
  public readonly requiresKeyRotation = false;

  constructor(message = 'Tất cả các Gemini API key hiện tại đều đang bận hoặc quá tải hạn mức. Vui lòng thử lại sau.') {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}
