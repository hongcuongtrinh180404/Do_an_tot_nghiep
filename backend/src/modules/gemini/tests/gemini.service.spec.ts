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
});
