import { describe, expect, it } from 'vitest';
import { envValidationSchema } from './env.validation.js';

describe('transcription worker configuration', () => {
  const requiredEnv = {
    MONGODB_URI: 'mongodb://localhost:27017',
    JWT_SECRET: 'test-jwt-secret-1234',
    JWT_REFRESH_SECRET: 'test-refresh-secret-1234',
  };

  it('converts .env prefetch to a number for RabbitMQ', () => {
    const { error, value } = envValidationSchema.validate({
      ...requiredEnv,
      TRANSCRIPTION_PREFETCH: '2',
    });

    expect(error).toBeUndefined();
    expect(value.TRANSCRIPTION_PREFETCH).toBe(2);
  });

  it('defaults to one unacknowledged message per consumer', () => {
    const { error, value } = envValidationSchema.validate(requiredEnv);

    expect(error).toBeUndefined();
    expect(value.TRANSCRIPTION_PREFETCH).toBe(1);
    expect(value.AI_PREFETCH).toBe(3);
  });

  it.each(['bad', '-1', '1.5', '65536'])('rejects invalid prefetch %s', (prefetch) => {
    const { error } = envValidationSchema.validate({
      ...requiredEnv,
      TRANSCRIPTION_PREFETCH: prefetch,
    });

    expect(error?.details[0]?.path).toEqual(['TRANSCRIPTION_PREFETCH']);
  });
});
