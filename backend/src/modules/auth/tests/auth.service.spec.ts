import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
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
import { MailService } from '../../mail/mail.service.js';
import { LocalAuthService } from '../services/local-auth.service.js';
import { AuthTokenService } from '../services/auth-token.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserService: {
    ensureEmailNotTaken: ReturnType<typeof vi.fn>;
    ensureUsernameNotTaken: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByEmail: ReturnType<typeof vi.fn>;
    findByProvider: ReturnType<typeof vi.fn>;
    findByGoogleSub: ReturnType<typeof vi.fn>;
    findByVerificationToken: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateOrFail: ReturnType<typeof vi.fn>;
  };
  let mockSessionService: {
    createOrUpdateSession: ReturnType<typeof vi.fn>;
    validateAndRotateSession: ReturnType<typeof vi.fn>;
    revokeAllUserSessions: ReturnType<typeof vi.fn>;
  };
  let mockMailService: {
    sendVerificationEmail: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
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
    isEmailVerified: true,
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
      ensureUsernameNotTaken: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue(mockUser),
      findById: vi.fn().mockResolvedValue(mockUser),
      findByEmail: vi.fn().mockResolvedValue(null),
      findByProvider: vi.fn().mockResolvedValue(null),
      findByGoogleSub: vi.fn().mockResolvedValue(null),
      findByVerificationToken: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(mockUser),
      updateOrFail: vi.fn().mockResolvedValue(mockUser),
    };

    mockSessionService = {
      createOrUpdateSession: vi.fn().mockResolvedValue({ id: 'session_1' }),
      validateAndRotateSession: vi.fn().mockResolvedValue({ session: { id: 'session_1' }, isReusedGrace: false }),
      revokeAllUserSessions: vi.fn().mockResolvedValue(true),
    };

    mockMailService = {
      sendVerificationEmail: vi.fn().mockResolvedValue(true),
    };

    mockLocalAuthService = {
      hashPassword: vi.fn().mockResolvedValue('hashed_password'),
      validateUser: vi.fn().mockResolvedValue(mockUser),
    };

    mockAuthTokenService = {
      generateTokens: vi.fn().mockResolvedValue(mockTokens),
      hashToken: vi.fn().mockReturnValue('mock_hash'),
      verifyRefreshToken: vi.fn().mockResolvedValue({ sub: 'user_123', email: 'test@example.com', role: RoleEnum.STUDENT }),
      getRefreshTokenExpiryDate: vi.fn().mockReturnValue(mockExpiry),
    };

    mockConfigService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'GOOGLE_CLIENT_ID') return 'mock_google_client_id';
        return null;
      }),
    };

    service = new AuthService(
      mockUserService as unknown as UserService,
      mockSessionService as unknown as SessionService,
      mockLocalAuthService as unknown as LocalAuthService,
      mockAuthTokenService as unknown as AuthTokenService,
      mockConfigService as unknown as ConfigService,
      mockMailService as unknown as MailService,
    );
  });

  describe('register', () => {
    it('should register a new unverified user and send a verification email', async () => {
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
          role: RoleEnum.STUDENT,
          provider: AuthProviderEnum.LOCAL,
          status: UserStatusEnum.INACTIVE,
          isEmailVerified: false,
          emailVerificationToken: expect.any(String),
          emailVerificationExpires: expect.any(Date),
        }),
      );
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Trinh Cuong',
        expect.any(String),
      );
      expect(result.emailSent).toBe(true);
      expect(result.user.email).toBe('test@example.com');
      expect(result.message).toContain('Vui lòng kiểm tra email');
    });
  });

  describe('verifyEmail', () => {
    it('should activate user, clear tokens, and return auth session when token is valid', async () => {
      const unverifiedUser: IUser = {
        ...mockUser,
        status: UserStatusEnum.INACTIVE,
        isEmailVerified: false,
        emailVerificationToken: 'valid_token_123',
        emailVerificationExpires: new Date(Date.now() + 1000 * 60 * 60),
      };
      mockUserService.findByVerificationToken.mockResolvedValue(unverifiedUser);
      mockUserService.updateOrFail.mockResolvedValue({
        ...unverifiedUser,
        status: UserStatusEnum.ACTIVE,
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      });

      const result = await service.verifyEmail({ token: 'valid_token_123' });

      expect(mockUserService.findByVerificationToken).toHaveBeenCalledWith('valid_token_123');
      expect(mockUserService.updateOrFail).toHaveBeenCalledWith(
        'user_123',
        expect.objectContaining({
          isEmailVerified: true,
          status: UserStatusEnum.ACTIVE,
          emailVerificationToken: null,
          emailVerificationExpires: null,
        }),
      );
      expect(mockAuthTokenService.generateTokens).toHaveBeenCalled();
      expect(mockSessionService.createOrUpdateSession).toHaveBeenCalledWith(
        'user_123',
        'mock_hash',
        mockExpiry,
      );
      expect(result.tokens).toEqual(mockTokens);
      expect(result.user.status).toBe(UserStatusEnum.ACTIVE);
    });

    it('should throw BadRequestException if verification token is invalid or not found', async () => {
      mockUserService.findByVerificationToken.mockResolvedValue(null);

      await expect(service.verifyEmail({ token: 'invalid_token' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if verification token has expired', async () => {
      const expiredUser: IUser = {
        ...mockUser,
        status: UserStatusEnum.INACTIVE,
        isEmailVerified: false,
        emailVerificationToken: 'expired_token',
        emailVerificationExpires: new Date(Date.now() - 1000 * 60), // In the past
      };
      mockUserService.findByVerificationToken.mockResolvedValue(expiredUser);

      await expect(service.verifyEmail({ token: 'expired_token' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('resendVerification', () => {
    it('should generate new token and resend email if user exists and is unverified', async () => {
      const unverifiedUser: IUser = {
        ...mockUser,
        status: UserStatusEnum.INACTIVE,
        isEmailVerified: false,
      };
      mockUserService.findByEmail.mockResolvedValue(unverifiedUser);

      const result = await service.resendVerification({ email: 'test@example.com' });

      expect(mockUserService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserService.updateOrFail).toHaveBeenCalledWith(
        'user_123',
        expect.objectContaining({
          emailVerificationToken: expect.any(String),
          emailVerificationExpires: expect.any(Date),
        }),
      );
      expect(mockMailService.sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Cuong Trinh',
        expect.any(String),
      );
      expect(result.sent).toBe(true);
    });

    it('should return generic success message without sending if user does not exist', async () => {
      mockUserService.findByEmail.mockResolvedValue(null);

      const result = await service.resendVerification({ email: 'unknown@example.com' });

      expect(mockUserService.updateOrFail).not.toHaveBeenCalled();
      expect(mockMailService.sendVerificationEmail).not.toHaveBeenCalled();
      expect(result.sent).toBe(true);
    });

    it('should throw BadRequestException if user is already verified', async () => {
      const verifiedUser: IUser = {
        ...mockUser,
        isEmailVerified: true,
      };
      mockUserService.findByEmail.mockResolvedValue(verifiedUser);

      await expect(
        service.resendVerification({ email: 'test@example.com' }),
      ).rejects.toThrow(BadRequestException);
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

  describe('loginWithGoogle (Server-side Google ID Token Verification)', () => {
    const validGooglePayload = {
      sub: 'google_sub_999',
      email: 'student_google@example.com',
      email_verified: true,
      name: 'Google Student',
      picture: 'https://lh3.googleusercontent.com/avatar.jpg',
    };

    it('should create a new student account when user does not exist yet', async () => {
      vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => validGooglePayload,
      } as never);

      mockUserService.findByGoogleSub.mockResolvedValue(null);
      mockUserService.findByEmail.mockResolvedValue(null);

      const createdUser: IUser = {
        ...mockUser,
        id: 'new_google_user',
        email: 'student_google@example.com',
        fullName: 'Google Student',
        googleSub: 'google_sub_999',
        role: RoleEnum.STUDENT,
        status: UserStatusEnum.ACTIVE,
        avatarUrl: 'https://lh3.googleusercontent.com/avatar.jpg',
      };
      mockUserService.create.mockResolvedValue(createdUser);

      const result = await service.loginWithGoogle({ idToken: 'valid_google_token' });

      expect(mockUserService.findByGoogleSub).toHaveBeenCalledWith('google_sub_999');
      expect(mockUserService.findByEmail).toHaveBeenCalledWith('student_google@example.com');
      expect(mockUserService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'student_google@example.com',
          fullName: 'Google Student',
          googleSub: 'google_sub_999',
          role: RoleEnum.STUDENT,
          status: UserStatusEnum.ACTIVE,
          passwordHash: null,
        }),
      );
      expect(result.user.email).toBe('student_google@example.com');
      expect(result.tokens).toEqual(mockTokens);
      expect(mockSessionService.createOrUpdateSession).toHaveBeenCalledWith(
        'new_google_user',
        'mock_hash',
        mockExpiry,
      );
    });

    it('should log in directly when user with googleSub already exists', async () => {
      vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => validGooglePayload,
      } as never);

      const existingGoogleUser: IUser = {
        ...mockUser,
        id: 'existing_google_user',
        email: 'student_google@example.com',
        googleSub: 'google_sub_999',
      };
      mockUserService.findByGoogleSub.mockResolvedValue(existingGoogleUser);

      const result = await service.loginWithGoogle({ idToken: 'valid_google_token' });

      expect(mockUserService.findByGoogleSub).toHaveBeenCalledWith('google_sub_999');
      expect(mockUserService.findByEmail).not.toHaveBeenCalled();
      expect(mockUserService.create).not.toHaveBeenCalled();
      expect(result.user.id).toBe('existing_google_user');
      expect(result.tokens).toEqual(mockTokens);
    });

    it('should auto-link account when email matches and email_verified is true (Option B)', async () => {
      vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => validGooglePayload,
      } as never);

      mockUserService.findByGoogleSub.mockResolvedValue(null);

      const localPasswordUser: IUser = {
        ...mockUser,
        id: 'local_user_456',
        email: 'student_google@example.com',
        googleSub: null,
        avatarUrl: null,
      };
      mockUserService.findByEmail.mockResolvedValue(localPasswordUser);

      const updatedLinkedUser: IUser = {
        ...localPasswordUser,
        googleSub: 'google_sub_999',
        avatarUrl: 'https://lh3.googleusercontent.com/avatar.jpg',
      };
      mockUserService.updateOrFail.mockResolvedValue(updatedLinkedUser);

      const result = await service.loginWithGoogle({ idToken: 'valid_google_token' });

      expect(mockUserService.updateOrFail).toHaveBeenCalledWith(
        'local_user_456',
        expect.objectContaining({
          googleSub: 'google_sub_999',
          avatarUrl: 'https://lh3.googleusercontent.com/avatar.jpg',
        }),
      );
      expect(result.user.id).toBe('local_user_456');
    });

    it('should preserve ADMIN role when admin logs in via Google OAuth', async () => {
      vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          ...validGooglePayload,
          email: 'admin@mindly.edu.vn',
        }),
      } as never);

      const adminUser: IUser = {
        ...mockUser,
        id: 'admin_user_001',
        email: 'admin@mindly.edu.vn',
        role: RoleEnum.ADMIN,
        googleSub: 'google_sub_999',
      };
      mockUserService.findByGoogleSub.mockResolvedValue(adminUser);

      const result = await service.loginWithGoogle({ idToken: 'valid_admin_token' });

      expect(result.user.role).toBe(RoleEnum.ADMIN);
    });

    it('should reject login if user status is INACTIVE or BANNED', async () => {
      vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => validGooglePayload,
      } as never);

      const bannedUser: IUser = {
        ...mockUser,
        status: UserStatusEnum.BANNED,
        googleSub: 'google_sub_999',
      };
      mockUserService.findByGoogleSub.mockResolvedValue(bannedUser);

      await expect(
        service.loginWithGoogle({ idToken: 'valid_google_token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if Google reports email is not verified', async () => {
      vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          ...validGooglePayload,
          email_verified: false,
        }),
      } as never);

      await expect(
        service.loginWithGoogle({ idToken: 'unverified_email_token' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if verifyIdToken fails', async () => {
      vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockRejectedValue(
        new Error('Token signature invalid'),
      );

      await expect(
        service.loginWithGoogle({ idToken: 'corrupted_token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

