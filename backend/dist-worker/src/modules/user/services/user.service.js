var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UserService_1;
import { Injectable, BadRequestException, ConflictException, NotFoundException, Optional } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { RoleEnum, UserStatusEnum, } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { UserRepository } from '../repositories/user.repository.js';
import { StorageService } from '../../storage/storage.service.js';
import { generateUsername, isUsernameDuplicateKeyError, USERNAME_PATTERN, } from '../utils/username.util.js';
let UserService = UserService_1 = class UserService extends BaseService {
    userRepository;
    storageService;
    constructor(userRepository, cls, storageService) {
        super(userRepository, cls, UserService_1.name);
        this.userRepository = userRepository;
        this.storageService = storageService;
    }
    async generateUniqueUsername(email, excludeUserId, session) {
        return generateUsername(email, async (candidate) => {
            const existing = await this.findByUsername(candidate, session);
            return Boolean(existing && existing.id !== excludeUserId);
        });
    }
    async create(payload, session) {
        if (!payload.email?.trim())
            throw new BadRequestException('Email không được để trống');
        for (let attempt = 0; attempt < 5; attempt++) {
            const username = await this.generateUniqueUsername(payload.email, undefined, session);
            try {
                return await super.create({ ...payload, username }, session);
            }
            catch (error) {
                if (!isUsernameDuplicateKeyError(error) || session?.inTransaction())
                    throw error;
            }
        }
        throw new ConflictException('Không thể tạo đường dẫn hồ sơ. Vui lòng thử lại.');
    }
    async ensureUsername(user, session) {
        if (user.username)
            return user;
        for (let attempt = 0; attempt < 5; attempt++) {
            const username = await this.generateUniqueUsername(user.email, user.id, session);
            try {
                const updated = await this.userRepository.claimUsername(user.id, username, session);
                const current = updated ?? await this.findByIdOrFail(user.id, session);
                return { ...user, ...current };
            }
            catch (error) {
                if (!isUsernameDuplicateKeyError(error) || session?.inTransaction())
                    throw error;
            }
        }
        throw new ConflictException('Không thể tạo đường dẫn hồ sơ. Vui lòng thử lại.');
    }
    async findByEmail(email, includePassword = false, session) {
        return this.userRepository.findByEmail(email, includePassword, session);
    }
    async findByProvider(provider, providerId, session) {
        return this.userRepository.findByProvider(provider, providerId, session);
    }
    async findByUsername(username, session) {
        return this.userRepository.findByUsername(username, session);
    }
    async findByGoogleSub(googleSub, session) {
        return this.userRepository.findByGoogleSub(googleSub, session);
    }
    async findByVerificationToken(token, session) {
        return this.userRepository.findByVerificationToken(token, session);
    }
    async findByEmailForPasswordReset(email, session) {
        return this.userRepository.findByEmailForPasswordReset(email, session);
    }
    async findByPasswordResetTokenHash(tokenHash, session) {
        return this.userRepository.findByPasswordResetTokenHash(tokenHash, session);
    }
    async claimPasswordResetRequest(userId, tokenHash, expiresAt, requestedAt, cooldownCutoff, session) {
        return this.userRepository.claimPasswordResetRequest(userId, tokenHash, expiresAt, requestedAt, cooldownCutoff, session);
    }
    async clearPasswordResetRequest(userId, tokenHash, session) {
        return this.userRepository.clearPasswordResetRequest(userId, tokenHash, session);
    }
    async consumePasswordResetToken(userId, tokenHash, passwordHash, now, session) {
        return this.userRepository.consumePasswordResetToken(userId, tokenHash, passwordHash, now, session);
    }
    async findByEmailChangeTokenHash(tokenHash, session) {
        return this.userRepository.findByEmailChangeTokenHash(tokenHash, session);
    }
    async claimEmailChangeRequest(userId, pendingNewEmail, tokenHash, expiresAt, requestedAt, session) {
        return this.userRepository.claimEmailChangeRequest(userId, pendingNewEmail, tokenHash, expiresAt, requestedAt, session);
    }
    async clearEmailChangeRequest(userId, tokenHash, session) {
        return this.userRepository.clearEmailChangeRequest(userId, tokenHash, session);
    }
    async applyEmailChange(userId, tokenHash, newEmail, now, session) {
        return this.userRepository.applyEmailChange(userId, tokenHash, newEmail, now, session);
    }
    async runInTransaction(operation) {
        return this.userRepository.withTransaction(operation);
    }
    async ensureEmailNotTaken(email, session) {
        const existing = await this.findByEmail(email, false, session);
        if (existing) {
            throw new ConflictException(`Email '${email}' is already registered`);
        }
    }
    async findPublicUserByUsername(username) {
        if (!USERNAME_PATTERN.test(username))
            throw new NotFoundException('Không tìm thấy hồ sơ');
        const user = await this.findByUsername(username);
        if (!user || user.deletedAt || user.status !== UserStatusEnum.ACTIVE || !user.username) {
            throw new NotFoundException('Không tìm thấy hồ sơ');
        }
        return { ...user, username: user.username };
    }
    async getPublicProfileByUsername(username) {
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
    async getProfile(userId) {
        const user = await this.ensureUsername(await this.findByIdOrFail(userId));
        const userWithPassword = await this.userRepository.findByEmail(user.email, true);
        const profile = this.toUserProfile(user);
        profile.hasPassword = !!(userWithPassword?.passwordHash ||
            userWithPassword?.password);
        return profile;
    }
    async updateProfile(userId, dto) {
        const updatePayload = {};
        if (dto.fullName !== undefined) {
            updatePayload.fullName = dto.fullName;
        }
        else if (dto.firstName !== undefined || dto.lastName !== undefined) {
            const currentUser = await this.findByIdOrFail(userId);
            const newFirst = dto.firstName !== undefined ? dto.firstName : currentUser.firstName || '';
            const newLast = dto.lastName !== undefined ? dto.lastName : currentUser.lastName || '';
            updatePayload.fullName = `${newLast} ${newFirst}`.trim();
            if (dto.firstName !== undefined)
                updatePayload.firstName = dto.firstName;
            if (dto.lastName !== undefined)
                updatePayload.lastName = dto.lastName;
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
    async updateAvatar(userId, file) {
        if (!this.storageService) {
            throw new ConflictException('Dịch vụ lưu trữ chưa được khởi tạo');
        }
        const currentUser = await this.findByIdOrFail(userId);
        const oldAvatarUrl = currentUser.avatarUrl || currentUser.avatar || null;
        const avatarUrl = await this.storageService.uploadImage(file, 'avatars');
        const updated = await this.updateOrFail(userId, {
            avatarUrl,
            avatar: avatarUrl,
        });
        if (oldAvatarUrl && oldAvatarUrl !== avatarUrl) {
            try {
                await this.storageService.deleteFile(oldAvatarUrl);
                this.logger.log(`[${this.getCorrelationId()}] Đã xóa avatar cũ khỏi MinIO: ${oldAvatarUrl}`);
            }
            catch (error) {
                this.logger.warn(`[${this.getCorrelationId()}] Không thể xóa avatar cũ (${oldAvatarUrl}) khỏi MinIO: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        return {
            avatarUrl,
            avatar: avatarUrl,
            user: this.toUserProfile(updated),
        };
    }
    async findUsersWithPagination(queryDto, session) {
        const result = await this.userRepository.findUsersWithPagination(queryDto, session);
        return {
            ...result,
            items: result.items.map((user) => this.toUserProfile(user)),
        };
    }
    async getUserDetail(userId, session) {
        const user = await this.userRepository.findById(userId, session);
        if (!user || user.deletedAt) {
            throw new NotFoundException(`Người dùng với ID '${userId}' không tồn tại`);
        }
        return this.toUserProfile(user);
    }
    async updateUserAdmin(userId, dto, session) {
        const user = await this.userRepository.findById(userId, session);
        if (!user || user.deletedAt) {
            throw new NotFoundException(`Người dùng với ID '${userId}' không tồn tại`);
        }
        const updatePayload = {};
        if (dto.fullName !== undefined)
            updatePayload.fullName = dto.fullName;
        if (dto.bio !== undefined)
            updatePayload.bio = dto.bio;
        if (dto.role !== undefined)
            updatePayload.role = dto.role;
        if (dto.status !== undefined)
            updatePayload.status = dto.status;
        const updated = await this.updateOrFail(userId, updatePayload, session);
        return this.toUserProfile(updated);
    }
    toUserProfile(user) {
        const fallbackFullName = user.fullName ||
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
            hasPassword: !!(user.passwordHash || user.password),
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatarUrl || user.avatar || null,
            provider: user.provider,
            socialLinks: user.socialLinks ?? null,
        };
    }
};
UserService = UserService_1 = __decorate([
    Injectable(),
    __param(2, Optional()),
    __metadata("design:paramtypes", [UserRepository,
        ClsService,
        StorageService])
], UserService);
export { UserService };
//# sourceMappingURL=user.service.js.map