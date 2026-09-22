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

  async ensureEmailNotTaken(email: string, session?: ClientSession): Promise<void> {
    const existing = await this.findByEmail(email, false, session);
    if (existing) {
      throw new ConflictException(`Email '${email}' is already registered`);
    }
  }

  async getProfile(userId: string): Promise<IUserProfile> {
    const user = await this.findByIdOrFail(userId);
    return this.toUserProfile(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<IUserProfile> {
    const updated = await this.updateOrFail(userId, {
      ...(dto.firstName !== undefined && { firstName: dto.firstName }),
      ...(dto.lastName !== undefined && { lastName: dto.lastName }),
    });
    return this.toUserProfile(updated);
  }

  async updateAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ avatar: string; user: IUserProfile }> {
    if (!this.cloudinaryService) {
      throw new ConflictException('Dịch vụ lưu trữ Cloudinary chưa được khởi tạo');
    }
    const avatarUrl = await this.cloudinaryService.uploadImage(file);
    const updated = await this.updateOrFail(userId, { avatar: avatarUrl });
    return {
      avatar: avatarUrl,
      user: this.toUserProfile(updated),
    };
  }

  toUserProfile(user: IUser): IUserProfile {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      provider: user.provider,
    };
  }
}

