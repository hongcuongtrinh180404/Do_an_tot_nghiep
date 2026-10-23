import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, type GenerateContentConfig } from '@google/genai';
import type OpenAI from 'openai';
import {
  GeminiExecutionResult,
  GenerateContentOptions,
  IGeminiService,
  RiverKeyMetadata,
} from './interfaces/gemini.interface.js';
import { GeminiKeyManager } from './gemini-key.manager.js';
import { RiverKeyManager } from './river-key.manager.js';
import {
  GeminiAuthException,
  GeminiBaseException,
  GeminiInvalidRequestException,
  GeminiModelNotFoundException,
  GeminiModelUnavailableException,
  GeminiRateLimitException,
  GeminiResponseParsingException,
  GeminiServiceUnavailableException,
} from './gemini.errors.js';

@Injectable()
export class GeminiService implements IGeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly configuredModel: string;
  private readonly fallbackModel: string;
  private readonly clientCache = new Map<string, GoogleGenAI>();

  // Cấu hình nhà cung cấp River AI (OpenAI Compatible)
  private readonly primaryProvider: 'RIVER' | 'GEMINI';
  private readonly riverBaseUrl: string;
  private readonly riverModel1: string;
  private readonly riverModel2: string;
  private readonly riverTimeoutMs: number;
  private readonly riverKeyManager: RiverKeyManager;

  constructor(
    private readonly configService: ConfigService,
    private readonly keyManager: GeminiKeyManager,
    @Optional() riverKeyManager?: RiverKeyManager,
  ) {
    this.riverKeyManager = riverKeyManager ?? new RiverKeyManager(this.configService);

    this.configuredModel = this.configService
      .get<string>('GEMINI_MODEL', 'gemini-3.8-flash')
      .trim();

    this.fallbackModel = this.configService
      .get<string>('GEMINI_FALLBACK_MODEL', 'gemini-3.5-flash-lite')
      .trim();

    this.primaryProvider =
      this.configService
        .get<string>('AI_PRIMARY_PROVIDER', 'RIVER')
        .trim()
        .toUpperCase() === 'GEMINI'
        ? 'GEMINI'
        : 'RIVER';

    this.riverBaseUrl = this.configService
      .get<string>('RIVER_BASE_URL', 'https://api.river.ai/v1')
      .trim();

    this.riverModel1 = (
      this.configService.get<string>('RIVER_MODEL_1', '') ||
      this.configService.get<string>('RIVER_MODEL', 'deepseek-ai/DeepSeek-V4.1-Flash')
    ).trim();

    this.riverModel2 = this.configService
      .get<string>('RIVER_MODEL_2', '')
      .trim();

    this.riverTimeoutMs = Number(
      this.configService.get<number>('RIVER_TIMEOUT_MS', 60000),
    );

    this.logger.log(
      `GeminiService khởi tạo thành công. Provider ưu tiên: [${this.primaryProvider}]. ` +
      `Model Gemini chính: ${this.configuredModel}, Model River AI: ${this.riverModel1}${this.riverModel2 ? ` (Model 2 dự phòng: ${this.riverModel2})` : ''}`,
    );

    if (this.isRiverAiEnabled()) {
      this.logger.log(
        `River AI đã sẵn sàng (Role: ${this.primaryProvider === 'RIVER' ? 'PRIMARY' : 'FALLBACK'}) với model: ${this.riverModel1}, endpoint: ${this.riverBaseUrl}`,
      );
    }
  }

  /**
   * Kiểm tra River AI có được cấu hình khóa API hay không
   */
  public isRiverAiEnabled(): boolean {
    return this.riverKeyManager.isConfigured();
  }

  /**
   * Kiểm tra xem River AI có phải là nhà cung cấp ưu tiên chính hay không
   */
  public isRiverAiPrimary(): boolean {
    return this.isRiverAiEnabled() && this.primaryProvider === 'RIVER';
  }

  /**
   * Khởi tạo hoặc lấy client GoogleGenAI tương ứng với từng API key
   */
  private getClient(apiKey: string): GoogleGenAI {
    let client = this.clientCache.get(apiKey);
    if (!client) {
      client = new GoogleGenAI({ apiKey });
      this.clientCache.set(apiKey, client);
    }
    return client;
  }

  /**
   * Gọi AI sinh nội dung text với điều phối ưu tiên giữa River AI và Gemini:
   * - Nếu River AI được cấu hình làm Primary: Gọi River AI trước, nếu fail tự động fallback sang Gemini
   * - Nếu Gemini là Primary: Gọi Gemini trước, nếu fail tự động fallback sang River AI
   */
  async generateContent(
    prompt: string,
    options?: GenerateContentOptions,
  ): Promise<GeminiExecutionResult<string>> {
    const trimmedPrompt = prompt?.trim();
    if (!trimmedPrompt) {
      throw new GeminiInvalidRequestException('Prompt gửi tới AI không được để trống.');
    }

    // 1. Trường hợp River AI được chọn làm nhà cung cấp ưu tiên (Primary)
    if (this.isRiverAiPrimary()) {
      try {
        return await this.callRiverAi(trimmedPrompt, options, false);
      } catch (riverErr: unknown) {
        this.logger.warn(
          `Nhà cung cấp chính River AI gặp lỗi (${(riverErr as Error)?.message || riverErr}). Tự động chuyển tiếp sang cụm Google Gemini dự phòng...`,
        );
        try {
          return await this.executeGeminiWithRetry(trimmedPrompt, options, true);
        } catch (geminiErr: unknown) {
          this.logger.error(
            `Cả River AI và cụm Google Gemini đều thất bại. River: ${(riverErr as Error)?.message}, Gemini: ${(geminiErr as Error)?.message}`,
          );
          throw new GeminiServiceUnavailableException(
            `Cả nhà cung cấp chính River AI lẫn cụm Gemini dự phòng đều thất bại: ${(riverErr as Error)?.message || riverErr}`,
            geminiErr,
          );
        }
      }
    }

    // 2. Trường hợp Google Gemini là nhà cung cấp ưu tiên (Primary)
    try {
      return await this.executeGeminiWithRetry(trimmedPrompt, options, false);
    } catch (geminiErr: unknown) {
      // Prompt sai hoặc lỗi không thể retry -> fail fast, không gọi fallback
      if (
        geminiErr instanceof GeminiInvalidRequestException ||
        geminiErr instanceof GeminiModelNotFoundException
      ) {
        throw geminiErr;
      }

      // Nếu River AI được cấu hình, kích hoạt dự phòng
      if (this.isRiverAiEnabled()) {
        this.logger.warn(
          `Cụm Google Gemini không thể xử lý sau các lần thử (${(geminiErr as Error)?.message || geminiErr}). Tự động kích hoạt dự phòng sang River AI...`,
        );
        try {
          return await this.callRiverAi(trimmedPrompt, options, true);
        } catch (riverErr: unknown) {
          throw new GeminiServiceUnavailableException(
            `Toàn bộ cụm Gemini và nhà cung cấp dự phòng River AI đều thất bại: ${(riverErr as Error)?.message || riverErr}`,
            riverErr,
          );
        }
      }

      throw geminiErr;
    }
  }

  /**
   * Thực hiện gọi cụm Gemini với cơ chế retry 3 lần và fallback model 3.5
   */
  private async executeGeminiWithRetry(
    trimmedPrompt: string,
    options?: GenerateContentOptions,
    isFallbackMode = false,
  ): Promise<GeminiExecutionResult<string>> {
    const maxAttempts = 3;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const activeKey = this.keyManager.getNextAvailableKey();
      const startTime = Date.now();

      try {
        const client = this.getClient(activeKey.key);

        const config: GenerateContentConfig = {
          temperature: options?.temperature ?? 0.2,
          topP: options?.topP,
          topK: options?.topK,
          maxOutputTokens: options?.maxOutputTokens,
        };

        if (options?.systemInstruction) {
          config.systemInstruction = options.systemInstruction;
        }

        if (options?.responseMimeType) {
          config.responseMimeType = options.responseMimeType;
        }

        if (options?.responseSchema) {
          config.responseSchema = options.responseSchema as GenerateContentConfig['responseSchema'];
        }

        let usedModel = this.configuredModel;
        let isFallback = false;
        let response;

        try {
          this.logger.debug(
            `[Lần ${attempt}/${maxAttempts}] Gửi request tới Gemini model ${usedModel} bằng key [${activeKey.name} (${activeKey.maskedKey})]...`,
          );

          response = await client.models.generateContent({
            model: usedModel,
            contents: trimmedPrompt,
            config,
          });
        } catch (callErr: unknown) {
          const classifiedCallErr = this.classifySdkException(callErr);

          // Nếu model 3.8 bị 503 UNAVAILABLE (quá tải), chuyển tạm thời request sang model dự phòng 3.5
          if (
            usedModel === this.configuredModel &&
            classifiedCallErr instanceof GeminiModelUnavailableException
          ) {
            this.logger.warn(
              `Model chính [${this.configuredModel}] trả về 503 UNAVAILABLE qua key [${activeKey.name} (${activeKey.maskedKey})]. Tạm thời chuyển request sang model dự phòng [${this.fallbackModel}]...`,
            );
            usedModel = this.fallbackModel;
            isFallback = true;

            this.logger.debug(
              `Thử lại ngay với model dự phòng ${usedModel} trên key [${activeKey.name} (${activeKey.maskedKey})]...`,
            );
            response = await client.models.generateContent({
              model: usedModel,
              contents: trimmedPrompt,
              config,
            });
          } else {
            throw callErr;
          }
        }

        const executionTimeMs = Date.now() - startTime;
        const rawText = response.text?.trim() || '';

        // Ghi nhận thành công để reset failure count
        this.keyManager.recordSuccess(activeKey.index);

        const usage = response.usageMetadata
          ? {
              promptTokens: response.usageMetadata.promptTokenCount ?? 0,
              completionTokens: response.usageMetadata.candidatesTokenCount ?? 0,
              totalTokens: response.usageMetadata.totalTokenCount ?? 0,
            }
          : undefined;

        this.logger.log(
          `Gemini [${usedModel}] hoàn thành thành công trong ${executionTimeMs}ms qua key [${activeKey.name} (${activeKey.maskedKey})]. Tokens: ${usage?.totalTokens ?? 'N/A'}${isFallback ? ' (Fallback)' : ''}`,
        );

        return {
          data: rawText,
          rawText,
          model: usedModel,
          keyIndex: activeKey.index,
          maskedKey: activeKey.maskedKey,
          executionTimeMs,
          usage,
          isFallback: isFallbackMode || isFallback,
        };
      } catch (err: unknown) {
        lastError = err;
        const classified = this.classifySdkException(err);

        // 1. Lỗi Auth (400/403 Invalid API Key): Đánh dấu key chết, thử key khác
        if (classified instanceof GeminiAuthException) {
          this.keyManager.markDead(activeKey.index, classified.message);
          this.logger.warn(
            `Key [${activeKey.name} (${activeKey.maskedKey})] hỏng, tự động chuyển sang key khác (Lần ${attempt}/${maxAttempts})...`,
          );
          continue;
        }

        // 2. Lỗi Rate limit (429 RESOURCE_EXHAUSTED): Cooldown key, chuyển key khác
        if (classified instanceof GeminiRateLimitException) {
          this.keyManager.markCooldown(activeKey.index, classified.message);
          this.logger.warn(
            `Key [${activeKey.name} (${activeKey.maskedKey})] chạm giới hạn quota, tự động đổi key khác (Lần ${attempt}/${maxAttempts})...`,
          );
          if (attempt < maxAttempts) {
            // Chờ một khoảng nhỏ để tránh xung đột
            await new Promise((res) => setTimeout(res, 500));
            continue;
          }
          throw classified;
        }

        // 3. Lỗi 503 Model Unavailable (Quá tải model cụm máy chủ Google): Không phạt cooldown key
        if (classified instanceof GeminiModelUnavailableException) {
          this.logger.warn(
            `Cụm model Google tạm thời quá tải qua key [${activeKey.name} (${activeKey.maskedKey})], thử lại lượt tiếp theo...`,
          );
          if (attempt < maxAttempts) {
            await new Promise((res) => setTimeout(res, 200));
            continue;
          }
          throw classified;
        }

        // 4. Lỗi 500 / 503 Service Unavailable khác (lỗi mạng, server nội bộ): Cooldown nhẹ và thử key khác
        if (classified instanceof GeminiServiceUnavailableException) {
          this.keyManager.markCooldown(activeKey.index, classified.message);
          this.logger.warn(
            `Máy chủ Google tạm thời gián đoạn qua key [${activeKey.name} (${activeKey.maskedKey})], thử key khác...`,
          );
          if (attempt < maxAttempts) {
            await new Promise((res) => setTimeout(res, 1000));
            continue;
          }
          throw classified;
        }

        // 4. Các lỗi Non-retryable (400 Invalid Argument, 404 Model Not Found): Fail-fast ngay lập tức
        if (
          classified instanceof GeminiInvalidRequestException ||
          classified instanceof GeminiModelNotFoundException
        ) {
          this.logger.error(`Lỗi không thể retry từ Gemini: ${classified.message}`);
          throw classified;
        }

        // Lỗi không xác định khác
        this.logger.error(`Lỗi không mong muốn từ Gemini SDK: ${(err as Error)?.message || err}`);
        if (attempt < maxAttempts) {
          this.keyManager.markCooldown(activeKey.index, (err as Error)?.message);
          continue;
        }
        throw classified;
      }
    }

    if (lastError instanceof GeminiBaseException) {
      throw lastError;
    }
    throw new GeminiServiceUnavailableException(
      'Không thể hoàn thành yêu cầu gọi Gemini sau nhiều lần thử lại qua các API key.',
      lastError,
    );
  }

  /**
   * Gọi River AI với cơ chế xoay API key và tự động chuyển đổi sang Model 2 khi Model 1 không phản hồi / lỗi
   */
  private async callRiverAi(
    prompt: string,
    options?: GenerateContentOptions,
    isFallback = false,
  ): Promise<GeminiExecutionResult<string>> {
    const maxAttempts = 3;
    let lastError: unknown = null;
    let currentModel = this.riverModel1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let activeKey: RiverKeyMetadata;
      try {
        activeKey = this.riverKeyManager.getNextAvailableKey();
      } catch (keyExhaustedErr) {
        this.logger.warn(`Không thể lấy API key River khả dụng: ${(keyExhaustedErr as Error)?.message}`);
        throw keyExhaustedErr;
      }

      const startTime = Date.now();
      const isModelFallback = currentModel !== this.riverModel1;

      try {
        const client = this.riverKeyManager.getClient(
          activeKey.key,
          this.riverBaseUrl,
          this.riverTimeoutMs,
        );

        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

        if (options?.systemInstruction) {
          messages.push({
            role: 'system',
            content: options.systemInstruction,
          });
        }

        messages.push({
          role: 'user',
          content: prompt,
        });

        const completionParams: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
          model: currentModel,
          messages,
          temperature: options?.temperature ?? 0.2,
          top_p: options?.topP,
          max_tokens: options?.maxOutputTokens,
        };

        if (options?.responseMimeType === 'application/json') {
          completionParams.response_format = { type: 'json_object' };
        }

        this.logger.debug(
          `[River AI Lần ${attempt}/${maxAttempts}] Gửi request tới model [${currentModel}] qua key [${activeKey.name} (${activeKey.maskedKey})] (${isFallback ? 'Dự phòng Provider' : 'Chính'}${isModelFallback ? ' - Model 2 Fallback' : ''})...`,
        );

        const completion = await client.chat.completions.create(completionParams);

        const executionTimeMs = Date.now() - startTime;
        const rawText = completion.choices[0]?.message?.content?.trim() || '';

        // Ghi nhận thành công để reset failure count
        this.riverKeyManager.recordSuccess(activeKey.index);

        const usage = completion.usage
          ? {
              promptTokens: completion.usage.prompt_tokens ?? 0,
              completionTokens: completion.usage.completion_tokens ?? 0,
              totalTokens: completion.usage.total_tokens ?? 0,
            }
          : undefined;

        this.logger.log(
          `River AI [${currentModel}] phản hồi thành công trong ${executionTimeMs}ms qua key [${activeKey.name} (${activeKey.maskedKey})]. Tokens: ${usage?.totalTokens ?? 'N/A'}${isFallback ? ' (Fallback Provider)' : ' (Primary Provider)'}${isModelFallback ? ' (Model 2 Fallback)' : ''}`,
        );

        return {
          data: rawText,
          rawText,
          model: `riverai:${currentModel}`,
          keyIndex: activeKey.index,
          maskedKey: activeKey.maskedKey,
          executionTimeMs,
          usage,
          isFallback: isFallback || isModelFallback,
        };
      } catch (err: unknown) {
        lastError = err;
        const errObj = err as Record<string, unknown> | null;
        const message = (errObj?.message as string) || String(err);
        const status = (errObj?.status as number) || (errObj?.statusCode as number);

        // 1. Lỗi Request sai (400 Bad Request, trừ phi liên quan đến model): Fail-fast ngay lập tức
        if (status === 400 && !message.toLowerCase().includes('model')) {
          this.logger.error(`Lỗi request không hợp lệ từ River AI (400): ${message}`);
          throw new GeminiInvalidRequestException(`River AI Invalid Request: ${message}`, err);
        }

        // 2. Lỗi API Key chết hoặc sai xác thực (401 / 403): Đánh dấu DEAD
        if (
          status === 401 ||
          status === 403 ||
          message.toLowerCase().includes('api key') ||
          message.toLowerCase().includes('unauthorized') ||
          message.toLowerCase().includes('forbidden')
        ) {
          this.riverKeyManager.markDead(activeKey.index, message);
          this.logger.warn(
            `River key [${activeKey.name} (${activeKey.maskedKey})] hỏng, đánh dấu DEAD vĩnh viễn (Lần ${attempt}/${maxAttempts})...`,
          );
        } else if (
          status === 429 ||
          message.includes('429') ||
          message.toLowerCase().includes('rate limit') ||
          message.toLowerCase().includes('quota')
        ) {
          // 3. Lỗi Quota / Rate limit (429): Đưa key vào hàng đợi COOLDOWN
          this.riverKeyManager.markCooldown(activeKey.index, message);
          this.logger.warn(
            `River key [${activeKey.name} (${activeKey.maskedKey})] chạm giới hạn 429, đưa vào COOLDOWN (Lần ${attempt}/${maxAttempts})...`,
          );
        } else {
          // 4. Lỗi Timeout, 500/503 hoặc Model không phản hồi:
          // Theo edge case đã xác nhận: Không phạt cooldown key để có thể tái sử dụng cho request sau
          this.logger.warn(
            `River AI model [${currentModel}] không phản hồi hoặc lỗi máy chủ (${message}) qua key [${activeKey.name} (${activeKey.maskedKey})] (Lần ${attempt}/${maxAttempts})...`,
          );
        }

        // Nếu còn lượt thử tiếp theo:
        if (attempt < maxAttempts) {
          // Nếu model hiện tại là model 1 và có cấu hình model 2 -> chuyển ngay sang model 2
          if (currentModel === this.riverModel1 && this.riverModel2) {
            this.logger.warn(
              `Model chính [${this.riverModel1}] không phản hồi. Tự động chuyển sang Model 2 [${this.riverModel2}] với key tiếp theo...`,
            );
            currentModel = this.riverModel2;
          }
          await new Promise((res) => setTimeout(res, 300));
          continue;
        }

        throw err;
      }
    }

    throw lastError;
  }

  /**
   * Gọi Gemini sinh JSON có cấu trúc, tự động làm sạch Markdown code fences và parse ra kiểu T
   */
  async generateJson<T>(
    prompt: string,
    options?: GenerateContentOptions,
  ): Promise<GeminiExecutionResult<T>> {
    const jsonOptions: GenerateContentOptions = {
      ...options,
      responseMimeType: 'application/json',
    };

    const result = await this.generateContent(prompt, jsonOptions);

    let cleanedText = result.rawText.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
    }

    try {
      const parsedData = JSON.parse(cleanedText) as T;
      return {
        ...result,
        data: parsedData,
      };
    } catch (parseErr) {
      this.logger.error(
        `Không thể parse kết quả JSON trả về từ model: ${cleanedText.slice(0, 300)}...`,
        parseErr,
      );
      throw new GeminiResponseParsingException(
        'Dữ liệu JSON do model sinh ra không đúng cú pháp hợp lệ.',
        parseErr,
      );
    }
  }

  /**
   * Phân loại lỗi trả về từ SDK @google/genai
   */
  public classifySdkException(err: unknown): GeminiBaseException {
    if (err instanceof GeminiBaseException) {
      return err;
    }

    const errObj = err as Record<string, unknown> | null;
    const message = (errObj?.message as string) || String(err);
    const status = (errObj?.status as number) || (errObj?.statusCode as number);

    // 1. Kiểm tra 429 / RESOURCE_EXHAUSTED
    if (
      status === 429 ||
      message.includes('429') ||
      message.includes('RESOURCE_EXHAUSTED') ||
      message.includes('Quota exceeded')
    ) {
      return new GeminiRateLimitException(`Gemini Rate Limit / Quota Exceeded: ${message}`, err);
    }

    // 2. Kiểm tra lỗi API Key
    if (
      status === 401 ||
      status === 403 ||
      message.includes('API_KEY_INVALID') ||
      message.includes('API key not valid') ||
      message.includes('PERMISSION_DENIED')
    ) {
      return new GeminiAuthException(`Gemini API Key Authentication Failed: ${message}`, err);
    }

    // 3. Kiểm tra Model Not Found
    if (
      status === 404 ||
      message.includes('404') ||
      message.includes('not found') ||
      message.includes('Model not found')
    ) {
      return new GeminiModelNotFoundException(`Gemini Model Not Found (${this.configuredModel}): ${message}`, err);
    }

    // 4. Kiểm tra Invalid Argument
    if (
      status === 400 ||
      message.includes('INVALID_ARGUMENT') ||
      message.includes('bad request')
    ) {
      return new GeminiInvalidRequestException(`Gemini Invalid Request Argument: ${message}`, err);
    }

    // 5. Kiểm tra 503 UNAVAILABLE / Model Overloaded (Quá tải cụm model Google)
    if (
      status === 503 ||
      message.includes('503') ||
      message.includes('UNAVAILABLE') ||
      message.includes('model is overloaded') ||
      message.includes('The model is overloaded') ||
      message.includes('overloaded')
    ) {
      return new GeminiModelUnavailableException(`Gemini Model Overloaded / Unavailable (503): ${message}`, err);
    }

    // 6. Kiểm tra Service Unavailable (500 / Internal error / Network failure)
    if (
      status === 500 ||
      message.includes('Internal error') ||
      message.includes('fetch failed')
    ) {
      return new GeminiServiceUnavailableException(`Gemini Service Unavailable: ${message}`, err);
    }

    // Default Fallback
    return new GeminiServiceUnavailableException(`Gemini Provider Error: ${message}`, err);
  }
}
