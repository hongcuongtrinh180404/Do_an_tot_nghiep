import { Injectable, ConflictException, Optional } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import { IUser, IUserProfile, AuthProviderEnum } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { UserRepository } from '../repositories/user.repository.js';
import { CloudinaryService } from './cloudinary.service.js';
import { UpdateProfileDto } from '../dto/update-profile.dto.js';

@Injectable()
export class UserService extends BaseService<IUser, string> {
  constructor(
    protected readonly userRepository: UserRepository,
    cls: ClsService,
    @Optional() protected readonly cloudinaryService?: CloudinaryService,
  ) {
    super(userRepository, cls, UserService.name);
  }

  async findByEmail(
    email: string,
    includePassword = false,
    session?: ClientSession,
  ): Promise<IUser | null> {
    return this.userRepository.findByEmail(email, includePassword, session);
  }

  async findByProvider(
    provider: AuthProviderEnum,
    providerId: string,
    session?: ClientSession,
  ): Promise<IUser | null> {
    return this.userRepository.findByProvider(provider, providerId, session);
  }

  async findByUsername(
    username: string,
    session?: ClientSession,
  ): Promise<IUser | null> {
    return this.userRepository.findByUsername(username, session);
  }

  async ensureEmailNotTaken(email: string, session?: ClientSession): Promise<void> {
    const existing = await this.findByEmail(email, false, session);
    if (existing) {
      throw new ConflictException(`Email '${email}' is already registered`);
    }
  }

  async ensureUsernameNotTaken(
    username: string,
    excludeUserId?: string,
    session?: ClientSession,
  ): Promise<void> {
    const existing = await this.findByUsername(username, session);
    if (existing && existing.id !== excludeUserId) {
      throw new ConflictException(`Username '${username}' is already taken`);
    }
  }

  async getProfile(userId: string): Promise<IUserProfile> {
    const user = await this.findByIdOrFail(userId);
    return this.toUserProfile(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<IUserProfile> {
    if (dto.username) {
      await this.ensureUsernameNotTaken(dto.username, userId);
    }

    const updatePayload: Partial<IUser> = {};

    if (dto.fullName !== undefined) {
      updatePayload.fullName = dto.fullName;
    } else if (dto.firstName !== undefined || dto.lastName !== undefined) {
      const currentUser = await this.findByIdOrFail(userId);
      const newFirst = dto.firstName !== undefined ? dto.firstName : currentUser.firstName || '';
      const newLast = dto.lastName !== undefined ? dto.lastName : currentUser.lastName || '';
      updatePayload.fullName = `${newLast} ${newFirst}`.trim();
      if (dto.firstName !== undefined) updatePayload.firstName = dto.firstName;
      if (dto.lastName !== undefined) updatePayload.lastName = dto.lastName;
    }

    if (dto.username !== undefined) {
      updatePayload.username = dto.username;
    }

    if (dto.bio !== undefined) {
      updatePayload.bio = dto.bio;
    }

    const updated = await this.updateOrFail(userId, updatePayload);
    return this.toUserProfile(updated);
  }

  async updateAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ avatarUrl: string; avatar: string; user: IUserProfile }> {
    if (!this.cloudinaryService) {
      throw new ConflictException('Dịch vụ lưu trữ Cloudinary chưa được khởi tạo');
    }
    const avatarUrl = await this.cloudinaryService.uploadImage(file);
    const updated = await this.updateOrFail(userId, {
      avatarUrl,
      avatar: avatarUrl,
    });
    return {
      avatarUrl,
      avatar: avatarUrl,
      user: this.toUserProfile(updated),
    };
  }

  toUserProfile(user: IUser): IUserProfile {
    const fallbackFullName =
      user.fullName ||
      (user.firstName || user.lastName
        ? `${user.lastName || ''} ${user.firstName || ''}`.trim()
        : user.email.split('@')[0]);

    return {
      id: user.id,
      email: user.email,
      fullName: fallbackFullName,
      username: user.username ?? null,
      avatarUrl: user.avatarUrl || user.avatar || null,
      bio: user.bio ?? null,
      role: user.role,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatarUrl || user.avatar || null,
      provider: user.provider,
    };
  }
}


