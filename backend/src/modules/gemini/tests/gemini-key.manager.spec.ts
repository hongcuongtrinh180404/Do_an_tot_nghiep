import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { GeminiKeyManager } from '../gemini-key.manager.js';
import { GeminiAllKeysExhaustedException } from '../gemini.errors.js';

describe('GeminiKeyManager', () => {
  let keyManager: GeminiKeyManager;
  let mockConfigService: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn(),
    };
  });

  describe('Initialization and Key Masking', () => {
    it('should correctly mask API keys to protect sensitive information', () => {
      const longKey = 'AIzaSyDemoKey1234567890ABCDEF';
      expect(GeminiKeyManager.maskKey(longKey)).toBe('AIzaSy...CDEF');

      const shortKey = 'short';
      expect(GeminiKeyManager.maskKey(shortKey)).toBe('***');
    });

    it('should filter out placeholder keys and initialize only valid keys', () => {
      mockConfigService.get.mockImplementation((keyName: string) => {
        if (keyName === 'GEMINI_API_KEY_1') return 'AIzaSyValidKeyOne12345678';
        if (keyName === 'GEMINI_API_KEY_2') return 'your_gemini_api_key_2_here'; // Placeholder
        if (keyName === 'GEMINI_API_KEY_3') return 'AIzaSyValidKeyThree876543';
        return '';
      });

      keyManager = new GeminiKeyManager(mockConfigService as unknown as ConfigService);
      const status = keyManager.getKeysHealthStatus();

      expect(status).toHaveLength(2);
      expect(status[0].name).toBe('GEMINI_API_KEY_1');
      expect(status[0].maskedKey).toBe('AIzaSy...5678');
      expect(status[1].name).toBe('GEMINI_API_KEY_3');
      expect(status[1].maskedKey).toBe('AIzaSy...6543');
    });

    it('should fallback to GEMINI_API_KEY if no numbered keys are defined', () => {
      mockConfigService.get.mockImplementation((keyName: string) => {
        if (keyName === 'GEMINI_API_KEY') return 'AIzaSySingleFallbackKey999';
        return '';
      });

      keyManager = new GeminiKeyManager(mockConfigService as unknown as ConfigService);
      const status = keyManager.getKeysHealthStatus();

      expect(status).toHaveLength(1);
      expect(status[0].name).toBe('GEMINI_API_KEY');
    });
  });

  describe('Round-Robin Key Selection', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((keyName: string) => {
        if (keyName === 'GEMINI_API_KEY_1') return 'AIzaSyKey111111111111111';
        if (keyName === 'GEMINI_API_KEY_2') return 'AIzaSyKey222222222222222';
        if (keyName === 'GEMINI_API_KEY_3') return 'AIzaSyKey333333333333333';
        return '';
      });
      keyManager = new GeminiKeyManager(mockConfigService as unknown as ConfigService);
    });

    it('should cycle through available ACTIVE keys sequentially', () => {
      const first = keyManager.getNextAvailableKey();
      const second = keyManager.getNextAvailableKey();
      const third = keyManager.getNextAvailableKey();
      const fourth = keyManager.getNextAvailableKey();

      expect(first.name).toBe('GEMINI_API_KEY_1');
      expect(second.name).toBe('GEMINI_API_KEY_2');
      expect(third.name).toBe('GEMINI_API_KEY_3');
      expect(fourth.name).toBe('GEMINI_API_KEY_1'); // Cycles back
    });
  });

  describe('Cooldown and Rate Limit Handling', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((keyName: string) => {
        if (keyName === 'GEMINI_API_KEY_1') return 'AIzaSyKey111111111111111';
        if (keyName === 'GEMINI_API_KEY_2') return 'AIzaSyKey222222222222222';
        return '';
      });
      keyManager = new GeminiKeyManager(mockConfigService as unknown as ConfigService);
    });

    it('should bypass key in COOLDOWN and pick the next ACTIVE key', () => {
      const key1 = keyManager.getNextAvailableKey();
      expect(key1.index).toBe(0);

      // Put key 1 into cooldown
      keyManager.markCooldown(key1.index, '429 Quota Exceeded');

      const status = keyManager.getKeysHealthStatus();
      expect(status[0].status).toBe('COOLDOWN');
      expect(status[0].failureCount).toBe(1);

      // Next call should pick key 2
      const key2 = keyManager.getNextAvailableKey();
      expect(key2.index).toBe(1);

      // Next call should still skip key 1 and pick key 2
      const key2Again = keyManager.getNextAvailableKey();
      expect(key2Again.index).toBe(1);
    });

    it('should automatically recover a key from COOLDOWN after cooldown period expires', () => {
      const key1 = keyManager.getNextAvailableKey();
      keyManager.markCooldown(key1.index, '429 Rate limit');
      // Mark key 2 as DEAD so key 1 is the sole recovering key
      keyManager.markDead(1, 'Dead key');

      // Mock time advancing by 35 seconds
      const originalNow = Date.now;
      vi.spyOn(Date, 'now').mockReturnValue(originalNow() + 35000);

      const picked = keyManager.getNextAvailableKey();
      // Should pick key 1 because its cooldown expired
      expect(picked.index).toBe(0);
      expect(picked.status).toBe('ACTIVE');

      vi.restoreAllMocks();
    });

    it('should throw GeminiAllKeysExhaustedException when all keys are in COOLDOWN', () => {
      keyManager.markCooldown(0, 'Quota limit');
      keyManager.markCooldown(1, 'Quota limit');

      expect(() => keyManager.getNextAvailableKey()).toThrow(GeminiAllKeysExhaustedException);
    });
  });

  describe('Dead Key Handling', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((keyName: string) => {
        if (keyName === 'GEMINI_API_KEY_1') return 'AIzaSyKey111111111111111';
        if (keyName === 'GEMINI_API_KEY_2') return 'AIzaSyKey222222222222222';
        return '';
      });
      keyManager = new GeminiKeyManager(mockConfigService as unknown as ConfigService);
    });

    it('should permanently mark key as DEAD on authentication error', () => {
      keyManager.markDead(0, 'API_KEY_INVALID');

      const status = keyManager.getKeysHealthStatus();
      expect(status[0].status).toBe('DEAD');

      const nextKey = keyManager.getNextAvailableKey();
      expect(nextKey.index).toBe(1);

      const nextKeyAgain = keyManager.getNextAvailableKey();
      expect(nextKeyAgain.index).toBe(1);
    });

    it('should throw GeminiAllKeysExhaustedException when all keys are DEAD', () => {
      keyManager.markDead(0, 'Invalid');
      keyManager.markDead(1, 'Invalid');

      expect(() => keyManager.getNextAvailableKey()).toThrow(GeminiAllKeysExhaustedException);
    });
  });

  describe('Success Recording', () => {
    it('should reset failureCount and update lastUsedAt on success', () => {
      mockConfigService.get.mockImplementation((keyName: string) => {
        if (keyName === 'GEMINI_API_KEY_1') return 'AIzaSyKey111111111111111';
        return '';
      });
      keyManager = new GeminiKeyManager(mockConfigService as unknown as ConfigService);

      keyManager.markCooldown(0);
      expect(keyManager.getKeysHealthStatus()[0].failureCount).toBe(1);

      keyManager.recordSuccess(0);
      const status = keyManager.getKeysHealthStatus();
      expect(status[0].failureCount).toBe(0);
      expect(status[0].lastUsedAt).toBeGreaterThan(0);
    });
  });
});
