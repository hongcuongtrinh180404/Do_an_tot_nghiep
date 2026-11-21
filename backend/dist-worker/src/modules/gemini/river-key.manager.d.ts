import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { IRiverKeyManager, RiverKeyHealthStatus, RiverKeyMetadata } from './interfaces/gemini.interface.js';
export declare class RiverKeyManager implements IRiverKeyManager {
    private readonly configService;
    private readonly logger;
    private keys;
    private currentIndex;
    private readonly clientCache;
    constructor(configService: ConfigService);
    static maskKey(key: string): string;
    initializeKeys(): void;
    isConfigured(): boolean;
    getNextAvailableKey(): RiverKeyMetadata;
    markCooldown(keyIndex: number, errorMsg?: string): void;
    markDead(keyIndex: number, reason?: string): void;
    recordSuccess(keyIndex: number): void;
    getClient(apiKey: string, baseUrl: string, timeoutMs: number): OpenAI;
    getKeysHealthStatus(): RiverKeyHealthStatus[];
}
