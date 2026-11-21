import { Reflector } from '@nestjs/core';
import { ThrottlerGuard, type ThrottlerStorage } from '@nestjs/throttler';
export declare class ChatbotRateLimitGuard extends ThrottlerGuard {
    constructor(storage: ThrottlerStorage, reflector: Reflector);
    protected getTracker(request: Record<string, unknown>): Promise<string>;
    protected throwThrottlingException(): Promise<void>;
}
