import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { AuthProviderEnum, IUser, RoleEnum, UserStatusEnum } from 'share-lib';
import { UserService } from '../services/user.service.js';
import { UserRepository } from '../repositories/user.repository.js';
import { StorageService } from '../../storage/storage.service.js';

describe('UserService - Profile and Avatar Management', () => {
  let service: UserService;
  let mockUserRepository: {
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockCls: { get: ReturnType<typeof vi.fn> };
  let mockStorageService: {
    uploadImage: ReturnType<typeof vi.fn>;
    deleteFile: ReturnType<typeof vi.fn>;
  };

  const mockUser: IUser = {
    id: 'user_123',
    email: 'profile_test@example.com',
    passwordHash: 'hashed_password_123',
    fullName: 'Nguyễn Văn A',
    username: 'nguyenvana',
    avatarUrl: 'https://example.com/old_avatar.jpg',
    bio: 'Lập trình viên',
    role: RoleEnum.STUDENT,
    status: UserStatusEnum.ACTIVE,
    provider: AuthProviderEnum.LOCAL,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockUserRepository = {
      findById: vi.fn(),
      update: vi.fn(),
    };
    mockCls = {
      get: vi.fn().mockReturnValue('user_123'),
    };
    mockStorageService = {
      uploadImage: vi.fn(),
      deleteFile: vi.fn().mockResolvedValue(true),
    };

    service = new UserService(
      mockUserRepository as unknown as UserRepository,
      mockCls as unknown as ClsService,
      mockStorageService as unknown as StorageService,
    );
  });

  describe('getProfile', () => {
    it('should return user profile mapped correctly', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await service.getProfile('user_123');

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user_123', undefined);
      expect(result).toEqual({
        id: 'user_123',
        email: 'profile_test@example.com',
        fullName: 'Nguyễn Văn A',
        username: 'nguyenvana',
        avatarUrl: 'https://example.com/old_avatar.jpg',
        bio: 'Lập trình viên',
        role: RoleEnum.STUDENT,
        status: UserStatusEnum.ACTIVE,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        firstName: undefined,
        lastName: undefined,
        avatar: 'https://example.com/old_avatar.jpg',
        provider: AuthProviderEnum.LOCAL,
      });
    });
  });

  describe('updateProfile', () => {
    it('should update user names and return updated profile', async () => {
      // Arrange
      const updatedUser: IUser = {
        ...mockUser,
        fullName: 'Trần Thị B',
      };
      mockUserRepository.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.updateProfile('user_123', {
        fullName: 'Trần Thị B',
      });

      // Assert
      expect(mockUserRepository.update).toHaveBeenCalled();
      expect(result.fullName).toBe('Trần Thị B');
    });
  });

  describe('updateAvatar', () => {
    it('should upload file, update avatar in repository, and delete old avatar from storage', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      const fakeFile = {
        buffer: Buffer.from('fake image content'),
        mimetype: 'image/jpeg',
        originalname: 'avatar.jpg',
        size: 1024,
      } as Express.Multer.File;

      const newAvatarUrl = 'http://localhost:9000/thc-datn-media/avatars/new-avatar.webp';
      mockStorageService.uploadImage.mockResolvedValue(newAvatarUrl);

      const updatedUser: IUser = {
        ...mockUser,
        avatarUrl: newAvatarUrl,
        avatar: newAvatarUrl,
      };
      mockUserRepository.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.updateAvatar('user_123', fakeFile);

      // Assert
      expect(mockUserRepository.findById).toHaveBeenCalledWith('user_123', undefined);
      expect(mockStorageService.uploadImage).toHaveBeenCalledWith(fakeFile, 'avatars');
      expect(mockUserRepository.update).toHaveBeenCalled();
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith('https://example.com/old_avatar.jpg');
      expect(result.avatarUrl).toBe(newAvatarUrl);
      expect(result.user.avatarUrl).toBe(newAvatarUrl);
    });

    it('should not call deleteFile if user does not have an existing avatar', async () => {
      // Arrange
      const userWithoutAvatar: IUser = {
        ...mockUser,
        avatarUrl: undefined,
        avatar: undefined,
      };
      mockUserRepository.findById.mockResolvedValue(userWithoutAvatar);

      const fakeFile = {
        buffer: Buffer.from('fake image content'),
        mimetype: 'image/jpeg',
        originalname: 'avatar.jpg',
        size: 1024,
      } as Express.Multer.File;

      const newAvatarUrl = 'http://localhost:9000/thc-datn-media/avatars/first-avatar.webp';
      mockStorageService.uploadImage.mockResolvedValue(newAvatarUrl);

      const updatedUser: IUser = {
        ...userWithoutAvatar,
        avatarUrl: newAvatarUrl,
        avatar: newAvatarUrl,
      };
      mockUserRepository.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.updateAvatar('user_123', fakeFile);

      // Assert
      expect(mockStorageService.uploadImage).toHaveBeenCalledWith(fakeFile, 'avatars');
      expect(mockStorageService.deleteFile).not.toHaveBeenCalled();
      expect(result.avatarUrl).toBe(newAvatarUrl);
    });

    it('should continue successfully even if deleteFile throws an error', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockStorageService.deleteFile.mockRejectedValue(new Error('MinIO connection timeout'));

      const fakeFile = {
        buffer: Buffer.from('fake image content'),
        mimetype: 'image/jpeg',
        originalname: 'avatar.jpg',
        size: 1024,
      } as Express.Multer.File;

      const newAvatarUrl = 'http://localhost:9000/thc-datn-media/avatars/new-avatar.webp';
      mockStorageService.uploadImage.mockResolvedValue(newAvatarUrl);

      const updatedUser: IUser = {
        ...mockUser,
        avatarUrl: newAvatarUrl,
        avatar: newAvatarUrl,
      };
      mockUserRepository.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.updateAvatar('user_123', fakeFile);

      // Assert
      expect(result.avatarUrl).toBe(newAvatarUrl);
      expect(mockStorageService.deleteFile).toHaveBeenCalledWith('https://example.com/old_avatar.jpg');
    });

    it('should throw ConflictException if StorageService is not available', async () => {
      // Arrange
      const serviceWithoutStorage = new UserService(
        mockUserRepository as unknown as UserRepository,
        mockCls as unknown as ClsService,
        undefined,
      );
      const fakeFile = {} as Express.Multer.File;

      // Act & Assert
      await expect(
        serviceWithoutStorage.updateAvatar('user_123', fakeFile),
      ).rejects.toThrow(ConflictException);
    });
  });
});
