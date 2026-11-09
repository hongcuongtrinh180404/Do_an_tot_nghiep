import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { Connection } from 'mongoose';
import { envValidationSchema } from '../../../config/env.validation.js';
import { SepayService } from '../services/sepay.service.js';
import { PaymentReadinessService } from '../services/payment-readiness.service.js';
import { PaymentRepository } from '../repositories/payment.repository.js';
import { OrderRepository } from '../../enrollment/repositories/order.repository.js';
import { EnrollmentRepository } from '../../enrollment/repositories/enrollment.repository.js';

const environment = {
  MONGODB_URI: 'mongodb://localhost:27017', JWT_SECRET: 'valid-access-secret-at-least-16',
  JWT_REFRESH_SECRET: 'valid-refresh-secret-at-least-16',
};
const paymentConfig = {
  NODE_ENV: 'production', SEPAY_BANK_ACCOUNT: '123456789', SEPAY_BANK_CODE: 'MB',
  SEPAY_ACCOUNT_NAME: 'TEST ACCOUNT', SEPAY_WEBHOOK_SECRET: 'a-valid-webhook-secret-at-least-32-characters',
};

describe('Payment configuration and startup safety', () => {
  it('does not allow missing financial settings in production', () => {
    expect(envValidationSchema.validate({ ...environment, NODE_ENV: 'production' }).error).toBeDefined();
    expect(envValidationSchema.validate({ ...environment, ...paymentConfig }).error).toBeUndefined();
  });

  it.each([0, -1, 1.5, 1441])('rejects invalid checkout expiration (%s)', (minutes) => {
    expect(envValidationSchema.validate({ ...environment, SEPAY_PAYMENT_EXPIRE_MINUTES: minutes }).error).toBeDefined();
  });

  it('normalizes MD and rejects another prefix or weak secrets', () => {
    const normalized = envValidationSchema.validate({ ...environment, ...paymentConfig, SEPAY_PAYMENT_PREFIX: ' md ' });
    expect(normalized.error).toBeUndefined();
    expect(normalized.value.SEPAY_PAYMENT_PREFIX).toBe('MD');
    expect(envValidationSchema.validate({ ...environment, ...paymentConfig, SEPAY_PAYMENT_PREFIX: 'DH' }).error).toBeDefined();
    expect(envValidationSchema.validate({ ...environment, ...paymentConfig, SEPAY_WEBHOOK_SECRET: 'weak' }).error).toBeDefined();
  });

  function readiness(hello: Record<string, unknown>, settings: Record<string, unknown> = paymentConfig) {
    const command = vi.fn().mockResolvedValue(hello);
    const connection = { db: { admin: () => ({ command }) } } as unknown as Connection;
    const config = new ConfigService(settings);
    const indexes = { ensureIndexes: vi.fn().mockResolvedValue(undefined) };
    const service = new PaymentReadinessService(connection, config, new SepayService(config),
      indexes as unknown as PaymentRepository, indexes as unknown as OrderRepository, indexes as unknown as EnrollmentRepository);
    return { service, indexes, command };
  }

  it('fails startup on standalone MongoDB instead of enabling a sequential fallback', async () => {
    const { service, indexes } = readiness({ isWritablePrimary: true });
    await expect(service.onModuleInit()).rejects.toThrow('replica set');
    expect(indexes.ensureIndexes).not.toHaveBeenCalled();
  });

  it.each([{ setName: 'rs0' }, { msg: 'isdbgrid' }])('creates required indexes on transaction-capable MongoDB (%s)', async (hello) => {
    const { service, indexes } = readiness(hello);
    await service.onModuleInit();
    expect(indexes.ensureIndexes).toHaveBeenCalledTimes(3);
  });

  it('permits non-payment development but does not silently accept incomplete payment settings', async () => {
    const disabled = readiness({}, { NODE_ENV: 'development' });
    await disabled.service.onModuleInit();
    expect(disabled.command).not.toHaveBeenCalled();
    await expect(readiness({}, { NODE_ENV: 'development', SEPAY_BANK_ACCOUNT: '123456' }).service.onModuleInit()).rejects.toThrow();
  });
});
