import type OpenAI from 'openai';

export type GeminiKeyStatus = 'ACTIVE' | 'COOLDOWN' | 'DEAD';

export interface GeminiKeyMetadata {
  index: number;
  name: string;
  key: string;
  maskedKey: string;
  status: GeminiKeyStatus;
  cooldownUntil: number;
  failureCount: number;
  lastUsedAt: number;
}

export interface GeminiKeyHealthStatus {
  index: number;
  name: string;
  maskedKey: string;
  status: GeminiKeyStatus;
  cooldownRemainingMs: number;
  failureCount: number;
  lastUsedAt: number;
}

export type RiverKeyStatus = 'ACTIVE' | 'COOLDOWN' | 'DEAD';

export interface RiverKeyMetadata {
  index: number;
  name: string;
  key: string;
  maskedKey: string;
  status: RiverKeyStatus;
  cooldownUntil: number;
  failureCount: number;
  lastUsedAt: number;
}

export interface RiverKeyHealthStatus {
  index: number;
  name: string;
  maskedKey: string;
  status: RiverKeyStatus;
  cooldownRemainingMs: number;
  failureCount: number;
  lastUsedAt: number;
}

export interface GeminiUsageMetadata {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface GeminiExecutionResult<T = string> {
  data: T;
  rawText: string;
  model: string;
  keyIndex: number;
  maskedKey: string;
  executionTimeMs: number;
  usage?: GeminiUsageMetadata;
  isFallback?: boolean;
}

export interface GenerateContentOptions {
  systemInstruction?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  responseMimeType?: 'text/plain' | 'application/json';
  responseSchema?: unknown;
  timeoutMs?: number;
}

export interface IGeminiKeyManager {
  getNextAvailableKey(): GeminiKeyMetadata;
  markCooldown(keyIndex: number, errorMsg?: string): void;
  markDead(keyIndex: number, reason?: string): void;
  recordSuccess(keyIndex: number): void;
  getKeysHealthStatus(): GeminiKeyHealthStatus[];
}

export interface IRiverKeyManager {
  getNextAvailableKey(): RiverKeyMetadata;
  markCooldown(keyIndex: number, errorMsg?: string): void;
  markDead(keyIndex: number, reason?: string): void;
  recordSuccess(keyIndex: number): void;
  isConfigured(): boolean;
  getClient(apiKey: string, baseUrl: string, timeoutMs: number): OpenAI;
  getKeysHealthStatus(): RiverKeyHealthStatus[];
}

export interface IGeminiService {
  generateContent(prompt: string, options?: GenerateContentOptions): Promise<GeminiExecutionResult<string>>;
  generateJson<T>(prompt: string, options?: GenerateContentOptions): Promise<GeminiExecutionResult<T>>;
}

