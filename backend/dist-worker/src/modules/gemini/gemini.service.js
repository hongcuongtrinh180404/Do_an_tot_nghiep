var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var GeminiService_1;
import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { GeminiKeyManager } from './gemini-key.manager.js';
import { RiverKeyManager } from './river-key.manager.js';
import { GeminiAuthException, GeminiBaseException, GeminiInvalidRequestException, GeminiModelNotFoundException, GeminiModelUnavailableException, GeminiRateLimitException, GeminiResponseParsingException, GeminiServiceUnavailableException, } from './gemini.errors.js';
let GeminiService = GeminiService_1 = class GeminiService {
    configService;
    keyManager;
    logger = new Logger(GeminiService_1.name);
    configuredModel;
    fallbackModel;
    clientCache = new Map();
    primaryProvider;
    riverBaseUrl;
    riverModel1;
    riverModel2;
    riverTimeoutMs;
    riverKeyManager;
    constructor(configService, keyManager, riverKeyManager) {
        this.configService = configService;
        this.keyManager = keyManager;
        this.riverKeyManager = riverKeyManager ?? new RiverKeyManager(this.configService);
        this.configuredModel = this.configService
            .get('GEMINI_MODEL', 'gemini-3.8-flash')
            .trim();
        this.fallbackModel = this.configService
            .get('GEMINI_FALLBACK_MODEL', 'gemini-3.5-flash-lite')
            .trim();
        this.primaryProvider =
            this.configService
                .get('AI_PRIMARY_PROVIDER', 'RIVER')
                .trim()
                .toUpperCase() === 'GEMINI'
                ? 'GEMINI'
                : 'RIVER';
        this.riverBaseUrl = this.configService
            .get('RIVER_BASE_URL', 'https://api.river.ai/v1')
            .trim();
        this.riverModel1 = (this.configService.get('RIVER_MODEL_1', '') ||
            this.configService.get('RIVER_MODEL', 'deepseek-ai/DeepSeek-V4.1-Flash')).trim();
        this.riverModel2 = this.configService
            .get('RIVER_MODEL_2', '')
            .trim();
        this.riverTimeoutMs = Number(this.configService.get('RIVER_TIMEOUT_MS', 60000));
        this.logger.log(`GeminiService khởi tạo thành công. Provider ưu tiên: [${this.primaryProvider}]. ` +
            `Model Gemini chính: ${this.configuredModel}, Model River AI: ${this.riverModel1}${this.riverModel2 ? ` (Model 2 dự phòng: ${this.riverModel2})` : ''}`);
        if (this.isRiverAiEnabled()) {
            this.logger.log(`River AI đã sẵn sàng (Role: ${this.primaryProvider === 'RIVER' ? 'PRIMARY' : 'FALLBACK'}) với model: ${this.riverModel1}, endpoint: ${this.riverBaseUrl}`);
        }
    }
    isRiverAiEnabled() {
        return this.riverKeyManager.isConfigured();
    }
    isRiverAiPrimary() {
        return this.isRiverAiEnabled() && this.primaryProvider === 'RIVER';
    }
    getClient(apiKey) {
        let client = this.clientCache.get(apiKey);
        if (!client) {
            client = new GoogleGenAI({ apiKey });
            this.clientCache.set(apiKey, client);
        }
        return client;
    }
    async generateContent(prompt, options) {
        const trimmedPrompt = prompt?.trim();
        if (!trimmedPrompt) {
            throw new GeminiInvalidRequestException('Prompt gửi tới AI không được để trống.');
        }
        if (this.isRiverAiPrimary()) {
            try {
                return await this.callRiverAi(trimmedPrompt, options, false);
            }
            catch (riverErr) {
                this.logger.warn(`Nhà cung cấp chính River AI gặp lỗi (${riverErr?.message || riverErr}). Tự động chuyển tiếp sang cụm Google Gemini dự phòng...`);
                try {
                    return await this.executeGeminiWithRetry(trimmedPrompt, options, true);
                }
                catch (geminiErr) {
                    this.logger.error(`Cả River AI và cụm Google Gemini đều thất bại. River: ${riverErr?.message}, Gemini: ${geminiErr?.message}`);
                    throw new GeminiServiceUnavailableException(`Cả nhà cung cấp chính River AI lẫn cụm Gemini dự phòng đều thất bại: ${riverErr?.message || riverErr}`, geminiErr);
                }
            }
        }
        try {
            return await this.executeGeminiWithRetry(trimmedPrompt, options, false);
        }
        catch (geminiErr) {
            if (geminiErr instanceof GeminiInvalidRequestException ||
                geminiErr instanceof GeminiModelNotFoundException) {
                throw geminiErr;
            }
            if (this.isRiverAiEnabled()) {
                this.logger.warn(`Cụm Google Gemini không thể xử lý sau các lần thử (${geminiErr?.message || geminiErr}). Tự động kích hoạt dự phòng sang River AI...`);
                try {
                    return await this.callRiverAi(trimmedPrompt, options, true);
                }
                catch (riverErr) {
                    throw new GeminiServiceUnavailableException(`Toàn bộ cụm Gemini và nhà cung cấp dự phòng River AI đều thất bại: ${riverErr?.message || riverErr}`, riverErr);
                }
            }
            throw geminiErr;
        }
    }
    async executeGeminiWithRetry(trimmedPrompt, options, isFallbackMode = false) {
        const maxAttempts = 3;
        let lastError = null;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const activeKey = this.keyManager.getNextAvailableKey();
            const startTime = Date.now();
            try {
                const client = this.getClient(activeKey.key);
                const config = {
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
                    config.responseSchema = options.responseSchema;
                }
                let usedModel = this.configuredModel;
                let isFallback = false;
                let response;
                try {
                    this.logger.debug(`[Lần ${attempt}/${maxAttempts}] Gửi request tới Gemini model ${usedModel} bằng key [${activeKey.name} (${activeKey.maskedKey})]...`);
                    response = await client.models.generateContent({
                        model: usedModel,
                        contents: trimmedPrompt,
                        config,
                    });
                }
                catch (callErr) {
                    const classifiedCallErr = this.classifySdkException(callErr);
                    if (usedModel === this.configuredModel &&
                        classifiedCallErr instanceof GeminiModelUnavailableException) {
                        this.logger.warn(`Model chính [${this.configuredModel}] trả về 503 UNAVAILABLE qua key [${activeKey.name} (${activeKey.maskedKey})]. Tạm thời chuyển request sang model dự phòng [${this.fallbackModel}]...`);
                        usedModel = this.fallbackModel;
                        isFallback = true;
                        this.logger.debug(`Thử lại ngay với model dự phòng ${usedModel} trên key [${activeKey.name} (${activeKey.maskedKey})]...`);
                        response = await client.models.generateContent({
                            model: usedModel,
                            contents: trimmedPrompt,
                            config,
                        });
                    }
                    else {
                        throw callErr;
                    }
                }
                const executionTimeMs = Date.now() - startTime;
                const rawText = response.text?.trim() || '';
                this.keyManager.recordSuccess(activeKey.index);
                const usage = response.usageMetadata
                    ? {
                        promptTokens: response.usageMetadata.promptTokenCount ?? 0,
                        completionTokens: response.usageMetadata.candidatesTokenCount ?? 0,
                        totalTokens: response.usageMetadata.totalTokenCount ?? 0,
                    }
                    : undefined;
                this.logger.log(`Gemini [${usedModel}] hoàn thành thành công trong ${executionTimeMs}ms qua key [${activeKey.name} (${activeKey.maskedKey})]. Tokens: ${usage?.totalTokens ?? 'N/A'}${isFallback ? ' (Fallback)' : ''}`);
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
            }
            catch (err) {
                lastError = err;
                const classified = this.classifySdkException(err);
                if (classified instanceof GeminiAuthException) {
                    this.keyManager.markDead(activeKey.index, classified.message);
                    this.logger.warn(`Key [${activeKey.name} (${activeKey.maskedKey})] hỏng, tự động chuyển sang key khác (Lần ${attempt}/${maxAttempts})...`);
                    continue;
                }
                if (classified instanceof GeminiRateLimitException) {
                    this.keyManager.markCooldown(activeKey.index, classified.message);
                    this.logger.warn(`Key [${activeKey.name} (${activeKey.maskedKey})] chạm giới hạn quota, tự động đổi key khác (Lần ${attempt}/${maxAttempts})...`);
                    if (attempt < maxAttempts) {
                        await new Promise((res) => setTimeout(res, 500));
                        continue;
                    }
                    throw classified;
                }
                if (classified instanceof GeminiModelUnavailableException) {
                    this.logger.warn(`Cụm model Google tạm thời quá tải qua key [${activeKey.name} (${activeKey.maskedKey})], thử lại lượt tiếp theo...`);
                    if (attempt < maxAttempts) {
                        await new Promise((res) => setTimeout(res, 200));
                        continue;
                    }
                    throw classified;
                }
                if (classified instanceof GeminiServiceUnavailableException) {
                    this.keyManager.markCooldown(activeKey.index, classified.message);
                    this.logger.warn(`Máy chủ Google tạm thời gián đoạn qua key [${activeKey.name} (${activeKey.maskedKey})], thử key khác...`);
                    if (attempt < maxAttempts) {
                        await new Promise((res) => setTimeout(res, 1000));
                        continue;
                    }
                    throw classified;
                }
                if (classified instanceof GeminiInvalidRequestException ||
                    classified instanceof GeminiModelNotFoundException) {
                    this.logger.error(`Lỗi không thể retry từ Gemini: ${classified.message}`);
                    throw classified;
                }
                this.logger.error(`Lỗi không mong muốn từ Gemini SDK: ${err?.message || err}`);
                if (attempt < maxAttempts) {
                    this.keyManager.markCooldown(activeKey.index, err?.message);
                    continue;
                }
                throw classified;
            }
        }
        if (lastError instanceof GeminiBaseException) {
            throw lastError;
        }
        throw new GeminiServiceUnavailableException('Không thể hoàn thành yêu cầu gọi Gemini sau nhiều lần thử lại qua các API key.', lastError);
    }
    async callRiverAi(prompt, options, isFallback = false) {
        const maxAttempts = 3;
        let lastError = null;
        let currentModel = this.riverModel1;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            let activeKey;
            try {
                activeKey = this.riverKeyManager.getNextAvailableKey();
            }
            catch (keyExhaustedErr) {
                this.logger.warn(`Không thể lấy API key River khả dụng: ${keyExhaustedErr?.message}`);
                throw keyExhaustedErr;
            }
            const startTime = Date.now();
            const isModelFallback = currentModel !== this.riverModel1;
            try {
                const client = this.riverKeyManager.getClient(activeKey.key, this.riverBaseUrl, this.riverTimeoutMs);
                const messages = [];
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
                const completionParams = {
                    model: currentModel,
                    messages,
                    temperature: options?.temperature ?? 0.2,
                    top_p: options?.topP,
                    max_tokens: options?.maxOutputTokens,
                };
                if (options?.responseMimeType === 'application/json') {
                    completionParams.response_format = { type: 'json_object' };
                }
                this.logger.debug(`[River AI Lần ${attempt}/${maxAttempts}] Gửi request tới model [${currentModel}] qua key [${activeKey.name} (${activeKey.maskedKey})] (${isFallback ? 'Dự phòng Provider' : 'Chính'}${isModelFallback ? ' - Model 2 Fallback' : ''})...`);
                const completion = await client.chat.completions.create(completionParams);
                const executionTimeMs = Date.now() - startTime;
                const rawText = completion.choices[0]?.message?.content?.trim() || '';
                this.riverKeyManager.recordSuccess(activeKey.index);
                const usage = completion.usage
                    ? {
                        promptTokens: completion.usage.prompt_tokens ?? 0,
                        completionTokens: completion.usage.completion_tokens ?? 0,
                        totalTokens: completion.usage.total_tokens ?? 0,
                    }
                    : undefined;
                this.logger.log(`River AI [${currentModel}] phản hồi thành công trong ${executionTimeMs}ms qua key [${activeKey.name} (${activeKey.maskedKey})]. Tokens: ${usage?.totalTokens ?? 'N/A'}${isFallback ? ' (Fallback Provider)' : ' (Primary Provider)'}${isModelFallback ? ' (Model 2 Fallback)' : ''}`);
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
            }
            catch (err) {
                lastError = err;
                const errObj = err;
                const message = errObj?.message || String(err);
                const status = errObj?.status || errObj?.statusCode;
                if (status === 400 && !message.toLowerCase().includes('model')) {
                    this.logger.error(`Lỗi request không hợp lệ từ River AI (400): ${message}`);
                    throw new GeminiInvalidRequestException(`River AI Invalid Request: ${message}`, err);
                }
                if (status === 401 ||
                    status === 403 ||
                    message.toLowerCase().includes('api key') ||
                    message.toLowerCase().includes('unauthorized') ||
                    message.toLowerCase().includes('forbidden')) {
                    this.riverKeyManager.markDead(activeKey.index, message);
                    this.logger.warn(`River key [${activeKey.name} (${activeKey.maskedKey})] hỏng, đánh dấu DEAD vĩnh viễn (Lần ${attempt}/${maxAttempts})...`);
                }
                else if (status === 429 ||
                    message.includes('429') ||
                    message.toLowerCase().includes('rate limit') ||
                    message.toLowerCase().includes('quota')) {
                    this.riverKeyManager.markCooldown(activeKey.index, message);
                    this.logger.warn(`River key [${activeKey.name} (${activeKey.maskedKey})] chạm giới hạn 429, đưa vào COOLDOWN (Lần ${attempt}/${maxAttempts})...`);
                }
                else {
                    this.logger.warn(`River AI model [${currentModel}] không phản hồi hoặc lỗi máy chủ (${message}) qua key [${activeKey.name} (${activeKey.maskedKey})] (Lần ${attempt}/${maxAttempts})...`);
                }
                if (attempt < maxAttempts) {
                    if (currentModel === this.riverModel1 && this.riverModel2) {
                        this.logger.warn(`Model chính [${this.riverModel1}] không phản hồi. Tự động chuyển sang Model 2 [${this.riverModel2}] với key tiếp theo...`);
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
    async generateJson(prompt, options) {
        const jsonOptions = {
            ...options,
            responseMimeType: 'application/json',
        };
        const result = await this.generateContent(prompt, jsonOptions);
        let cleanedText = result.rawText.trim();
        if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
        }
        else if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/^```\s*/i, '').replace(/\s*```$/i, '');
        }
        try {
            const parsedData = JSON.parse(cleanedText);
            return {
                ...result,
                data: parsedData,
            };
        }
        catch (parseErr) {
            this.logger.error(`Không thể parse kết quả JSON trả về từ model: ${cleanedText.slice(0, 300)}...`, parseErr);
            throw new GeminiResponseParsingException('Dữ liệu JSON do model sinh ra không đúng cú pháp hợp lệ.', parseErr);
        }
    }
    classifySdkException(err) {
        if (err instanceof GeminiBaseException) {
            return err;
        }
        const errObj = err;
        const message = errObj?.message || String(err);
        const status = errObj?.status || errObj?.statusCode;
        if (status === 429 ||
            message.includes('429') ||
            message.includes('RESOURCE_EXHAUSTED') ||
            message.includes('Quota exceeded')) {
            return new GeminiRateLimitException(`Gemini Rate Limit / Quota Exceeded: ${message}`, err);
        }
        if (status === 401 ||
            status === 403 ||
            message.includes('API_KEY_INVALID') ||
            message.includes('API key not valid') ||
            message.includes('PERMISSION_DENIED')) {
            return new GeminiAuthException(`Gemini API Key Authentication Failed: ${message}`, err);
        }
        if (status === 404 ||
            message.includes('404') ||
            message.includes('not found') ||
            message.includes('Model not found')) {
            return new GeminiModelNotFoundException(`Gemini Model Not Found (${this.configuredModel}): ${message}`, err);
        }
        if (status === 400 ||
            message.includes('INVALID_ARGUMENT') ||
            message.includes('bad request')) {
            return new GeminiInvalidRequestException(`Gemini Invalid Request Argument: ${message}`, err);
        }
        if (status === 503 ||
            message.includes('503') ||
            message.includes('UNAVAILABLE') ||
            message.includes('model is overloaded') ||
            message.includes('The model is overloaded') ||
            message.includes('overloaded')) {
            return new GeminiModelUnavailableException(`Gemini Model Overloaded / Unavailable (503): ${message}`, err);
        }
        if (status === 500 ||
            message.includes('Internal error') ||
            message.includes('fetch failed')) {
            return new GeminiServiceUnavailableException(`Gemini Service Unavailable: ${message}`, err);
        }
        return new GeminiServiceUnavailableException(`Gemini Provider Error: ${message}`, err);
    }
};
GeminiService = GeminiService_1 = __decorate([
    Injectable(),
    __param(2, Optional()),
    __metadata("design:paramtypes", [ConfigService,
        GeminiKeyManager,
        RiverKeyManager])
], GeminiService);
export { GeminiService };
//# sourceMappingURL=gemini.service.js.map