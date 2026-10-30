import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ClientSession } from 'mongoose';
import { createHash } from 'node:crypto';
import {
  AUTH_CONSTANTS,
  IUser,
  RoleEnum,
  UserStatusEnum,
} from 'share-lib';
import { PasswordResetService } from '../services/password-reset.service.js';
import { UserService } from '../../user/services/user.service.js';
import { SessionService } from '../../session/services/session.service.js';
import { MailService } from '../../mail/mail.service.js';
import { LocalAuthService } from '../services/local-auth.service.js';
import { AuthTokenService } from '../services/auth-token.service.js';

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let mockUserService: {
    findByEmailForPasswordReset: ReturnType<typeof vi.fn>;
    findByPasswordResetTokenHash: ReturnType<typeof vi.fn>;
    claimPasswordResetRequest: ReturnType<typeof vi.fn>;
    clearPasswordResetRequest: ReturnType<typeof vi.fn>;
    consumePasswordResetToken: ReturnType<typeof vi.fn>;
    runInTransaction: ReturnType<typeof vi.fn>;
  };
  let mockSessionService: {
    revokeAllUserSessions: ReturnType<typeof vi.fn>;
  };
  let mockMailService: {
    sendPasswordResetEmail: ReturnType<typeof vi.fn>;
  };
  let mockLocalAuthService: {
    hashPassword: ReturnType<typeof vi.fn>;
  };
  let mockAuthTokenService: {
    hashToken: ReturnType<typeof vi.fn>;
  };

  const mockUser: IUser = {
    id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    passwordHash: 'hashed_password',
    fullName: 'Cuong Trinh',
    role: RoleEnum.STUDENT,
    status: UserStatusEnum.ACTIVE,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const validToken = 'a'.repeat(64);

  beforeEach(() => {
    mockUserService = {
      findByEmailForPasswordReset: vi.fn().mockResolvedValue(mockUser),
      findByPasswordResetTokenHash: vi.fn().mockResolvedValue({
        ...mockUser,
        passwordResetExpires: new Date(Date.now() + 60 * 1000),
      }),
      claimPasswordResetRequest: vi.fn().mockResolvedValue(mockUser),
      clearPasswordResetRequest: vi.fn().mockResolvedValue(undefined),
      consumePasswordResetToken: vi.fn().mockResolvedValue(mockUser),
      runInTransaction: vi
        .fn()
        .mockImplementation(
          async (operation: (session: ClientSession) => Promise<unknown>) =>
            operation({} as ClientSession),
        ),
    };

    mockSessionService = {
      revokeAllUserSessions: vi.fn().mockResolvedValue(true),
    };

    mockMailService = {
      sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
    };

    mockLocalAuthService = {
      hashPassword: vi.fn().mockResolvedValue('new_hashed_password'),
    };

    mockAuthTokenService = {
      hashToken: vi.fn((token: string) =>
        createHash('sha256').update(token).digest('hex'),
      ),
    };

    service = new PasswordResetService(
      mockUserService as unknown as UserService,
      mockSessionService as unknown as SessionService,
      mockMailService as unknown as MailService,
      mockLocalAuthService as unknown as LocalAuthService,
      mockAuthTokenService as unknown as AuthTokenService,
    );
  });

  describe('requestReset', () => {
    it('should return the generic message and send nothing when email does not exist', async () => {
      mockUserService.findByEmailForPasswordReset.mockResolvedValue(null);

      const result = await service.requestReset({ email: 'missing@example.com' });

      expect(result.message).toBe(AUTH_CONSTANTS.PASSWORD_RESET_GENERIC_MESSAGE);
      expect(mockUserService.claimPasswordResetRequest).not.toHaveBeenCalled();
      expect(mockMailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should return the generic message when the account is not email-verified', async () => {
      mockUserService.findByEmailForPasswordReset.mockResolvedValue({
        ...mockUser,
        isEmailVerified: false,
      });

      const result = await service.requestReset({ email: mockUser.email });

      expect(result.message).toBe(AUTH_CONSTANTS.PASSWORD_RESET_GENERIC_MESSAGE);
      expect(mockMailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should return the generic message when the account is banned', async () => {
      mockUserService.findByEmailForPasswordReset.mockResolvedValue({
        ...mockUser,
        status: UserStatusEnum.BANNED,
      });

      const result = await service.requestReset({ email: mockUser.email });

      expect(result.message).toBe(AUTH_CONSTANTS.PASSWORD_RESET_GENERIC_MESSAGE);
      expect(mockMailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should send a setup link to a verified Google-only account without creating a password yet', async () => {
      const googleUser: IUser = {
        ...mockUser,
        passwordHash: null,
        googleSub: 'verified-google-sub',
      };
      mockUserService.findByEmailForPasswordReset.mockResolvedValue(googleUser);
      mockUserService.claimPasswordResetRequest.mockResolvedValue(googleUser);

      const result = await service.requestReset({ email: mockUser.email });

      expect(result.message).toBe(AUTH_CONSTANTS.PASSWORD_RESET_GENERIC_MESSAGE);
      expect(mockUserService.claimPasswordResetRequest).toHaveBeenCalledTimes(1);
      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.fullName,
        expect.stringMatching(/^[a-f0-9]{64}$/),
      );
      expect(mockLocalAuthService.hashPassword).not.toHaveBeenCalled();
      expect(mockUserService.consumePasswordResetToken).not.toHaveBeenCalled();
    });

    it.each([
      { status: UserStatusEnum.ACTIVE, isEmailVerified: false },
      { status: UserStatusEnum.INACTIVE, isEmailVerified: true },
      { status: UserStatusEnum.BANNED, isEmailVerified: true },
    ])('should not send a setup link to an ineligible Google account (%j)', async (state) => {
      mockUserService.findByEmailForPasswordReset.mockResolvedValue({
        ...mockUser,
        ...state,
        passwordHash: null,
        googleSub: 'verified-google-sub',
      });

      const result = await service.requestReset({ email: mockUser.email });

      expect(result.message).toBe(AUTH_CONSTANTS.PASSWORD_RESET_GENERIC_MESSAGE);
      expect(mockUserService.claimPasswordResetRequest).not.toHaveBeenCalled();
      expect(mockMailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it.each([null, '', '   '])('should not send mail without a local password or Google identity (%j)', async (googleSub) => {
      mockUserService.findByEmailForPasswordReset.mockResolvedValue({
        ...mockUser,
        passwordHash: null,
        googleSub,
      });

      const result = await service.requestReset({ email: mockUser.email });

      expect(result.message).toBe(AUTH_CONSTANTS.PASSWORD_RESET_GENERIC_MESSAGE);
      expect(mockMailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should store only the SHA-256 hash, set a 15-minute expiry and send the raw token', async () => {
      const result = await service.requestReset({ email: mockUser.email });

      expect(mockUserService.claimPasswordResetRequest).toHaveBeenCalledTimes(1);
      const claimCall = mockUserService.claimPasswordResetRequest.mock
        .calls[0] as [string, string, Date, Date, Date];

      const [userId, tokenHash, expiresAt, requestedAt, cooldownCutoff] = claimCall;
      expect(userId).toBe(mockUser.id);
      expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
      expect(expiresAt.getTime() - requestedAt.getTime()).toBe(
        AUTH_CONSTANTS.PASSWORD_RESET_TOKEN_TTL_MS,
      );
      expect(requestedAt.getTime() - cooldownCutoff.getTime()).toBe(
        AUTH_CONSTANTS.PASSWORD_RESET_COOLDOWN_MS,
      );

      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      const mailCall = mockMailService.sendPasswordResetEmail.mock
        .calls[0] as [string, string, string];
      const rawToken = mailCall[2];

      expect(rawToken).toMatch(/^[a-f0-9]{64}$/);
      expect(rawToken).not.toBe(tokenHash);
      expect(createHash('sha256').update(rawToken).digest('hex')).toBe(tokenHash);
      expect(result.message).toBe(AUTH_CONSTANTS.PASSWORD_RESET_GENERIC_MESSAGE);
    });

    it('should not send a new email while the account is inside the cooldown window', async () => {
      mockUserService.claimPasswordResetRequest.mockResolvedValue(null);

      const result = await service.requestReset({ email: mockUser.email });

      expect(result.message).toBe(AUTH_CONSTANTS.PASSWORD_RESET_GENERIC_MESSAGE);
      expect(mockMailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should roll back the token and still return the generic message when SMTP fails', async () => {
      mockMailService.sendPasswordResetEmail.mockResolvedValue(false);

      const result = await service.requestReset({ email: mockUser.email });

      expect(mockUserService.clearPasswordResetRequest).toHaveBeenCalledTimes(1);
      const clearCall = mockUserService.clearPasswordResetRequest.mock
        .calls[0] as [string, string];
      expect(clearCall[0]).toBe(mockUser.id);
      expect(clearCall[1]).toMatch(/^[a-f0-9]{64}$/);
      expect(result.message).toBe(AUTH_CONSTANTS.PASSWORD_RESET_GENERIC_MESSAGE);
    });
  });

  describe('resetPassword', () => {
    it('should hash the new password, atomically consume the token and revoke all sessions', async () => {
      const result = await service.resetPassword({
        token: validToken,
        password: 'newPassword123',
      });

      expect(mockLocalAuthService.hashPassword).toHaveBeenCalledWith(
        'newPassword123',
      );
      expect(mockUserService.consumePasswordResetToken).toHaveBeenCalledTimes(1);
      const consumeCall = mockUserService.consumePasswordResetToken.mock
        .calls[0] as [string, string, string, Date, ClientSession];
      expect(consumeCall[0]).toBe(mockUser.id);
      expect(consumeCall[1]).toBe(
        createHash('sha256').update(validToken).digest('hex'),
      );
      expect(consumeCall[2]).toBe('new_hashed_password');
      expect(mockSessionService.revokeAllUserSessions).toHaveBeenCalledWith(
        mockUser.id,
        expect.anything(),
      );
      expect(result.message).toBe(AUTH_CONSTANTS.PASSWORD_RESET_SUCCESS_MESSAGE);
    });

    it('should reject an unknown token', async () => {
      mockUserService.findByPasswordResetTokenHash.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: validToken, password: 'newPassword123' }),
      ).rejects.toThrow(AUTH_CONSTANTS.PASSWORD_RESET_INVALID_TOKEN_MESSAGE);

      expect(mockUserService.consumePasswordResetToken).not.toHaveBeenCalled();
    });

    it('should reject an expired token', async () => {
      mockUserService.findByPasswordResetTokenHash.mockResolvedValue({
        ...mockUser,
        passwordResetExpires: new Date(Date.now() - 1000),
      });

      await expect(
        service.resetPassword({ token: validToken, password: 'newPassword123' }),
      ).rejects.toThrow(AUTH_CONSTANTS.PASSWORD_RESET_INVALID_TOKEN_MESSAGE);

      expect(mockUserService.consumePasswordResetToken).not.toHaveBeenCalled();
    });

    it('should reject a token that was already consumed by a concurrent request', async () => {
      mockUserService.consumePasswordResetToken.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: validToken, password: 'newPassword123' }),
      ).rejects.toThrow(BadRequestException);

      expect(mockSessionService.revokeAllUserSessions).not.toHaveBeenCalled();
    });
  });
});
