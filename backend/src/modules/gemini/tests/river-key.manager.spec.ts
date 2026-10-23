import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { RiverKeyManager } from '../river-key.manager.js';
import { RiverAllKeysExhaustedException } from '../gemini.errors.js';

describe('RiverKeyManager', () => {
  let keyManager: RiverKeyManager;
  let mockConfigService: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn(),
    };
  });

  describe('Initialization and Key Masking', () => {
    it('should correctly mask API keys to protect sensitive information', () => {
      const longKey = 'rv_live_abcdef1234567890xyz';
      expect(RiverKeyManager.maskKey(longKey)).toBe('rv_liv...0xyz');

      const shortKey = 'short';
      expect(RiverKeyManager.maskKey(shortKey)).toBe('***');
    });

    it('should filter out placeholder keys and initialize only valid keys', () => {
      mockConfigService.get.mockImplementation((keyName: string) => {
        if (keyName === 'RIVER_API_KEY_1') return 'rv_valid_key_one_12345';
        if (keyName === 'RIVER_API_KEY_2') return 'your_river_api_key_2_here'; // Placeholder
        if (keyName === 'RIVER_API_KEY_3') return 'rv_valid_key_three_67890';
        return '';
      });

      keyManager = new RiverKeyManager(mockConfigService as unknown as ConfigService);
      const status = keyManager.getKeysHealthStatus();

      expect(keyManager.isConfigured()).toBe(true);
      expect(status).toHaveLength(2);
      expect(status[0].name).toBe('RIVER_API_KEY_1');
      expect(status[0].maskedKey).toBe('rv_val...2345');
      expect(status[1].name).toBe('RIVER_API_KEY_3');
      expect(status[1].maskedKey).toBe('rv_val...7890');
    });

    it('should fallback to RIVER_API_KEY if no numbered keys are defined', () => {
      mockConfigService.get.mockImplementation((keyName: string) => {
        if (keyName === 'RIVER_API_KEY') return 'rv_single_fallback_key_99999';
        return '';
      });

      keyManager = new RiverKeyManager(mockConfigService as unknown as ConfigService);
      const status = keyManager.getKeysHealthStatus();

      expect(keyManager.isConfigured()).toBe(true);
      expect(status).toHaveLength(1);
      expect(status[0].name).toBe('RIVER_API_KEY');
    });

    it('should report isConfigured as false when no keys are found', () => {
      mockConfigService.get.mockReturnValue('');
      keyManager = new RiverKeyManager(mockConfigService as unknown as ConfigService);
      expect(keyManager.isConfigured()).toBe(false);
      expect(() => keyManager.getNextAvailableKey()).toThrow(RiverAllKeysExhaustedException);
    });
  });

  describe('Round-Robin Key Selection', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((keyName: string) => {
        if (keyName === 'RIVER_API_KEY_1') return 'rv_key_111111111111111';
        if (keyName === 'RIVER_API_KEY_2') return 'rv_key_222222222222222';
        if (keyName === 'RIVER_API_KEY_3') return 'rv_key_333333333333333';
        return '';
      });
      keyManager = new RiverKeyManager(mockConfigService as unknown as ConfigService);
    });

    it('should cycle through available ACTIVE keys sequentially', () => {
      const first = keyManager.getNextAvailableKey();
      const second = keyManager.getNextAvailableKey();
      const third = keyManager.getNextAvailableKey();
      const fourth = keyManager.getNextAvailableKey();

      expect(first.name).toBe('RIVER_API_KEY_1');
      expect(second.name).toBe('RIVER_API_KEY_2');
      expect(third.name).toBe('RIVER_API_KEY_3');
      expect(fourth.name).toBe('RIVER_API_KEY_1'); // Cycles back
    });
  });

  describe('Cooldown and Rate Limit Handling', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((keyName: string) => {
        if (keyName === 'RIVER_API_KEY_1') return 'rv_key_111111111111111';
        if (keyName === 'RIVER_API_KEY_2') return 'rv_key_222222222222222';
        return '';
      });
      keyManager = new RiverKeyManager(mockConfigService as unknown as ConfigService);
    });

    it('should bypass key in COOLDOWN and pick the next ACTIVE key', () => {
      const key1 = keyManager.getNextAvailableKey();
      expect(key1.index).toBe(0);

      // Put key 1 into cooldown
      keyManager.markCooldown(key1.index, '429 Quota Exceeded');

      const status = keyManager.getKeysHealthStatus();
      expect(status[0].status).toBe('COOLDOWN');
      expect(status[0].failureCount).toBe(1);

      // Next key should be key 2
      const key2 = keyManager.getNextAvailableKey();
      expect(key2.name).toBe('RIVER_API_KEY_2');

      // Calling again should still return key 2 because key 1 is in cooldown
      const key2Again = keyManager.getNextAvailableKey();
      expect(key2Again.name).toBe('RIVER_API_KEY_2');
    });

    it('should throw RiverAllKeysExhaustedException when all keys are in COOLDOWN', () => {
      keyManager.markCooldown(0, 'Key 1 Rate Limit');
      keyManager.markCooldown(1, 'Key 2 Rate Limit');

      expect(() => keyManager.getNextAvailableKey()).toThrow(RiverAllKeysExhaustedException);
    });

    it('should automatically recover a key from COOLDOWN after cooldown period expires', () => {
      keyManager.markCooldown(0, 'Key 1 Rate Limit');

      // Advance time beyond cooldown
      const realNow = Date.now;
      Date.now = vi.fn().mockReturnValue(realNow() + 35000);

      const recoveredKey = keyManager.getNextAvailableKey();
      expect(recoveredKey.index).toBe(0);
      expect(recoveredKey.status).toBe('ACTIVE');

      Date.now = realNow;
    });

    it('should reset failureCount when recordSuccess is called', () => {
      keyManager.markCooldown(0, '429 Rate Limit');
      expect(keyManager.getKeysHealthStatus()[0].failureCount).toBe(1);

      keyManager.recordSuccess(0);
      expect(keyManager.getKeysHealthStatus()[0].failureCount).toBe(0);
    });
  });

  describe('DEAD Key Handling', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((keyName: string) => {
        if (keyName === 'RIVER_API_KEY_1') return 'rv_key_111111111111111';
        if (keyName === 'RIVER_API_KEY_2') return 'rv_key_222222222222222';
        return '';
      });
      keyManager = new RiverKeyManager(mockConfigService as unknown as ConfigService);
    });

    it('should mark a key as DEAD and never pick it again', () => {
      keyManager.markDead(0, '401 Unauthorized / Revoked');

      const status = keyManager.getKeysHealthStatus();
      expect(status[0].status).toBe('DEAD');

      const next = keyManager.getNextAvailableKey();
      expect(next.name).toBe('RIVER_API_KEY_2');
    });

    it('should throw RiverAllKeysExhaustedException when all keys are DEAD', () => {
      keyManager.markDead(0);
      keyManager.markDead(1);

      expect(() => keyManager.getNextAvailableKey()).toThrow(RiverAllKeysExhaustedException);
    });
  });

  describe('Client Caching', () => {
    it('should return cached OpenAI instance for the same key and baseURL', () => {
      mockConfigService.get.mockImplementation((keyName: string) => {
        if (keyName === 'RIVER_API_KEY_1') return 'rv_key_111111111111111';
        return '';
      });
      keyManager = new RiverKeyManager(mockConfigService as unknown as ConfigService);

      const client1 = keyManager.getClient('rv_key_111111111111111', 'https://api.river.ai/v1', 60000);
      const client2 = keyManager.getClient('rv_key_111111111111111', 'https://api.river.ai/v1', 60000);

      expect(client1).toBe(client2);
    });
  });
});
