import { HttpException, HttpStatus } from '@nestjs/common';
export declare abstract class GeminiBaseException extends HttpException {
    abstract readonly retryable: boolean;
    abstract readonly requiresKeyRotation: boolean;
    readonly originalError?: unknown;
    constructor(message: string, status: HttpStatus, originalError?: unknown);
}
export declare class GeminiRateLimitException extends GeminiBaseException {
    readonly retryable = true;
    readonly requiresKeyRotation = true;
    readonly cooldownMs: number;
    constructor(message?: string, originalError?: unknown, cooldownMs?: number);
}
export declare class GeminiAuthException extends GeminiBaseException {
    readonly retryable = false;
    readonly requiresKeyRotation = true;
    readonly disableKey = true;
    constructor(message?: string, originalError?: unknown);
}
export declare class GeminiInvalidRequestException extends GeminiBaseException {
    readonly retryable = false;
    readonly requiresKeyRotation = false;
    constructor(message?: string, originalError?: unknown);
}
export declare class GeminiModelNotFoundException extends GeminiBaseException {
    readonly retryable = false;
    readonly requiresKeyRotation = false;
    constructor(message?: string, originalError?: unknown);
}
export declare class GeminiServiceUnavailableException extends GeminiBaseException {
    readonly retryable: boolean;
    readonly requiresKeyRotation: boolean;
    constructor(message?: string, originalError?: unknown);
}
export declare class GeminiModelUnavailableException extends GeminiServiceUnavailableException {
    readonly requiresKeyRotation: boolean;
    readonly isOverloaded: boolean;
    constructor(message?: string, originalError?: unknown);
}
export declare class GeminiResponseParsingException extends GeminiBaseException {
    readonly retryable = true;
    readonly requiresKeyRotation = false;
    constructor(message?: string, originalError?: unknown);
}
export declare class GeminiAllKeysExhaustedException extends GeminiBaseException {
    readonly retryable = false;
    readonly requiresKeyRotation = false;
    constructor(message?: string);
}
export declare class RiverAllKeysExhaustedException extends GeminiBaseException {
    readonly retryable = false;
    readonly requiresKeyRotation = false;
    constructor(message?: string);
}
