import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { AuthProviderEnum, IUser, RoleEnum, UserStatusEnum } from 'share-lib';
import { UserService } from '../services/user.service.js';
import { UserRepository } from '../repositories/user.repository.js';

describe('UserService', () => {
  let service: UserService;
  let mockUserRepository: {
    findByEmail: ReturnType<typeof vi.fn>;
    findByProvider: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockCls: { get: ReturnType<typeof vi.fn> };

  const mockUser: IUser = {
    id: 'user_1',
    email: 'test@example.com',
    passwordHash: 'hashed_password_123',
    fullName: 'Test User',
    role: RoleEnum.STUDENT,
    status: UserStatusEnum.ACTIVE,
    provider: AuthProviderEnum.LOCAL,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockUserRepository = {
      findByEmail: vi.fn(),
      findByProvider: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
    };
    mockCls = {
      get: vi.fn().mockReturnValue('user_1'),
    };

    service = new UserService(
      mockUserRepository as unknown as UserRepository,
      mockCls as unknown as ClsService,
    );
  });

  describe('findByEmail', () => {
    it('should query repository with email and flag', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com', true);

      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('test@example.com', true, undefined);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByProvider', () => {
    it('should query repository by provider and providerId', async () => {
      mockUserRepository.findByProvider.mockResolvedValue(mockUser);

      const result = await service.findByProvider(AuthProviderEnum.GOOGLE, 'google_123');

      expect(mockUserRepository.findByProvider).toHaveBeenCalledWith(AuthProviderEnum.GOOGLE, 'google_123', undefined);
      expect(result).toEqual(mockUser);
    });
  });

  describe('ensureEmailNotTaken', () => {
    it('should throw ConflictException if user exists with the email', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(service.ensureEmailNotTaken('test@example.com')).rejects.toThrow(ConflictException);
    });

    it('should resolve without error if email is not taken', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(service.ensureEmailNotTaken('free@example.com')).resolves.toBeUndefined();
    });
  });
});
