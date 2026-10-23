import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { GeminiService } from '../gemini.service.js';
import { GeminiKeyManager } from '../gemini-key.manager.js';
import {
  GeminiInvalidRequestException,
  GeminiModelNotFoundException,
  GeminiResponseParsingException,
  GeminiServiceUnavailableException,
} from '../gemini.errors.js';

// Hoisted mock for @google/genai generateContent
const mockGenerateContent = vi.fn();
// Hoisted mock for openai chat completions
const mockCreateChatCompletion = vi.fn();

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: class MockGoogleGenAI {
      public models = {
        generateContent: mockGenerateContent,
      };
      constructor(_options?: unknown) {}
    },
  };
});

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      public chat = {
        completions: {
          create: mockCreateChatCompletion,
        },
      };
      constructor(_options?: unknown) {}
    },
  };
});

describe('GeminiService', () => {
  let geminiService: GeminiService;
  let keyManager: GeminiKeyManager;
  let mockConfigService: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfigService = {
      get: vi.fn().mockImplementation((key: string, defaultVal?: unknown) => {
        if (key === 'GEMINI_MODEL') return 'gemini-3.8-flash';
        if (key === 'GEMINI_FALLBACK_MODEL') return 'gemini-3.5-flash-lite';
        if (key === 'GEMINI_API_KEY_1') return 'AIzaSyKey111111111111111';
        if (key === 'GEMINI_API_KEY_2') return 'AIzaSyKey222222222222222';
        return defaultVal ?? '';
      }),
    };

    keyManager = new GeminiKeyManager(mockConfigService as unknown as ConfigService);
    geminiService = new GeminiService(mockConfigService as unknown as ConfigService, keyManager);
  });

  describe('generateContent', () => {
    it('should throw GeminiInvalidRequestException if prompt is empty', async () => {
      await expect(geminiService.generateContent('   ')).rejects.toThrow(
        GeminiInvalidRequestException,
      );
    });

    it('should successfully generate text content with primary model and return formatted metadata', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Xin chào, tôi là Gemini 3.8 Flash',
        usageMetadata: {
          promptTokenCount: 15,
          candidatesTokenCount: 20,
          totalTokenCount: 35,
        },
      });

      const result = await geminiService.generateContent('Xin chào');

      expect(result.data).toBe('Xin chào, tôi là Gemini 3.8 Flash');
      expect(result.rawText).toBe('Xin chào, tôi là Gemini 3.8 Flash');
      expect(result.model).toBe('gemini-3.8-flash');
      expect(result.isFallback).toBe(false);
      expect(result.maskedKey).toBe('AIzaSy...1111');
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.usage?.totalTokens).toBe(35);
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-3.8-flash',
        }),
      );
    });

    it('should temporarily fallback to gemini-3.5-flash-lite when model 3.8 throws 503 UNAVAILABLE without penalizing the key', async () => {
      // First attempt on primary model throws 503 UNAVAILABLE / model overloaded
      mockGenerateContent.mockRejectedValueOnce({
        status: 503,
        message: 'The model is overloaded. UNAVAILABLE',
      });

      // Temporary fallback call on gemini-3.5-flash-lite succeeds immediately on same key
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Nội dung sinh bởi Gemini 3.5 Flash Lite sau khi fallback',
        usageMetadata: { totalTokenCount: 28 },
      });

      const result = await geminiService.generateContent('Tạo tóm tắt');

      expect(result.data).toBe('Nội dung sinh bởi Gemini 3.5 Flash Lite sau khi fallback');
      expect(result.model).toBe('gemini-3.5-flash-lite');
      expect(result.isFallback).toBe(true);
      expect(result.maskedKey).toBe('AIzaSy...1111');

      // Verify that primary model was attempted first, then fallback model
      expect(mockGenerateContent).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ model: 'gemini-3.8-flash' }),
      );
      expect(mockGenerateContent).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ model: 'gemini-3.5-flash-lite' }),
      );

      // Key 1 should remain ACTIVE (never penalized with COOLDOWN or DEAD for 503)
      const status = keyManager.getKeysHealthStatus();
      expect(status[0].status).toBe('ACTIVE');
    });

    it('should ensure subsequent requests always prioritize primary model 3.8 again after a previous fallback', async () => {
      // Request 1: 3.8 throws 503 -> fallbacks to 3.5
      mockGenerateContent.mockRejectedValueOnce({
        status: 503,
        message: 'The model is overloaded. UNAVAILABLE',
      });
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Response from fallback 3.5',
      });

      const res1 = await geminiService.generateContent('Request 1');
      expect(res1.model).toBe('gemini-3.5-flash-lite');
      expect(res1.isFallback).toBe(true);

      // Request 2: Must attempt 3.8 first again
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Response from recovered 3.8',
      });

      const res2 = await geminiService.generateContent('Request 2');
      expect(res2.model).toBe('gemini-3.8-flash');
      expect(res2.isFallback).toBe(false);

      // Verify call sequence: Call 3 was for gemini-3.8-flash
      expect(mockGenerateContent).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ model: 'gemini-3.8-flash' }),
      );
    });

    it('should handle Rate Limit (429), put key in cooldown and succeed with the second key', async () => {
      // First attempt throws 429
      mockGenerateContent.mockRejectedValueOnce({
        status: 429,
        message: 'Resource exhausted: quota exceeded',
      });

      // Second attempt succeeds
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Thành công sau khi đổi sang key 2',
        usageMetadata: { totalTokenCount: 25 },
      });

      const result = await geminiService.generateContent('Kiểm tra quota');

      expect(result.data).toBe('Thành công sau khi đổi sang key 2');
      expect(result.maskedKey).toBe('AIzaSy...2222');

      // Key 1 should be in cooldown
      const status = keyManager.getKeysHealthStatus();
      expect(status[0].status).toBe('COOLDOWN');
      expect(status[1].status).toBe('ACTIVE');
    });

    it('should handle Auth Error (400/403 API_KEY_INVALID), mark key DEAD and succeed with the second key', async () => {
      // First attempt fails with invalid key
      mockGenerateContent.mockRejectedValueOnce({
        status: 400,
        message: 'API_KEY_INVALID',
      });

      // Second attempt succeeds
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Thành công sau khi chuyển key do key 1 hỏng',
      });

      const result = await geminiService.generateContent('Kiểm tra key auth');

      expect(result.data).toBe('Thành công sau khi chuyển key do key 1 hỏng');
      expect(result.maskedKey).toBe('AIzaSy...2222');

      // Key 1 should be DEAD
      const status = keyManager.getKeysHealthStatus();
      expect(status[0].status).toBe('DEAD');
    });

    it('should fail fast on non-retryable errors like INVALID_ARGUMENT without rotating keys', async () => {
      mockGenerateContent.mockRejectedValueOnce({
        status: 400,
        message: 'INVALID_ARGUMENT: Prompt payload too large',
      });

      await expect(geminiService.generateContent('Invalid prompt')).rejects.toThrow(
        GeminiInvalidRequestException,
      );

      // Should only have attempted 1 call
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should fail fast on 404 Model Not Found without rotating keys', async () => {
      mockGenerateContent.mockRejectedValueOnce({
        status: 404,
        message: 'models/gemini-not-found is not found',
      });

      await expect(geminiService.generateContent('Test')).rejects.toThrow(
        GeminiModelNotFoundException,
      );

      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should throw GeminiServiceUnavailableException if both primary and fallback fail across max attempts', async () => {
      // Attempt 1: 3.8 throws 503, fallback 3.5 also throws 503
      mockGenerateContent.mockRejectedValueOnce({
        status: 503,
        message: 'The model is overloaded. UNAVAILABLE',
      });
      mockGenerateContent.mockRejectedValueOnce({
        status: 503,
        message: 'Fallback model is overloaded too. UNAVAILABLE',
      });

      // Attempt 2: 3.8 throws 503, fallback 3.5 also throws 503
      mockGenerateContent.mockRejectedValueOnce({
        status: 503,
        message: 'The model is overloaded. UNAVAILABLE',
      });
      mockGenerateContent.mockRejectedValueOnce({
        status: 503,
        message: 'Fallback model is overloaded too. UNAVAILABLE',
      });

      // Attempt 3: 3.8 throws 503, fallback 3.5 also throws 503
      mockGenerateContent.mockRejectedValueOnce({
        status: 503,
        message: 'The model is overloaded. UNAVAILABLE',
      });
      mockGenerateContent.mockRejectedValueOnce({
        status: 503,
        message: 'Fallback model is overloaded too. UNAVAILABLE',
      });

      await expect(geminiService.generateContent('Test dual outage')).rejects.toThrow(
        GeminiServiceUnavailableException,
      );
    });
  });

  describe('generateJson', () => {
    it('should successfully parse clean JSON output', async () => {
      const mockJson = {
        title: 'Tóm tắt bài học',
        points: ['Điểm 1', 'Điểm 2'],
      };

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockJson),
      });

      const result = await geminiService.generateJson<{ title: string; points: string[] }>(
        'Sinh tóm tắt JSON',
      );

      expect(result.data).toEqual(mockJson);
      expect(result.data.title).toBe('Tóm tắt bài học');
    });

    it('should strip markdown code block fences and parse valid JSON', async () => {
      const mockData = { count: 10, valid: true };
      mockGenerateContent.mockResolvedValueOnce({
        text: `\`\`\`json\n${JSON.stringify(mockData)}\n\`\`\``,
      });

      const result = await geminiService.generateJson<{ count: number; valid: boolean }>(
        'Test JSON fence',
      );

      expect(result.data).toEqual(mockData);
    });

    it('should throw GeminiResponseParsingException when model returns malformed JSON', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Đây không phải JSON: { invalid_json ',
      });

      await expect(
        geminiService.generateJson('Test malformed JSON'),
      ).rejects.toThrow(GeminiResponseParsingException);
    });
  });

  describe('River AI Integration (Primary & Fallback)', () => {
    let riverPrimaryService: GeminiService;
    let geminiPrimaryService: GeminiService;

    beforeEach(() => {
      // Service 1: Ưu tiên River AI (Primary)
      const riverPrimaryConfig = {
        get: vi.fn().mockImplementation((key: string, defaultVal?: unknown) => {
          if (key === 'AI_PRIMARY_PROVIDER') return 'RIVER';
          if (key === 'GEMINI_MODEL') return 'gemini-3.8-flash';
          if (key === 'GEMINI_FALLBACK_MODEL') return 'gemini-3.5-flash-lite';
          if (key === 'GEMINI_API_KEY_1') return 'AIzaSyKey111111111111111';
          if (key === 'RIVER_API_KEY') return 'rv_test_api_key_12345';
          if (key === 'RIVER_BASE_URL') return 'https://api.river.ai/v1';
          if (key === 'RIVER_MODEL') return 'deepseek-ai/DeepSeek-V4.1-Flash';
          if (key === 'RIVER_TIMEOUT_MS') return 60000;
          return defaultVal ?? '';
        }),
      };

      riverPrimaryService = new GeminiService(
        riverPrimaryConfig as unknown as ConfigService,
        new GeminiKeyManager(riverPrimaryConfig as unknown as ConfigService),
      );

      // Service 2: Ưu tiên Gemini, River AI làm dự phòng (Fallback)
      const geminiPrimaryConfig = {
        get: vi.fn().mockImplementation((key: string, defaultVal?: unknown) => {
          if (key === 'AI_PRIMARY_PROVIDER') return 'GEMINI';
          if (key === 'GEMINI_MODEL') return 'gemini-3.8-flash';
          if (key === 'GEMINI_FALLBACK_MODEL') return 'gemini-3.5-flash-lite';
          if (key === 'GEMINI_API_KEY_1') return 'AIzaSyKey111111111111111';
          if (key === 'RIVER_API_KEY') return 'rv_test_api_key_12345';
          if (key === 'RIVER_BASE_URL') return 'https://api.river.ai/v1';
          if (key === 'RIVER_MODEL') return 'deepseek-ai/DeepSeek-V4.1-Flash';
          if (key === 'RIVER_TIMEOUT_MS') return 60000;
          return defaultVal ?? '';
        }),
      };

      geminiPrimaryService = new GeminiService(
        geminiPrimaryConfig as unknown as ConfigService,
        new GeminiKeyManager(geminiPrimaryConfig as unknown as ConfigService),
      );
    });

    it('should confirm River AI status and primary role correctly', () => {
      expect(riverPrimaryService.isRiverAiEnabled()).toBe(true);
      expect(riverPrimaryService.isRiverAiPrimary()).toBe(true);

      expect(geminiPrimaryService.isRiverAiEnabled()).toBe(true);
      expect(geminiPrimaryService.isRiverAiPrimary()).toBe(false);

      expect(geminiService.isRiverAiEnabled()).toBe(false);
      expect(geminiService.isRiverAiPrimary()).toBe(false);
    });

    it('should prioritize River AI first when configured as primary provider', async () => {
      mockCreateChatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'Phản hồi từ River AI DeepSeek V4.1 Flash',
            },
          },
        ],
        usage: {
          prompt_tokens: 30,
          completion_tokens: 40,
          total_tokens: 70,
        },
      });

      const result = await riverPrimaryService.generateContent('Hỏi đáp về Next.js');

      expect(result.data).toBe('Phản hồi từ River AI DeepSeek V4.1 Flash');
      expect(result.model).toBe('riverai:deepseek-ai/DeepSeek-V4.1-Flash');
      expect(result.isFallback).toBe(false);
      expect(result.maskedKey).toBe('rv_tes...2345');
      expect(mockCreateChatCompletion).toHaveBeenCalledTimes(1);
      // Gemini không hề bị gọi tới
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('should automatically switch to River Model 2 on next key when Model 1 fails', async () => {
      const dualModelConfig = {
        get: vi.fn().mockImplementation((key: string, defaultVal?: unknown) => {
          if (key === 'AI_PRIMARY_PROVIDER') return 'RIVER';
          if (key === 'RIVER_MODEL_1') return 'deepseek-ai/DeepSeek-V4.1-Flash';
          if (key === 'RIVER_MODEL_2') return 'deepseek-ai/DeepSeek-V3';
          if (key === 'RIVER_API_KEY_1') return 'rv_key_111111111111111';
          if (key === 'RIVER_API_KEY_2') return 'rv_key_222222222222222';
          if (key === 'RIVER_BASE_URL') return 'https://api.river.ai/v1';
          return defaultVal ?? '';
        }),
      };

      const dualModelService = new GeminiService(
        dualModelConfig as unknown as ConfigService,
        new GeminiKeyManager(dualModelConfig as unknown as ConfigService),
      );

      // Lần 1: Model 1 bị lỗi server 500
      mockCreateChatCompletion.mockRejectedValueOnce(new Error('Model 1 internal error 500'));
      // Lần 2: Model 2 thành công trên key 2
      mockCreateChatCompletion.mockResolvedValueOnce({
        choices: [{ message: { content: 'Kết quả từ River Model 2 (DeepSeek-V3)' } }],
        usage: { prompt_tokens: 15, completion_tokens: 20, total_tokens: 35 },
      });

      const result = await dualModelService.generateContent('Kiểm tra chuyển đổi model 2');

      expect(result.data).toBe('Kết quả từ River Model 2 (DeepSeek-V3)');
      expect(result.model).toBe('riverai:deepseek-ai/DeepSeek-V3');
      expect(result.isFallback).toBe(true);
      expect(result.maskedKey).toBe('rv_key...2222');
      expect(mockCreateChatCompletion).toHaveBeenCalledTimes(2);
      expect(mockCreateChatCompletion.mock.calls[0][0].model).toBe('deepseek-ai/DeepSeek-V4.1-Flash');
      expect(mockCreateChatCompletion.mock.calls[1][0].model).toBe('deepseek-ai/DeepSeek-V3');
    });

    it('should put River key into cooldown on 429 and succeed with second River key', async () => {
      const multiKeyConfig = {
        get: vi.fn().mockImplementation((key: string, defaultVal?: unknown) => {
          if (key === 'AI_PRIMARY_PROVIDER') return 'RIVER';
          if (key === 'RIVER_MODEL_1') return 'deepseek-ai/DeepSeek-V4.1-Flash';
          if (key === 'RIVER_API_KEY_1') return 'rv_key_111111111111111';
          if (key === 'RIVER_API_KEY_2') return 'rv_key_222222222222222';
          if (key === 'RIVER_BASE_URL') return 'https://api.river.ai/v1';
          return defaultVal ?? '';
        }),
      };

      const multiKeyService = new GeminiService(
        multiKeyConfig as unknown as ConfigService,
        new GeminiKeyManager(multiKeyConfig as unknown as ConfigService),
      );

      // Key 1: 429 Rate Limit
      mockCreateChatCompletion.mockRejectedValueOnce({ status: 429, message: 'Rate limit exceeded' });
      // Key 2: Thành công
      mockCreateChatCompletion.mockResolvedValueOnce({
        choices: [{ message: { content: 'Thành công qua River Key 2' } }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      });

      const result = await multiKeyService.generateContent('Thử nghiệm xoay key 429');

      expect(result.data).toBe('Thành công qua River Key 2');
      expect(result.maskedKey).toBe('rv_key...2222');
      expect(mockCreateChatCompletion).toHaveBeenCalledTimes(2);
    });

    it('should automatically fallback to Gemini when primary River AI fails', async () => {
      // River AI ném lỗi trong cả 3 lần thử
      mockCreateChatCompletion.mockRejectedValue(
        new Error('River AI network timeout'),
      );

      // Gemini thành công ở lần thử đầu tiên
      mockGenerateContent.mockResolvedValueOnce({
        text: 'Nội dung dự phòng từ Google Gemini 3.8',
        usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 30, totalTokenCount: 50 },
      });

      const result = await riverPrimaryService.generateContent('Câu hỏi dự phòng');

      expect(result.data).toBe('Nội dung dự phòng từ Google Gemini 3.8');
      expect(result.model).toBe('gemini-3.8-flash');
      expect(result.isFallback).toBe(true);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should seamlessly parse structured JSON from River AI via generateJson', async () => {
      const mockQuizJson = {
        question: 'React Server Component chạy ở đâu?',
        options: ['Browser', 'Server', 'Cả hai'],
        correctIndex: 1,
      };

      mockCreateChatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: `\`\`\`json\n${JSON.stringify(mockQuizJson)}\n\`\`\``,
            },
          },
        ],
        usage: { prompt_tokens: 45, completion_tokens: 55, total_tokens: 100 },
      });

      const result = await riverPrimaryService.generateJson<{
        question: string;
        options: string[];
        correctIndex: number;
      }>('Sinh câu hỏi quiz');

      expect(result.data).toEqual(mockQuizJson);
      expect(result.data.question).toBe('React Server Component chạy ở đâu?');
      expect(result.model).toBe('riverai:deepseek-ai/DeepSeek-V4.1-Flash');
      expect(result.isFallback).toBe(false);
    });

    it('should throw GeminiServiceUnavailableException when both River AI and Gemini fail', async () => {
      mockCreateChatCompletion.mockRejectedValue(
        new Error('River AI 500 error'),
      );

      mockGenerateContent.mockRejectedValue({
        status: 503,
        message: 'Google cluster unavailable',
      });

      await expect(
        riverPrimaryService.generateContent('Cả hai hệ thống đều chết'),
      ).rejects.toThrow(GeminiServiceUnavailableException);
    });

    it('should use Gemini first and River AI as secondary fallback when AI_PRIMARY_PROVIDER=GEMINI', async () => {
      mockGenerateContent.mockRejectedValue({
        status: 429,
        message: 'All Gemini keys exhausted',
      });

      mockCreateChatCompletion.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'Nội dung cứu cánh từ River AI khi Gemini hết quota',
            },
          },
        ],
        usage: { prompt_tokens: 20, completion_tokens: 25, total_tokens: 45 },
      });

      const result = await geminiPrimaryService.generateContent('Hết quota Gemini');

      expect(result.data).toBe('Nội dung cứu cánh từ River AI khi Gemini hết quota');
      expect(result.model).toBe('riverai:deepseek-ai/DeepSeek-V4.1-Flash');
      expect(result.isFallback).toBe(true);
      expect(result.maskedKey).toBe('rv_tes...2345');
    });
  });
});
