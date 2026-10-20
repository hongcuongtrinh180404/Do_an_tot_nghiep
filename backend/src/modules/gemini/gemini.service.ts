import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, type GenerateContentConfig } from '@google/genai';
import {
  GeminiExecutionResult,
  GenerateContentOptions,
  IGeminiService,
} from './interfaces/gemini.interface.js';
import { GeminiKeyManager } from './gemini-key.manager.js';
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

  constructor(
    private readonly configService: ConfigService,
    private readonly keyManager: GeminiKeyManager,
  ) {
    this.configuredModel = this.configService
      .get<string>('GEMINI_MODEL', 'gemini-3.8-flash')
      .trim();

    this.fallbackModel = this.configService
      .get<string>('GEMINI_FALLBACK_MODEL', 'gemini-3.5-flash-lite')
      .trim();

    this.logger.log(
      `GeminiService đã khởi tạo với model chính: ${this.configuredModel}, model dự phòng: ${this.fallbackModel}`,
    );
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
   * Gọi Gemini API sinh nội dung text với cơ chế xoay vòng key và chuyển đổi tạm thời sang fallback model khi 503
   */
  async generateContent(
    prompt: string,
    options?: GenerateContentOptions,
  ): Promise<GeminiExecutionResult<string>> {
    const trimmedPrompt = prompt?.trim();
    if (!trimmedPrompt) {
      throw new GeminiInvalidRequestException('Prompt gửi tới Gemini không được để trống.');
    }

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
          isFallback,
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
