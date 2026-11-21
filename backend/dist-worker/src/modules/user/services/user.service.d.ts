import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import { IUser, IUserProfile, IPublicUserProfile, AuthProviderEnum } from 'share-lib';
import { BaseService, PaginationResult } from '../../base/index.js';
import { UserRepository } from '../repositories/user.repository.js';
import { StorageService } from '../../storage/storage.service.js';
import { UpdateProfileDto } from '../dto/update-profile.dto.js';
import { QueryUsersDto } from '../dto/query-users.dto.js';
import { UpdateUserAdminDto } from '../dto/update-user-admin.dto.js';
export declare class UserService extends BaseService<IUser, string> {
    protected readonly userRepository: UserRepository;
    protected readonly storageService?: StorageService | undefined;
    constructor(userRepository: UserRepository, cls: ClsService, storageService?: StorageService | undefined);
    generateUniqueUsername(email: string, excludeUserId?: string, session?: ClientSession): Promise<string>;
    create(payload: Partial<IUser>, session?: ClientSession): Promise<IUser>;
    ensureUsername(user: IUser, session?: ClientSession): Promise<IUser>;
    findByEmail(email: string, includePassword?: boolean, session?: ClientSession): Promise<IUser | null>;
    findByProvider(provider: AuthProviderEnum, providerId: string, session?: ClientSession): Promise<IUser | null>;
    findByUsername(username: string, session?: ClientSession): Promise<IUser | null>;
    findByGoogleSub(googleSub: string, session?: ClientSession): Promise<IUser | null>;
    findByVerificationToken(token: string, session?: ClientSession): Promise<IUser | null>;
    findByEmailForPasswordReset(email: string, session?: ClientSession): Promise<IUser | null>;
    findByPasswordResetTokenHash(tokenHash: string, session?: ClientSession): Promise<IUser | null>;
    claimPasswordResetRequest(userId: string, tokenHash: string, expiresAt: Date, requestedAt: Date, cooldownCutoff: Date, session?: ClientSession): Promise<IUser | null>;
    clearPasswordResetRequest(userId: string, tokenHash: string, session?: ClientSession): Promise<void>;
    consumePasswordResetToken(userId: string, tokenHash: string, passwordHash: string, now: Date, session?: ClientSession): Promise<IUser | null>;
    findByEmailChangeTokenHash(tokenHash: string, session?: ClientSession): Promise<IUser | null>;
    claimEmailChangeRequest(userId: string, pendingNewEmail: string, tokenHash: string, expiresAt: Date, requestedAt: Date, session?: ClientSession): Promise<IUser | null>;
    clearEmailChangeRequest(userId: string, tokenHash: string, session?: ClientSession): Promise<void>;
    applyEmailChange(userId: string, tokenHash: string, newEmail: string, now: Date, session?: ClientSession): Promise<IUser | null>;
    runInTransaction<R>(operation: (session: ClientSession) => Promise<R>): Promise<R>;
    ensureEmailNotTaken(email: string, session?: ClientSession): Promise<void>;
    findPublicUserByUsername(username: string): Promise<IUser & {
        username: string;
    }>;
    getPublicProfileByUsername(username: string): Promise<IPublicUserProfile>;
    getProfile(userId: string): Promise<IUserProfile>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<IUserProfile>;
    updateAvatar(userId: string, file: Express.Multer.File): Promise<{
        avatarUrl: string;
        avatar: string;
        user: IUserProfile;
    }>;
    findUsersWithPagination(queryDto: QueryUsersDto, session?: ClientSession): Promise<PaginationResult<IUserProfile>>;
    getUserDetail(userId: string, session?: ClientSession): Promise<IUserProfile>;
    updateUserAdmin(userId: string, dto: UpdateUserAdminDto, session?: ClientSession): Promise<IUserProfile>;
    toUserProfile(user: IUser): IUserProfile;
}
