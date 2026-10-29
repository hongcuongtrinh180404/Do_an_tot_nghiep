import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RoleEnum, type IUserProfile } from 'share-lib';
import { AuthTokenService } from '../services/auth-token.service.js';

describe('AuthTokenService', () => {
  const config = {
    get: vi.fn((key: string) => {
      const values: Record<string, string> = {
        JWT_SECRET: 'test_access_secret_at_least_32_characters_long',
        JWT_REFRESH_SECRET: 'test_refresh_secret_at_least_32_characters_long',
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return values[key];
    }),
  } as unknown as ConfigService;

  const service = new AuthTokenService(new JwtService(), config);
  const user = {
    id: '6abe8e01561339f306e8a092',
    email: 'test@example.com',
    role: RoleEnum.STUDENT,
  } as unknown as IUserProfile;

  it('issues a unique refresh token on every call, even within the same second', async () => {
    const first = await service.generateTokens(user);
    const second = await service.generateTokens(user);

    expect(first.refreshToken).not.toBe(second.refreshToken);

    const payload = await service.verifyRefreshToken(first.refreshToken);
    expect(payload.sub).toBe(user.id);
    expect(payload.jti).toBeTruthy();
  });

  it('hashes tokens deterministically', () => {
    expect(service.hashToken('abc')).toBe(service.hashToken('abc'));
    expect(service.hashToken('abc')).not.toBe(service.hashToken('abcd'));
  });
});
