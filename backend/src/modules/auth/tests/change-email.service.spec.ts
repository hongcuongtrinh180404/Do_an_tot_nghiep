import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  AUTH_CONSTANTS,
  IUser,
  RoleEnum,
  UserStatusEnum,
} from 'share-lib';
import { ChangeEmailService } from '../services/change-email.service.js';
import { UserService } from '../../user/services/user.service.js';
import { SessionService } from '../../session/services/session.service.js';
import { MailService } from '../../mail/mail.service.js';
import { LocalAuthService } from '../services/local-auth.service.js';
import { AuthTokenService } from '../services/auth-token.service.js';

describe('ChangeEmailService', () => {
  let service: ChangeEmailService;
  let mockUserService: {
    findById: ReturnType<typeof vi.fn>;
    findByEmail: ReturnType<typeof vi.fn>;
    claimEmailChangeRequest: ReturnType<typeof vi.fn>;
    clearEmailChangeRequest: ReturnType<typeof vi.fn>;
    findByEmailChangeTokenHash: ReturnType<typeof vi.fn>;
    applyEmailChange: ReturnType<typeof vi.fn>;
  };
  let mockSessionService: {
    revokeAllUserSessions: ReturnType<typeof vi.fn>;
  };
  let mockMailService: {
    sendChangeEmailVerification: ReturnType<typeof vi.fn>;
    sendEmailChangeSecurityAlert: ReturnType<typeof vi.fn>;
  };
  let mockLocalAuthService: {
    comparePassword: ReturnType<typeof vi.fn>;
  };
  let mockAuthTokenService: {
    hashToken: ReturnType<typeof vi.fn>;
  };

  const mockUser: IUser = {
    id: '507f1f77bcf86cd799439011',
    email: 'old@example.com',
    passwordHash: 'hashed_password',
    fullName: 'Cuong Trinh',
    role: RoleEnum.STUDENT,
    status: UserStatusEnum.ACTIVE,
    isEmailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockUserService = {
      findById: vi.fn().mockResolvedValue(mockUser),
      findByEmail: vi.fn().mockImplementation((email: string, includePassword = false) => {
        if (email === mockUser.email) {
          return Promise.resolve(includePassword ? mockUser : { ...mockUser, passwordHash: undefined });
        }
        return Promise.resolve(null);
      }),
      claimEmailChangeRequest: vi.fn().mockResolvedValue(mockUser),
      clearEmailChangeRequest: vi.fn().mockResolvedValue(undefined),
      findByEmailChangeTokenHash: vi.fn().mockResolvedValue({
        ...mockUser,
        pendingNewEmail: 'new@example.com',
        emailChangeExpires: new Date(Date.now() + 15 * 60 * 1000),
      }),
      applyEmailChange: vi.fn().mockResolvedValue({
        ...mockUser,
        email: 'new@example.com',
      }),
    };

    mockSessionService = {
      revokeAllUserSessions: vi.fn().mockResolvedValue(true),
    };

    mockMailService = {
      sendChangeEmailVerification: vi.fn().mockResolvedValue(true),
      sendEmailChangeSecurityAlert: vi.fn().mockResolvedValue(true),
    };

    mockLocalAuthService = {
      comparePassword: vi.fn().mockResolvedValue(true),
    };

    mockAuthTokenService = {
      hashToken: vi.fn((token: string) =>
        createHash('sha256').update(token).digest('hex'),
      ),
    };

    service = new ChangeEmailService(
      mockUserService as unknown as UserService,
      mockSessionService as unknown as SessionService,
      mockMailService as unknown as MailService,
      mockLocalAuthService as unknown as LocalAuthService,
      mockAuthTokenService as unknown as AuthTokenService,
    );
  });

  describe('requestChangeEmail', () => {
    it('thành công tạo token và gửi email xác nhận khi dữ liệu hợp lệ', async () => {
      const result = await service.requestChangeEmail(mockUser.id, {
        newEmail: 'new@example.com',
        currentPassword: 'correctPassword',
      });

      expect(result.message).toBe(AUTH_CONSTANTS.EMAIL_CHANGE_REQUEST_SUCCESS_MESSAGE);
      expect(mockLocalAuthService.comparePassword).toHaveBeenCalledWith(
        'correctPassword',
        mockUser.passwordHash,
      );
      expect(mockUserService.claimEmailChangeRequest).toHaveBeenCalled();
      expect(mockMailService.sendChangeEmailVerification).toHaveBeenCalledWith(
        'new@example.com',
        mockUser.fullName,
        expect.any(String),
      );
    });

    it('từ chối khi tài khoản không tồn tại hoặc bị khóa', async () => {
      mockUserService.findById.mockResolvedValueOnce(null);

      await expect(
        service.requestChangeEmail(mockUser.id, {
          newEmail: 'new@example.com',
          currentPassword: 'secretPassword',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('từ chối khi tài khoản chưa thiết lập mật khẩu (Google-only)', async () => {
      mockUserService.findByEmail.mockResolvedValueOnce({
        ...mockUser,
        passwordHash: null,
      });

      await expect(
        service.requestChangeEmail(mockUser.id, {
          newEmail: 'new@example.com',
          currentPassword: 'secretPassword',
        }),
      ).rejects.toThrow(AUTH_CONSTANTS.EMAIL_CHANGE_PASSWORD_NOT_SET_MESSAGE);
    });

    it('từ chối khi mật khẩu hiện tại không chính xác', async () => {
      mockLocalAuthService.comparePassword.mockResolvedValueOnce(false);

      await expect(
        service.requestChangeEmail(mockUser.id, {
          newEmail: 'new@example.com',
          currentPassword: 'wrongPassword',
        }),
      ).rejects.toThrow(AUTH_CONSTANTS.EMAIL_CHANGE_INVALID_PASSWORD_MESSAGE);
    });

    it('từ chối khi email mới trùng email hiện tại', async () => {
      await expect(
        service.requestChangeEmail(mockUser.id, {
          newEmail: mockUser.email,
          currentPassword: 'correctPassword',
        }),
      ).rejects.toThrow(AUTH_CONSTANTS.EMAIL_CHANGE_SAME_EMAIL_MESSAGE);
    });

    it('từ chối khi email mới đã được tài khoản khác đăng ký trên Mindly', async () => {
      mockUserService.findByEmail.mockImplementation((email: string, includePassword = false) => {
        if (email === mockUser.email) {
          return Promise.resolve(includePassword ? mockUser : { ...mockUser, passwordHash: undefined });
        }
        if (email === 'taken@example.com') {
          return Promise.resolve({ id: 'other_user_id', email });
        }
        return Promise.resolve(null);
      });

      await expect(
        service.requestChangeEmail(mockUser.id, {
          newEmail: 'taken@example.com',
          currentPassword: 'correctPassword',
        }),
      ).rejects.toThrow(AUTH_CONSTANTS.EMAIL_CHANGE_ALREADY_EXISTS_MESSAGE);
    });

    it('rollback token khi gửi email thất bại', async () => {
      mockMailService.sendChangeEmailVerification.mockResolvedValueOnce(false);

      await service.requestChangeEmail(mockUser.id, {
        newEmail: 'new@example.com',
        currentPassword: 'correctPassword',
      });

      expect(mockUserService.clearEmailChangeRequest).toHaveBeenCalled();
    });
  });

  describe('verifyEmailChange', () => {
    it('thành công cập nhật email mới, xóa session cũ và gửi thông báo bảo mật đến email cũ', async () => {
      const result = await service.verifyEmailChange({ token: 'valid_token' });

      expect(result.message).toBe(AUTH_CONSTANTS.EMAIL_CHANGE_SUCCESS_MESSAGE);
      expect(result.email).toBe('new@example.com');
      expect(mockUserService.applyEmailChange).toHaveBeenCalledWith(
        mockUser.id,
        expect.any(String),
        'new@example.com',
        expect.any(Date),
      );
      expect(mockSessionService.revokeAllUserSessions).toHaveBeenCalledWith(mockUser.id);
      expect(mockMailService.sendEmailChangeSecurityAlert).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.fullName,
        'new@example.com',
      );
    });

    it('từ chối khi token không hợp lệ hoặc đã hết hạn', async () => {
      mockUserService.findByEmailChangeTokenHash.mockResolvedValueOnce(null);

      await expect(
        service.verifyEmailChange({ token: 'invalid_token' }),
      ).rejects.toThrow(AUTH_CONSTANTS.EMAIL_CHANGE_INVALID_TOKEN_MESSAGE);
    });

    it('từ chối khi token đã hết hạn theo thời gian', async () => {
      mockUserService.findByEmailChangeTokenHash.mockResolvedValueOnce({
        ...mockUser,
        pendingNewEmail: 'new@example.com',
        emailChangeExpires: new Date(Date.now() - 1000), // đã hết hạn
      });

      await expect(
        service.verifyEmailChange({ token: 'expired_token' }),
      ).rejects.toThrow(AUTH_CONSTANTS.EMAIL_CHANGE_INVALID_TOKEN_MESSAGE);
    });

    it('từ chối khi email mới đã bị người khác đăng ký trong thời gian chờ kích hoạt', async () => {
      mockUserService.findByEmail.mockImplementation((email: string) => {
        if (email === 'new@example.com') {
          return Promise.resolve({ id: 'someone_else_id', email });
        }
        return Promise.resolve(null);
      });

      await expect(
        service.verifyEmailChange({ token: 'valid_token' }),
      ).rejects.toThrow(AUTH_CONSTANTS.EMAIL_CHANGE_ALREADY_EXISTS_MESSAGE);
      expect(mockUserService.clearEmailChangeRequest).toHaveBeenCalled();
    });
  });
});
