import { ConfigService } from '@nestjs/config';
import { GeminiKeyHealthStatus, GeminiKeyMetadata, IGeminiKeyManager } from './interfaces/gemini.interface.js';
export declare class GeminiKeyManager implements IGeminiKeyManager {
    private readonly configService;
    private readonly logger;
    private keys;
    private currentIndex;
    constructor(configService: ConfigService);
    static maskKey(key: string): string;
    initializeKeys(): void;
    getNextAvailableKey(): GeminiKeyMetadata;
    markCooldown(keyIndex: number, errorMsg?: string): void;
    markDead(keyIndex: number, reason?: string): void;
    recordSuccess(keyIndex: number): void;
    getKeysHealthStatus(): GeminiKeyHealthStatus[];
    setTestKeys(testKeys: {
        name: string;
        key: string;
    }[]): void;
}
