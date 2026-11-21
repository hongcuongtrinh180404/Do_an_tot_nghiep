import { Model, ClientSession } from 'mongoose';
import { IUser, AuthProviderEnum } from 'share-lib';
import { BaseMongoRepository, PaginationResult } from '../../base/index.js';
import { UserEntity } from '../schemas/user.schema.js';
import { QueryUsersDto } from '../dto/query-users.dto.js';
export declare class UserRepository extends BaseMongoRepository<IUser, UserEntity> {
    constructor(userModel: Model<UserEntity>);
    findByEmail(email: string, includePassword?: boolean, session?: ClientSession): Promise<IUser | null>;
    findByUsername(username: string, session?: ClientSession): Promise<IUser | null>;
    claimUsername(userId: string, username: string, session?: ClientSession): Promise<IUser | null>;
    restore(userId: string, updatedById?: string, session?: ClientSession): Promise<boolean>;
    findByProvider(provider: AuthProviderEnum, providerId: string, session?: ClientSession): Promise<IUser | null>;
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
    findUsersWithPagination(queryDto: QueryUsersDto, session?: ClientSession): Promise<PaginationResult<IUser>>;
    updateCommissionRate(userId: string, rate: number, adminId: string, session?: ClientSession): Promise<IUser | null>;
    updateAllInstructorsCommissionRate(newRate: number, adminId: string, session?: ClientSession): Promise<number>;
}
