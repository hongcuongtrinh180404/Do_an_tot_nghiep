import { ConfigService } from '@nestjs/config';
import { GeminiExecutionResult, GenerateContentOptions, IGeminiService } from './interfaces/gemini.interface.js';
import { GeminiKeyManager } from './gemini-key.manager.js';
import { RiverKeyManager } from './river-key.manager.js';
import { GeminiBaseException } from './gemini.errors.js';
export declare class GeminiService implements IGeminiService {
    private readonly configService;
    private readonly keyManager;
    private readonly logger;
    private readonly configuredModel;
    private readonly fallbackModel;
    private readonly clientCache;
    private readonly primaryProvider;
    private readonly riverBaseUrl;
    private readonly riverModel1;
    private readonly riverModel2;
    private readonly riverTimeoutMs;
    private readonly riverKeyManager;
    constructor(configService: ConfigService, keyManager: GeminiKeyManager, riverKeyManager?: RiverKeyManager);
    isRiverAiEnabled(): boolean;
    isRiverAiPrimary(): boolean;
    private getClient;
    generateContent(prompt: string, options?: GenerateContentOptions): Promise<GeminiExecutionResult<string>>;
    private executeGeminiWithRetry;
    private callRiverAi;
    generateJson<T>(prompt: string, options?: GenerateContentOptions): Promise<GeminiExecutionResult<T>>;
    classifySdkException(err: unknown): GeminiBaseException;
}
