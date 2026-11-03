import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AUTH_CONSTANTS,
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

describe('AuthService - changePassword', () => {
  let service: AuthService;
  let mockUserService: {
    findById: ReturnType<typeof vi.fn>;
    findByEmail: ReturnType<typeof vi.fn>;
    updateOrFail: ReturnType<typeof vi.fn>;
  };
  let mockLocalAuthService: {
    comparePassword: ReturnType<typeof vi.fn>;
    hashPassword: ReturnType<typeof vi.fn>;
  };
  let mockSessionService: {
    revokeAllUserSessions: ReturnType<typeof vi.fn>;
  };
  let mockMailService: {
    sendVerificationEmail: ReturnType<typeof vi.fn>;
  };
  let mockAuthTokenService: {
    generateTokens: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: {
    get: ReturnType<typeof vi.fn>;
  };

  const mockUser: IUser = {
    id: '507f1f77bcf86cd799439011',
    email: 'user@example.com',
    passwordHash: '$2b$10$oldHashedPassword',
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
      findByEmail: vi.fn().mockResolvedValue(mockUser),
      updateOrFail: vi.fn().mockResolvedValue({
        ...mockUser,
        passwordHash: '$2b$10$newHashedPassword',
      }),
    };

    mockLocalAuthService = {
      comparePassword: vi.fn().mockResolvedValue(true),
      hashPassword: vi.fn().mockResolvedValue('$2b$10$newHashedPassword'),
    };

    mockSessionService = {
      revokeAllUserSessions: vi.fn().mockResolvedValue(true),
    };

    mockMailService = {
      sendVerificationEmail: vi.fn().mockResolvedValue(true),
    };

    mockAuthTokenService = {
      generateTokens: vi.fn(),
    };

    mockConfigService = {
      get: vi.fn().mockReturnValue(undefined),
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

  it('đổi mật khẩu thành công khi nhập đúng mật khẩu hiện tại và mật khẩu mới hợp lệ', async () => {
    const result = await service.changePassword(mockUser.id, {
      currentPassword: 'oldPassword123',
      newPassword: 'newPassword123',
      confirmPassword: 'newPassword123',
    });

    expect(result.message).toBe(AUTH_CONSTANTS.CHANGE_PASSWORD_SUCCESS_MESSAGE);
    expect(mockLocalAuthService.comparePassword).toHaveBeenCalledWith(
      'oldPassword123',
      mockUser.passwordHash,
    );
    expect(mockLocalAuthService.hashPassword).toHaveBeenCalledWith('newPassword123');
    expect(mockUserService.updateOrFail).toHaveBeenCalledWith(mockUser.id, {
      passwordHash: '$2b$10$newHashedPassword',
      password: '$2b$10$newHashedPassword',
    });
  });

  it('từ chối khi mật khẩu hiện tại không chính xác', async () => {
    mockLocalAuthService.comparePassword.mockResolvedValueOnce(false);

    await expect(
      service.changePassword(mockUser.id, {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      }),
    ).rejects.toThrow(AUTH_CONSTANTS.CHANGE_PASSWORD_INVALID_CURRENT_MESSAGE);

    expect(mockUserService.updateOrFail).not.toHaveBeenCalled();
  });

  it('từ chối khi mật khẩu mới trùng mật khẩu hiện tại', async () => {
    await expect(
      service.changePassword(mockUser.id, {
        currentPassword: 'samePassword123',
        newPassword: 'samePassword123',
        confirmPassword: 'samePassword123',
      }),
    ).rejects.toThrow(AUTH_CONSTANTS.CHANGE_PASSWORD_SAME_PASSWORD_MESSAGE);

    expect(mockUserService.updateOrFail).not.toHaveBeenCalled();
  });

  it('từ chối khi xác nhận mật khẩu không trùng khớp', async () => {
    await expect(
      service.changePassword(mockUser.id, {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'mismatchPassword',
      }),
    ).rejects.toThrow(AUTH_CONSTANTS.CHANGE_PASSWORD_MISMATCH_MESSAGE);

    expect(mockUserService.updateOrFail).not.toHaveBeenCalled();
  });

  it('từ chối khi tài khoản chưa thiết lập mật khẩu (Google-only)', async () => {
    mockUserService.findByEmail.mockResolvedValueOnce({
      ...mockUser,
      passwordHash: null,
      password: null,
    });

    await expect(
      service.changePassword(mockUser.id, {
        currentPassword: 'somePassword',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      }),
    ).rejects.toThrow(AUTH_CONSTANTS.EMAIL_CHANGE_PASSWORD_NOT_SET_MESSAGE);
  });

  it('từ chối khi tài khoản không tồn tại hoặc bị khóa', async () => {
    mockUserService.findById.mockResolvedValueOnce(null);

    await expect(
      service.changePassword('invalid_id', {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

