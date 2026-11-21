import { HttpException, HttpStatus } from '@nestjs/common';
export class GeminiBaseException extends HttpException {
    originalError;
    constructor(message, status, originalError) {
        super({
            statusCode: status,
            message,
            error: new.target.name,
            timestamp: new Date().toISOString(),
        }, status);
        this.originalError = originalError;
    }
}
export class GeminiRateLimitException extends GeminiBaseException {
    retryable = true;
    requiresKeyRotation = true;
    cooldownMs;
    constructor(message = 'Gemini API Rate Limit / Quota exceeded (429)', originalError, cooldownMs = 30000) {
        super(message, HttpStatus.TOO_MANY_REQUESTS, originalError);
        this.cooldownMs = cooldownMs;
    }
}
export class GeminiAuthException extends GeminiBaseException {
    retryable = false;
    requiresKeyRotation = true;
    disableKey = true;
    constructor(message = 'Gemini API Key is invalid or permission denied', originalError) {
        super(message, HttpStatus.UNAUTHORIZED, originalError);
    }
}
export class GeminiInvalidRequestException extends GeminiBaseException {
    retryable = false;
    requiresKeyRotation = false;
    constructor(message = 'Invalid request arguments for Gemini API', originalError) {
        super(message, HttpStatus.BAD_REQUEST, originalError);
    }
}
export class GeminiModelNotFoundException extends GeminiBaseException {
    retryable = false;
    requiresKeyRotation = false;
    constructor(message = 'Configured Gemini model not found', originalError) {
        super(message, HttpStatus.NOT_FOUND, originalError);
    }
}
export class GeminiServiceUnavailableException extends GeminiBaseException {
    retryable = true;
    requiresKeyRotation = true;
    constructor(message = 'Gemini service temporarily unavailable', originalError) {
        super(message, HttpStatus.SERVICE_UNAVAILABLE, originalError);
    }
}
export class GeminiModelUnavailableException extends GeminiServiceUnavailableException {
    requiresKeyRotation = false;
    isOverloaded = true;
    constructor(message = 'Gemini model temporarily unavailable or overloaded (503)', originalError) {
        super(message, originalError);
    }
}
export class GeminiResponseParsingException extends GeminiBaseException {
    retryable = true;
    requiresKeyRotation = false;
    constructor(message = 'Failed to parse JSON response from Gemini model', originalError) {
        super(message, HttpStatus.UNPROCESSABLE_ENTITY, originalError);
    }
}
export class GeminiAllKeysExhaustedException extends GeminiBaseException {
    retryable = false;
    requiresKeyRotation = false;
    constructor(message = 'Tất cả các Gemini API key hiện tại đều đang bận hoặc quá tải hạn mức. Vui lòng thử lại sau.') {
        super(message, HttpStatus.TOO_MANY_REQUESTS);
    }
}
export class RiverAllKeysExhaustedException extends GeminiBaseException {
    retryable = false;
    requiresKeyRotation = false;
    constructor(message = 'Tất cả các River API key hiện tại đều đang bận hoặc quá tải hạn mức. Vui lòng thử lại sau.') {
        super(message, HttpStatus.TOO_MANY_REQUESTS);
    }
}
//# sourceMappingURL=gemini.errors.js.map