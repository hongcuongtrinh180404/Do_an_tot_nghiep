import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';
import { SepayService } from '../services/sepay.service.js';
import { parseSepayTransactionDate } from '../utils/transaction-date.util.js';

describe('SepayService', () => {
  let service: SepayService;
  let mockConfigService: Partial<ConfigService>;

  const TEST_SECRET = 'super_secret_webhook_key_1234567890';
  const TEST_PREFIX = 'MD';

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        if (key === 'SEPAY_WEBHOOK_SECRET') return TEST_SECRET;
        if (key === 'SEPAY_PAYMENT_PREFIX') return TEST_PREFIX;
        return defaultValue;
      }),
    };

    service = new SepayService(mockConfigService as ConfigService);
  });

  describe('verifyWebhookSignature', () => {
    it('should verify successfully with valid HMAC-SHA256 signature and timestamp', () => {
      const currentSeconds = Math.floor(Date.now() / 1000);
      const rawBody = JSON.stringify({ id: 1001, transferAmount: 299000, transferType: 'in' });
      const dataToSign = `${currentSeconds}.${rawBody}`;
      const hash = crypto.createHmac('sha256', TEST_SECRET).update(dataToSign).digest('hex');
      const signature = `sha256=${hash}`;

      const headers = {
        'x-sepay-signature': signature,
        'x-sepay-timestamp': currentSeconds.toString(),
      };

      const result = service.verifyWebhookSignature(headers, Buffer.from(rawBody, 'utf8'));
      expect(result).toBe(true);
    });

    it('should accept signature without sha256= prefix and normalize it', () => {
      const currentSeconds = Math.floor(Date.now() / 1000);
      const rawBody = JSON.stringify({ id: 1002 });
      const dataToSign = `${currentSeconds}.${rawBody}`;
      const hash = crypto.createHmac('sha256', TEST_SECRET).update(dataToSign).digest('hex');

      const headers = {
        'x-sepay-signature': hash, // no sha256= prefix
        'x-sepay-timestamp': currentSeconds.toString(),
      };

      const result = service.verifyWebhookSignature(headers, Buffer.from(rawBody, 'utf8'));
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when signature is invalid', () => {
      const currentSeconds = Math.floor(Date.now() / 1000);
      const rawBody = JSON.stringify({ id: 1003 });

      const headers = {
        'x-sepay-signature': 'sha256=invalid_hash_value_1234567890abcdef',
        'x-sepay-timestamp': currentSeconds.toString(),
      };

      expect(() =>
        service.verifyWebhookSignature(headers, Buffer.from(rawBody, 'utf8')),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when payload was tampered after signing', () => {
      const currentSeconds = Math.floor(Date.now() / 1000);
      const originalBody = JSON.stringify({ id: 1004, transferAmount: 10000 });
      const tamperedBody = JSON.stringify({ id: 1004, transferAmount: 1000000 }); // modified amount!

      const dataToSign = `${currentSeconds}.${originalBody}`;
      const hash = crypto.createHmac('sha256', TEST_SECRET).update(dataToSign).digest('hex');

      const headers = {
        'x-sepay-signature': `sha256=${hash}`,
        'x-sepay-timestamp': currentSeconds.toString(),
      };

      expect(() =>
        service.verifyWebhookSignature(headers, Buffer.from(tamperedBody, 'utf8')),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when signature or timestamp header is missing', () => {
      expect(() => service.verifyWebhookSignature({}, Buffer.from('{}'))).toThrow(
        UnauthorizedException,
      );

      expect(() =>
        service.verifyWebhookSignature(
          { 'x-sepay-signature': 'sha256=123' },
          Buffer.from('{}'),
        ),
      ).toThrow(UnauthorizedException);

      expect(() =>
        service.verifyWebhookSignature(
          { 'x-sepay-timestamp': '1234567' },
          Buffer.from('{}'),
        ),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when timestamp is older than 300 seconds', () => {
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 305; // 305 seconds ago (> 300s)
      const rawBody = JSON.stringify({ id: 1005 });
      const dataToSign = `${expiredTimestamp}.${rawBody}`;
      const hash = crypto.createHmac('sha256', TEST_SECRET).update(dataToSign).digest('hex');

      const headers = {
        'x-sepay-signature': `sha256=${hash}`,
        'x-sepay-timestamp': expiredTimestamp.toString(),
      };

      expect(() =>
        service.verifyWebhookSignature(headers, Buffer.from(rawBody, 'utf8')),
      ).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if SEPAY_WEBHOOK_SECRET is not configured', () => {
      const unconfiguredService = new SepayService(
        { get: vi.fn().mockReturnValue('') } as unknown as ConfigService,
      );

      const currentSeconds = Math.floor(Date.now() / 1000);
      const headers = {
        'x-sepay-signature': 'sha256=test',
        'x-sepay-timestamp': currentSeconds.toString(),
      };

      expect(() =>
        unconfiguredService.verifyWebhookSignature(headers, Buffer.from('{}')),
      ).toThrow(UnauthorizedException);
    });
  });

  describe('generateOrderCode', () => {
    it('generates MD plus exactly ten uppercase alphanumeric characters, containing letters and digits', () => {
      const codes = new Set(Array.from({ length: 1000 }, () => service.generateOrderCode()));
      expect(codes.size).toBe(1000);
      for (const code of codes) {
        expect(code).toMatch(/^MD[A-Z0-9]{10}$/);
        expect(code.slice(2)).toMatch(/[A-Z]/);
        expect(code.slice(2)).toMatch(/\d/);
      }
    });
  });

  describe('generateVietQrUrl', () => {
    it('should format SePay QR URL with compact template and encoded params', () => {
      const url = service.generateVietQrUrl({
        bankCode: 'MB',
        bankAccount: '0333338888',
        amount: 299000,
        orderCode: 'MD7K2P9X4A6B',
      });

      expect(url).toContain('https://qr.sepay.vn/img?');
      expect(url).toContain('acc=0333338888');
      expect(url).toContain('bank=MB');
      expect(url).toContain('amount=299000');
      expect(url).toContain('des=MD7K2P9X4A6B');
      expect(url).toContain('template=compact');
    });
  });

  describe('payment code extraction', () => {
    it('normalizes case and finds codes in a bank memo', () => {
      expect(service.extractOrderCode(null, 'Thanh toan md7k2p9x4a6b hoc phi')).toBe('MD7K2P9X4A6B');
      expect(service.extractOrderCode(' md7k2p9x4a6b ', 'hoc phi')).toBe('MD7K2P9X4A6B');
    });

    it('still reads old five-digit codes but never truncates a longer code', () => {
      expect(service.extractOrderCode(null, 'MD12345 hoc phi')).toBe('MD12345');
      expect(service.extractOrderCode(null, 'MD123456 hoc phi')).toBeNull();
      expect(service.extractOrderCode(null, 'MD7K2P9X4A6BC')).toBeNull();
      expect(service.extractOrderCode(null, 'XMD7K2P9X4A6B')).toBeNull();
    });

    it('rejects ambiguous or conflicting payment codes', () => {
      expect(service.extractOrderCode('MD7K2P9X4A6B', 'MD12345')).toBeNull();
      expect(service.extractOrderCode(null, 'MD7K2P9X4A6B MD12345')).toBeNull();
      expect(service.extractOrderCode('UNKNOWN', 'MD7K2P9X4A6B')).toBe('MD7K2P9X4A6B');
    });
  });

  it('fails closed when bank configuration is incomplete', () => {
    expect(() => service.getPaymentConfiguration()).toThrow(ServiceUnavailableException);
  });

  it('rejects malformed or repeated timestamp headers', () => {
    expect(() => service.verifyWebhookSignature({ 'x-sepay-signature': 'abc', 'x-sepay-timestamp': `${Math.floor(Date.now() / 1000)}garbage` }, '{}')).toThrow(UnauthorizedException);
    expect(() => service.verifyWebhookSignature({ 'x-sepay-signature': ['a', 'b'], 'x-sepay-timestamp': String(Math.floor(Date.now() / 1000)) }, '{}')).toThrow(UnauthorizedException);
  });

  it('parses Vietnam bank timestamps independently of the server timezone', () => {
    expect(parseSepayTransactionDate('2026-11-09 15:30:00')?.toISOString()).toBe('2026-11-09T08:30:00.000Z');
    expect(parseSepayTransactionDate('2026-11-09T15:30:00+07:00')?.toISOString()).toBe('2026-11-09T08:30:00.000Z');
    expect(parseSepayTransactionDate('2026-02-30 15:30:00')).toBeNull();
    expect(parseSepayTransactionDate('2026-11-09T15:30:00')).toBeNull();
    expect(parseSepayTransactionDate(undefined)).toBeNull();
  });
});
