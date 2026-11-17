import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { AuthProviderEnum, IUser, RoleEnum, UserStatusEnum } from 'share-lib';
import { UserService } from '../services/user.service.js';
import { UserRepository } from '../repositories/user.repository.js';

describe('UserService', () => {
  let service: UserService;
  let mockUserRepository: {
    findByEmail: ReturnType<typeof vi.fn>;
    findByProvider: ReturnType<typeof vi.fn>;
    findByUsername: ReturnType<typeof vi.fn>;
    claimUsername: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findUsersWithPagination: ReturnType<typeof vi.fn>;
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
      findByUsername: vi.fn().mockResolvedValue(null),
      claimUsername: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      findUsersWithPagination: vi.fn(),
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

  describe('findUsersWithPagination', () => {
    it('should call repository.findUsersWithPagination and map items to IUserProfile', async () => {
      const mockResult = {
        items: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      mockUserRepository.findUsersWithPagination.mockResolvedValue(mockResult);

      const queryDto = { page: 1, limit: 10, search: 'test', isPagination: true };
      const result = await service.findUsersWithPagination(queryDto);

      expect(mockUserRepository.findUsersWithPagination).toHaveBeenCalledWith(queryDto, undefined);
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].email).toBe(mockUser.email);
      expect(result.items[0].fullName).toBe(mockUser.fullName);
      expect((result.items[0] as unknown as { passwordHash?: string }).passwordHash).toBeUndefined();
    });
  });

  describe('getUserDetail', () => {
    it('should return user profile if found and not deleted', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await service.getUserDetail('user_1');

      expect(mockUserRepository.findById).toHaveBeenCalledWith('user_1', undefined);
      expect(result.id).toBe(mockUser.id);
      expect(result.email).toBe(mockUser.email);
    });

    it('should throw NotFoundException if user is not found or deleted', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.getUserDetail('non_existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUserAdmin', () => {
    it('should update and return updated user profile', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      const updatedUser = { ...mockUser, role: RoleEnum.ADMIN };
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await service.updateUserAdmin('user_1', { role: RoleEnum.ADMIN });

      expect(mockUserRepository.findById).toHaveBeenCalledWith('user_1', undefined);
      expect(result.role).toBe(RoleEnum.ADMIN);
    });

    it('should throw NotFoundException if user is not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(service.updateUserAdmin('non_existent', { role: RoleEnum.ADMIN })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('ignores a manually supplied username even when called outside the HTTP validation layer', async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.update.mockResolvedValue(mockUser);
      await service.updateUserAdmin('user_1', { role: RoleEnum.ADMIN, username: 'hijacked' } as never);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        'user_1', expect.not.objectContaining({ username: expect.anything() }), undefined,
      );
    });
  });

  describe('automatic usernames', () => {
    it('derives the handle on create rather than accepting the payload handle', async () => {
      mockUserRepository.create.mockImplementation(async (payload) => ({ ...mockUser, ...payload }));
      const result = await service.create({ email: 'Nguyen.Van.A@gmail.com', username: 'chosen' });
      expect(result.username).toBe('nguyen.van.a');
    });

    it('retries username index races with the next available suffix', async () => {
      mockUserRepository.findByUsername
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockUser, id: 'another-user', username: 'test' })
        .mockResolvedValueOnce(null);
      mockUserRepository.create
        .mockRejectedValueOnce({ code: 11000, keyPattern: { username: 1 } })
        .mockImplementationOnce(async (payload) => ({ ...mockUser, ...payload }));
      const result = await service.create({ email: mockUser.email });
      expect(result.username).toBe('test2');
      expect(mockUserRepository.create).toHaveBeenCalledTimes(2);
    });

    it('does not retry duplicate email errors', async () => {
      const error = { code: 11000, keyPattern: { email: 1 } };
      mockUserRepository.create.mockRejectedValue(error);
      await expect(service.create({ email: mockUser.email })).rejects.toEqual(error);
      expect(mockUserRepository.create).toHaveBeenCalledTimes(1);
    });

    it('bounds retries when the unique index keeps colliding', async () => {
      mockUserRepository.create.mockRejectedValue({ code: 11000, keyPattern: { username: 1 } });
      await expect(service.create({ email: mockUser.email })).rejects.toThrow(ConflictException);
      expect(mockUserRepository.create).toHaveBeenCalledTimes(5);
    });

    it('backfills a missing handle and preserves the password availability from login', async () => {
      // A database projection omits passwordHash entirely.
      const claimed = { ...mockUser, username: 'test' };
      delete claimed.passwordHash;
      mockUserRepository.claimUsername.mockResolvedValue(claimed);
      const result = await service.ensureUsername(mockUser);
      expect(result.username).toBe('test');
      expect(result.passwordHash).toBe(mockUser.passwordHash);
      expect(mockUserRepository.claimUsername).toHaveBeenCalledWith('user_1', 'test', undefined);
    });

    it('never changes an existing handle after an email change', async () => {
      const user = { ...mockUser, email: 'new-email@gmail.com', username: 'original' };
      expect(await service.ensureUsername(user)).toBe(user);
      expect(mockUserRepository.claimUsername).not.toHaveBeenCalled();
    });

    it('does not overwrite the handle claimed by another concurrent login', async () => {
      mockUserRepository.claimUsername.mockResolvedValue(null);
      mockUserRepository.findById.mockResolvedValue({ ...mockUser, username: 'test2' });
      expect((await service.ensureUsername(mockUser)).username).toBe('test2');
    });

    it('ignores manual username changes in updateProfile', async () => {
      mockUserRepository.update.mockResolvedValue(mockUser);
      await service.updateProfile('user_1', { fullName: 'Updated Name', username: 'hijacked' } as never);
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        'user_1', expect.not.objectContaining({ username: expect.anything() }), undefined,
      );
    });

    it('updates socialLinks in updateProfile', async () => {
      const socialLinks = {
        facebook: 'https://facebook.com/cuong',
        youtube: 'https://youtube.com/@cuong',
        linkedin: 'https://linkedin.com/in/cuong',
        github: 'cuongdev',
      };
      mockUserRepository.update.mockResolvedValue({ ...mockUser, socialLinks });
      const updated = await service.updateProfile('user_1', { socialLinks });
      expect(mockUserRepository.update).toHaveBeenCalledWith(
        'user_1', expect.objectContaining({ socialLinks }), undefined,
      );
      expect(updated.socialLinks).toEqual(socialLinks);
    });
  });

  describe('public profile', () => {
    it('returns only the anonymous profile allowlist', async () => {
      mockUserRepository.findByUsername.mockResolvedValue({
        ...mockUser, username: 'test', googleSub: 'secret', passwordHash: 'secret',
        commissionRate: 60, pendingNewEmail: 'private@example.com',
      });
      const result = await service.getPublicProfileByUsername('test');
      expect(Object.keys(result).sort()).toEqual(
        ['fullName', 'username', 'avatarUrl', 'bio', 'role', 'createdAt', 'socialLinks'].sort(),
      );
      expect(result.fullName).toBe(mockUser.fullName);
    });

    it('includes the public course filtering key for instructors only', async () => {
      mockUserRepository.findByUsername.mockResolvedValue({
        ...mockUser, username: 'test', role: RoleEnum.INSTRUCTOR,
      });
      const result = await service.getPublicProfileByUsername('test');
      expect(result.instructorId).toBe(mockUser.id);
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('id');
    });

    it.each([
      null,
      { ...mockUser, username: null },
      { ...mockUser, username: 'test', status: UserStatusEnum.INACTIVE },
      { ...mockUser, username: 'test', status: UserStatusEnum.BANNED },
      { ...mockUser, username: 'test', deletedAt: new Date() },
    ])('returns 404 for a non-public account', async (user) => {
      mockUserRepository.findByUsername.mockResolvedValue(user);
      await expect(service.getPublicProfileByUsername('test')).rejects.toThrow(NotFoundException);
    });

    it.each(['', 'a/b', '~migration', 'a'.repeat(31), '$where', '.'])('rejects invalid handle %s', async (username) => {
      await expect(service.getPublicProfileByUsername(username)).rejects.toThrow(NotFoundException);
      expect(mockUserRepository.findByUsername).not.toHaveBeenCalled();
    });
  });
});
