import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import {
  AuthProviderEnum,
  IAuthTokens,
  IUser,
  RoleEnum,
  UserStatusEnum,
} from 'share-lib';
import { AuthService } from '../services/auth.service.js';
import { UserService } from '../../user/services/user.service.js';
import { SessionService } from '../../session/services/session.service.js';
import { LocalAuthService } from '../services/local-auth.service.js';
import { AuthTokenService } from '../services/auth-token.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserService: {
    ensureEmailNotTaken: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByEmail: ReturnType<typeof vi.fn>;
    findByProvider: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockSessionService: {
    createOrUpdateSession: ReturnType<typeof vi.fn>;
    validateAndRotateSession: ReturnType<typeof vi.fn>;
    revokeAllUserSessions: ReturnType<typeof vi.fn>;
  };
  let mockLocalAuthService: {
    hashPassword: ReturnType<typeof vi.fn>;
    validateUser: ReturnType<typeof vi.fn>;
  };
  let mockAuthTokenService: {
    generateTokens: ReturnType<typeof vi.fn>;
    hashToken: ReturnType<typeof vi.fn>;
    verifyRefreshToken: ReturnType<typeof vi.fn>;
    getRefreshTokenExpiryDate: ReturnType<typeof vi.fn>;
  };

  const mockUser: IUser = {
    id: 'user_123',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    password: 'hashed_password',
    fullName: 'Cuong Trinh',
    firstName: 'Cuong',
    lastName: 'Trinh',
    role: RoleEnum.STUDENT,
    status: UserStatusEnum.ACTIVE,
    provider: AuthProviderEnum.LOCAL,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTokens: IAuthTokens = {
    accessToken: 'mock_access_token',
    refreshToken: 'mock_refresh_token',
    expiresIn: '15m',
  };

  const mockExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  beforeEach(() => {
    mockUserService = {
      ensureEmailNotTaken: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue(mockUser),
      findById: vi.fn().mockResolvedValue(mockUser),
      findByEmail: vi.fn().mockResolvedValue(null),
      findByProvider: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(mockUser),
    };

    mockSessionService = {
      createOrUpdateSession: vi.fn().mockResolvedValue({ id: 'session_1' }),
      validateAndRotateSession: vi.fn().mockResolvedValue({ session: { id: 'session_1' }, isReusedGrace: false }),
      revokeAllUserSessions: vi.fn().mockResolvedValue(true),
    };

    mockLocalAuthService = {
      hashPassword: vi.fn().mockResolvedValue('hashed_password'),
      validateUser: vi.fn().mockResolvedValue(mockUser),
    };

    mockAuthTokenService = {
      generateTokens: vi.fn().mockResolvedValue(mockTokens),
      hashToken: vi.fn().mockReturnValue('mock_hash'),
      verifyRefreshToken: vi.fn().mockResolvedValue({ sub: 'user_123', email: 'test@example.com', role: RoleEnum.USER }),
      getRefreshTokenExpiryDate: vi.fn().mockReturnValue(mockExpiry),
    };

    service = new AuthService(
      mockUserService as unknown as UserService,
      mockSessionService as unknown as SessionService,
      mockLocalAuthService as unknown as LocalAuthService,
      mockAuthTokenService as unknown as AuthTokenService,
    );
  });

  describe('register', () => {
    it('should register a new user, create session, and return tokens', async () => {
      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Cuong',
        lastName: 'Trinh',
      });

      expect(mockUserService.ensureEmailNotTaken).toHaveBeenCalledWith('test@example.com');
      expect(mockLocalAuthService.hashPassword).toHaveBeenCalledWith('password123');
      expect(mockUserService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          role: RoleEnum.USER,
          provider: AuthProviderEnum.LOCAL,
        }),
      );
      expect(mockSessionService.createOrUpdateSession).toHaveBeenCalledWith(
        'user_123',
        'mock_hash',
        mockExpiry,
      );
      expect(result.tokens).toEqual(mockTokens);
      expect(result.user.email).toBe('test@example.com');
    });
  });

  describe('login', () => {
    it('should validate credentials and return tokens with active session', async () => {
      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockLocalAuthService.validateUser).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockAuthTokenService.generateTokens).toHaveBeenCalled();
      expect(mockSessionService.createOrUpdateSession).toHaveBeenCalledWith(
        'user_123',
        'mock_hash',
        mockExpiry,
      );
      expect(result.tokens).toEqual(mockTokens);
    });
  });

  describe('refreshToken', () => {
    it('should rotate tokens and session', async () => {
      const newTokens: IAuthTokens = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        expiresIn: '15m',
      };
      mockAuthTokenService.generateTokens.mockResolvedValue(newTokens);

      const result = await service.refreshToken({ refreshToken: 'mock_refresh_token' });

      expect(mockAuthTokenService.verifyRefreshToken).toHaveBeenCalledWith('mock_refresh_token');
      expect(mockSessionService.validateAndRotateSession).toHaveBeenCalled();
      expect(result).toEqual(newTokens);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      mockUserService.findById.mockResolvedValue({ ...mockUser, status: UserStatusEnum.SUSPENDED });

      await expect(service.refreshToken({ refreshToken: 'some_token' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should revoke all user sessions', async () => {
      const result = await service.logout('user_123');

      expect(mockSessionService.revokeAllUserSessions).toHaveBeenCalledWith('user_123');
      expect(result).toBe(true);
    });
  });

  describe('getMe', () => {
    it('should return user profile if user is active', async () => {
      const result = await service.getMe('user_123');

      expect(result.id).toBe('user_123');
      expect(result.email).toBe('test@example.com');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUserService.findById.mockResolvedValue(null);

      await expect(service.getMe('nonexistent')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateOAuthLogin (OAuth Expansion Hook)', () => {
    it('should create new user and return tokens when logging in with new OAuth account', async () => {
      mockUserService.findByProvider.mockResolvedValue(null);
      mockUserService.findByEmail.mockResolvedValue(null);

      const oauthUser: IUser = {
        id: 'oauth_user_1',
        email: 'oauth@gmail.com',
        passwordHash: 'dummy_hash',
        fullName: 'Google User',
        role: RoleEnum.STUDENT,
        status: UserStatusEnum.ACTIVE,
        provider: AuthProviderEnum.GOOGLE,
        providerId: 'google_sub_123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockUserService.create.mockResolvedValue(oauthUser);

      const result = await service.validateOAuthLogin({
        provider: AuthProviderEnum.GOOGLE,
        providerId: 'google_sub_123',
        email: 'oauth@gmail.com',
        firstName: 'Google',
        lastName: 'User',
      });

      expect(mockUserService.findByProvider).toHaveBeenCalledWith(
        AuthProviderEnum.GOOGLE,
        'google_sub_123',
      );
      expect(mockUserService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: AuthProviderEnum.GOOGLE,
          providerId: 'google_sub_123',
          email: 'oauth@gmail.com',
        }),
      );
      expect(result.user.provider).toBe(AuthProviderEnum.GOOGLE);
    });
  });
});
