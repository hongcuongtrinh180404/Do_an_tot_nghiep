import { Injectable, BadRequestException, ConflictException, NotFoundException, Optional } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import {
  IUser,
  IUserProfile,
  IPublicUserProfile,
  AuthProviderEnum,
  RoleEnum,
  UserStatusEnum,
} from 'share-lib';
import { BaseService, PaginationResult } from '../../base/index.js';
import { UserRepository } from '../repositories/user.repository.js';
import { StorageService } from '../../storage/storage.service.js';
import { UpdateProfileDto } from '../dto/update-profile.dto.js';
import { QueryUsersDto } from '../dto/query-users.dto.js';
import { UpdateUserAdminDto } from '../dto/update-user-admin.dto.js';
import {
  generateUsername,
  isUsernameDuplicateKeyError,
  USERNAME_PATTERN,
} from '../utils/username.util.js';

@Injectable()
export class UserService extends BaseService<IUser, string> {
  constructor(
    protected readonly userRepository: UserRepository,
    cls: ClsService,
    @Optional() protected readonly storageService?: StorageService,
  ) {
    super(userRepository, cls, UserService.name);
  }

  async generateUniqueUsername(
    email: string,
    excludeUserId?: string,
    session?: ClientSession,
  ): Promise<string> {
    return generateUsername(email, async (candidate) => {
      const existing = await this.findByUsername(candidate, session);
      return Boolean(existing && existing.id !== excludeUserId);
    });
  }

  override async create(payload: Partial<IUser>, session?: ClientSession): Promise<IUser> {
    if (!payload.email?.trim()) throw new BadRequestException('Email không được để trống');

    for (let attempt = 0; attempt < 5; attempt++) {
      const username = await this.generateUniqueUsername(payload.email, undefined, session);
      try {
        // Username is owned by the server, even when a caller supplies one.
        return await super.create({ ...payload, username }, session);
      } catch (error) {
        if (!isUsernameDuplicateKeyError(error) || session?.inTransaction()) throw error;
      }
    }
    throw new ConflictException('Không thể tạo đường dẫn hồ sơ. Vui lòng thử lại.');
  }

  /** Backfill a missing handle once; changing email must not change a published URL. */
  async ensureUsername(user: IUser, session?: ClientSession): Promise<IUser> {
    if (user.username) return user;

    for (let attempt = 0; attempt < 5; attempt++) {
      const username = await this.generateUniqueUsername(user.email, user.id, session);
      try {
        const updated = await this.userRepository.claimUsername(user.id, username, session);
        // Another login may have claimed it first. Read its value instead of overwriting it.
        const current = updated ?? await this.findByIdOrFail(user.id, session);
        return { ...user, ...current };
      } catch (error) {
        if (!isUsernameDuplicateKeyError(error) || session?.inTransaction()) throw error;
      }
    }
    throw new ConflictException('Không thể tạo đường dẫn hồ sơ. Vui lòng thử lại.');
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

  async findByGoogleSub(
    googleSub: string,
    session?: ClientSession,
  ): Promise<IUser | null> {
    return this.userRepository.findByGoogleSub(googleSub, session);
  }

  async findByVerificationToken(
    token: string,
    session?: ClientSession,
  ): Promise<IUser | null> {
    return this.userRepository.findByVerificationToken(token, session);
  }

  async findByEmailForPasswordReset(
    email: string,
    session?: ClientSession,
  ): Promise<IUser | null> {
    return this.userRepository.findByEmailForPasswordReset(email, session);
  }

  async findByPasswordResetTokenHash(
    tokenHash: string,
    session?: ClientSession,
  ): Promise<IUser | null> {
    return this.userRepository.findByPasswordResetTokenHash(tokenHash, session);
  }

  async claimPasswordResetRequest(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    requestedAt: Date,
    cooldownCutoff: Date,
    session?: ClientSession,
  ): Promise<IUser | null> {
    return this.userRepository.claimPasswordResetRequest(
      userId,
      tokenHash,
      expiresAt,
      requestedAt,
      cooldownCutoff,
      session,
    );
  }

  async clearPasswordResetRequest(
    userId: string,
    tokenHash: string,
    session?: ClientSession,
  ): Promise<void> {
    return this.userRepository.clearPasswordResetRequest(userId, tokenHash, session);
  }

  async consumePasswordResetToken(
    userId: string,
    tokenHash: string,
    passwordHash: string,
    now: Date,
    session?: ClientSession,
  ): Promise<IUser | null> {
    return this.userRepository.consumePasswordResetToken(
      userId,
      tokenHash,
      passwordHash,
      now,
      session,
    );
  }

  async findByEmailChangeTokenHash(
    tokenHash: string,
    session?: ClientSession,
  ): Promise<IUser | null> {
    return this.userRepository.findByEmailChangeTokenHash(tokenHash, session);
  }

  async claimEmailChangeRequest(
    userId: string,
    pendingNewEmail: string,
    tokenHash: string,
    expiresAt: Date,
    requestedAt: Date,
    session?: ClientSession,
  ): Promise<IUser | null> {
    return this.userRepository.claimEmailChangeRequest(
      userId,
      pendingNewEmail,
      tokenHash,
      expiresAt,
      requestedAt,
      session,
    );
  }

  async clearEmailChangeRequest(
    userId: string,
    tokenHash: string,
    session?: ClientSession,
  ): Promise<void> {
    return this.userRepository.clearEmailChangeRequest(userId, tokenHash, session);
  }

  async applyEmailChange(
    userId: string,
    tokenHash: string,
    newEmail: string,
    now: Date,
    session?: ClientSession,
  ): Promise<IUser | null> {
    return this.userRepository.applyEmailChange(
      userId,
      tokenHash,
      newEmail,
      now,
      session,
    );
  }

  async runInTransaction<R>(
    operation: (session: ClientSession) => Promise<R>,
  ): Promise<R> {
    return this.userRepository.withTransaction(operation);
  }

  async ensureEmailNotTaken(email: string, session?: ClientSession): Promise<void> {
    const existing = await this.findByEmail(email, false, session);
    if (existing) {
      throw new ConflictException(`Email '${email}' is already registered`);
    }
  }

  async findPublicUserByUsername(username: string): Promise<IUser & { username: string }> {
    if (!USERNAME_PATTERN.test(username)) throw new NotFoundException('Không tìm thấy hồ sơ');
    const user = await this.findByUsername(username);
    if (!user || user.deletedAt || user.status !== UserStatusEnum.ACTIVE || !user.username) {
      throw new NotFoundException('Không tìm thấy hồ sơ');
    }
    return { ...user, username: user.username };
  }

  async getPublicProfileByUsername(username: string): Promise<IPublicUserProfile> {
    const user = await this.findPublicUserByUsername(username);
    return {
      fullName: user.fullName || user.username,
      username: user.username,
      avatarUrl: user.avatarUrl || user.avatar || null,
      bio: user.bio ?? null,
      role: user.role,
      createdAt: user.createdAt,
      socialLinks: user.socialLinks ?? null,
      ...(user.role === RoleEnum.INSTRUCTOR ? { instructorId: user.id } : {}),
    };
  }

  async getProfile(userId: string): Promise<IUserProfile> {
    const user = await this.ensureUsername(await this.findByIdOrFail(userId));
    const userWithPassword = await this.userRepository.findByEmail(user.email, true);
    const profile = this.toUserProfile(user);
    profile.hasPassword = !!(
      userWithPassword?.passwordHash ||
      (userWithPassword as { password?: string })?.password
    );
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<IUserProfile> {
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

    if (dto.bio !== undefined) {
      updatePayload.bio = dto.bio;
    }

    if (dto.socialLinks !== undefined) {
      updatePayload.socialLinks = {
        facebook: dto.socialLinks.facebook || null,
        youtube: dto.socialLinks.youtube || null,
        linkedin: dto.socialLinks.linkedin || null,
        github: dto.socialLinks.github || null,
      };
    }

    const updated = await this.updateOrFail(userId, updatePayload);
    return this.toUserProfile(updated);
  }

  async updateAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ avatarUrl: string; avatar: string; user: IUserProfile }> {
    if (!this.storageService) {
      throw new ConflictException('Dịch vụ lưu trữ chưa được khởi tạo');
    }

    // 1. Lấy thông tin user hiện tại để trích xuất avatar cũ
    const currentUser = await this.findByIdOrFail(userId);
    const oldAvatarUrl = currentUser.avatarUrl || currentUser.avatar || null;

    // 2. Upload avatar mới lên MinIO
    const avatarUrl = await this.storageService.uploadImage(file, 'avatars');

    // 3. Cập nhật URL avatar mới vào Database
    const updated = await this.updateOrFail(userId, {
      avatarUrl,
      avatar: avatarUrl,
    });

    // 4. Xóa avatar cũ khỏi MinIO (nếu có và khác avatar mới)
    if (oldAvatarUrl && oldAvatarUrl !== avatarUrl) {
      try {
        await this.storageService.deleteFile(oldAvatarUrl);
        this.logger.log(
          `[${this.getCorrelationId()}] Đã xóa avatar cũ khỏi MinIO: ${oldAvatarUrl}`,
        );
      } catch (error) {
        this.logger.warn(
          `[${this.getCorrelationId()}] Không thể xóa avatar cũ (${oldAvatarUrl}) khỏi MinIO: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // 5. Trả về profile đã cập nhật
    return {
      avatarUrl,
      avatar: avatarUrl,
      user: this.toUserProfile(updated),
    };
  }

  async findUsersWithPagination(
    queryDto: QueryUsersDto,
    session?: ClientSession,
  ): Promise<PaginationResult<IUserProfile>> {
    const result = await this.userRepository.findUsersWithPagination(queryDto, session);
    return {
      ...result,
      items: result.items.map((user) => this.toUserProfile(user)),
    };
  }

  async getUserDetail(userId: string, session?: ClientSession): Promise<IUserProfile> {
    const user = await this.userRepository.findById(userId, session);
    if (!user || user.deletedAt) {
      throw new NotFoundException(`Người dùng với ID '${userId}' không tồn tại`);
    }
    return this.toUserProfile(user);
  }

  async updateUserAdmin(
    userId: string,
    dto: UpdateUserAdminDto,
    session?: ClientSession,
  ): Promise<IUserProfile> {
    const user = await this.userRepository.findById(userId, session);
    if (!user || user.deletedAt) {
      throw new NotFoundException(`Người dùng với ID '${userId}' không tồn tại`);
    }

    const updatePayload: Partial<IUser> = {};
    if (dto.fullName !== undefined) updatePayload.fullName = dto.fullName;
    if (dto.bio !== undefined) updatePayload.bio = dto.bio;
    if (dto.role !== undefined) updatePayload.role = dto.role;
    if (dto.status !== undefined) updatePayload.status = dto.status;
    const updated = await this.updateOrFail(userId, updatePayload, session);
    return this.toUserProfile(updated);
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
      commissionRate: user.commissionRate ?? 30,
      commissionRateUpdatedAt: user.commissionRateUpdatedAt ?? null,
      commissionRateUpdatedById: user.commissionRateUpdatedById ?? null,
      googleSub: user.googleSub ?? null,
      isEmailVerified: !!user.isEmailVerified,
      hasPassword: !!(user.passwordHash || (user as { password?: string }).password),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatarUrl || user.avatar || null,
      provider: user.provider,
      socialLinks: user.socialLinks ?? null,
    };
  }
}
