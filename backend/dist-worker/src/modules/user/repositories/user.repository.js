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
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RoleEnum, UserStatusEnum } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { UserEntity } from '../schemas/user.schema.js';
import { generateUsername, isUsernameDuplicateKeyError } from '../utils/username.util.js';
let UserRepository = class UserRepository extends BaseMongoRepository {
    constructor(userModel) {
        super(userModel);
    }
    async findByEmail(email, includePassword = false, session) {
        const query = this.model.findOne({
            email: email.toLowerCase().trim(),
            deletedAt: null,
        });
        if (includePassword) {
            query.select('+passwordHash');
        }
        const doc = await query.session(session ?? null).exec();
        return doc ? this.toDomain(doc) : null;
    }
    async findByUsername(username, session) {
        const doc = await this.model
            .findOne({
            username: username.toLowerCase().trim(),
            deletedAt: null,
        })
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async claimUsername(userId, username, session) {
        const doc = await this.model.findOneAndUpdate({ _id: userId, deletedAt: null, $or: [{ username: null }, { username: '' }] }, { $set: { username } }, { returnDocument: 'after', session: session ?? null }).exec();
        return doc ? this.toDomain(doc) : null;
    }
    async restore(userId, updatedById, session) {
        const deleted = await this.model
            .findOne({ _id: userId, deletedAt: { $ne: null } })
            .session(session ?? null)
            .exec();
        if (!deleted)
            return false;
        for (let attempt = 0; attempt < 5; attempt++) {
            const owner = deleted.username ? await this.findByUsername(deleted.username, session) : null;
            const username = deleted.username && !owner
                ? deleted.username
                : await generateUsername(deleted.email, async (candidate) => Boolean(await this.findByUsername(candidate, session)));
            try {
                const result = await this.model.updateOne({ _id: userId, deletedAt: { $ne: null } }, { $set: { deletedAt: null, username, ...(updatedById ? { updatedById } : {}) } }, session ? { session } : {}).exec();
                return result.modifiedCount > 0;
            }
            catch (error) {
                if (!isUsernameDuplicateKeyError(error) || session?.inTransaction())
                    throw error;
            }
        }
        throw new Error('Không thể khôi phục đường dẫn hồ sơ duy nhất');
    }
    async findByProvider(provider, providerId, session) {
        const doc = await this.model
            .findOne({
            provider,
            providerId,
            deletedAt: null,
        })
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async findByGoogleSub(googleSub, session) {
        const doc = await this.model
            .findOne({
            googleSub: googleSub.trim(),
            deletedAt: null,
        })
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async findByVerificationToken(token, session) {
        const doc = await this.model
            .findOne({
            emailVerificationToken: token.trim(),
            deletedAt: null,
        })
            .select('+emailVerificationToken +emailVerificationExpires')
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async findByEmailForPasswordReset(email, session) {
        const doc = await this.model
            .findOne({
            email: email.toLowerCase().trim(),
            deletedAt: null,
        })
            .select('+passwordHash +passwordResetTokenHash +passwordResetExpires +passwordResetRequestedAt')
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async findByPasswordResetTokenHash(tokenHash, session) {
        const doc = await this.model
            .findOne({
            passwordResetTokenHash: tokenHash.trim(),
            deletedAt: null,
        })
            .select('+passwordHash +passwordResetTokenHash +passwordResetExpires +passwordResetRequestedAt')
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async claimPasswordResetRequest(userId, tokenHash, expiresAt, requestedAt, cooldownCutoff, session) {
        const doc = await this.model
            .findOneAndUpdate({
            _id: new Types.ObjectId(userId),
            deletedAt: null,
            status: UserStatusEnum.ACTIVE,
            isEmailVerified: true,
            $and: [
                {
                    $or: [
                        { passwordHash: { $type: 'string', $ne: '' } },
                        { googleSub: { $type: 'string', $regex: /\S/ } },
                    ],
                },
                {
                    $or: [
                        { passwordResetRequestedAt: null },
                        { passwordResetRequestedAt: { $lt: cooldownCutoff } },
                    ],
                },
            ],
        }, {
            $set: {
                passwordResetTokenHash: tokenHash,
                passwordResetExpires: expiresAt,
                passwordResetRequestedAt: requestedAt,
            },
        }, { new: true, session: session ?? null })
            .select('+passwordHash +passwordResetTokenHash +passwordResetExpires +passwordResetRequestedAt')
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async clearPasswordResetRequest(userId, tokenHash, session) {
        await this.model
            .updateOne({
            _id: new Types.ObjectId(userId),
            passwordResetTokenHash: tokenHash,
            deletedAt: null,
        }, {
            $set: {
                passwordResetTokenHash: null,
                passwordResetExpires: null,
                passwordResetRequestedAt: null,
            },
        }, session ? { session } : undefined)
            .exec();
    }
    async consumePasswordResetToken(userId, tokenHash, passwordHash, now, session) {
        const doc = await this.model
            .findOneAndUpdate({
            _id: new Types.ObjectId(userId),
            passwordResetTokenHash: tokenHash,
            passwordResetExpires: { $gt: now },
            deletedAt: null,
            status: UserStatusEnum.ACTIVE,
            isEmailVerified: true,
        }, {
            $set: {
                passwordHash,
                passwordResetTokenHash: null,
                passwordResetExpires: null,
                passwordResetRequestedAt: null,
            },
        }, { new: true, session: session ?? null })
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async findByEmailChangeTokenHash(tokenHash, session) {
        const doc = await this.model
            .findOne({
            emailChangeTokenHash: tokenHash.trim(),
            deletedAt: null,
        })
            .select('+passwordHash +emailChangeTokenHash +emailChangeExpires +emailChangeRequestedAt +pendingNewEmail')
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async claimEmailChangeRequest(userId, pendingNewEmail, tokenHash, expiresAt, requestedAt, session) {
        const doc = await this.model
            .findOneAndUpdate({
            _id: new Types.ObjectId(userId),
            deletedAt: null,
            status: UserStatusEnum.ACTIVE,
        }, {
            $set: {
                pendingNewEmail: pendingNewEmail.toLowerCase().trim(),
                emailChangeTokenHash: tokenHash,
                emailChangeExpires: expiresAt,
                emailChangeRequestedAt: requestedAt,
            },
        }, { new: true, session: session ?? null })
            .select('+passwordHash +emailChangeTokenHash +emailChangeExpires +emailChangeRequestedAt +pendingNewEmail')
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async clearEmailChangeRequest(userId, tokenHash, session) {
        await this.model
            .updateOne({
            _id: new Types.ObjectId(userId),
            emailChangeTokenHash: tokenHash,
            deletedAt: null,
        }, {
            $set: {
                pendingNewEmail: null,
                emailChangeTokenHash: null,
                emailChangeExpires: null,
                emailChangeRequestedAt: null,
            },
        }, session ? { session } : undefined)
            .exec();
    }
    async applyEmailChange(userId, tokenHash, newEmail, now, session) {
        const doc = await this.model
            .findOneAndUpdate({
            _id: new Types.ObjectId(userId),
            emailChangeTokenHash: tokenHash,
            emailChangeExpires: { $gt: now },
            deletedAt: null,
            status: UserStatusEnum.ACTIVE,
        }, {
            $set: {
                email: newEmail.toLowerCase().trim(),
                isEmailVerified: true,
                pendingNewEmail: null,
                emailChangeTokenHash: null,
                emailChangeExpires: null,
                emailChangeRequestedAt: null,
            },
        }, { new: true, session: session ?? null })
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async findUsersWithPagination(queryDto, session) {
        const filterQuery = {
            deletedAt: null,
        };
        const searchText = queryDto.search?.trim() || queryDto.filters?.search?.trim();
        if (searchText) {
            const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filterQuery.$or = [
                { fullName: { $regex: escaped, $options: 'i' } },
                { email: { $regex: escaped, $options: 'i' } },
            ];
        }
        const role = queryDto.role || queryDto.filters?.role;
        if (role) {
            filterQuery.role = role;
        }
        const status = queryDto.status || queryDto.filters?.status;
        if (status) {
            filterQuery.status = status;
        }
        if (queryDto.filters) {
            for (const [key, val] of Object.entries(queryDto.filters)) {
                if (!['search', 'role', 'status'].includes(key) && val !== undefined) {
                    filterQuery[key] = val;
                }
            }
        }
        const options = {
            page: queryDto.page || 1,
            limit: queryDto.limit || 10,
            isPagination: queryDto.isPagination,
            sort: queryDto.sort,
            filters: filterQuery,
        };
        return this.findManyWithPagination(options, session);
    }
    async updateCommissionRate(userId, rate, adminId, session) {
        const doc = await this.model
            .findOneAndUpdate({ _id: new Types.ObjectId(userId), deletedAt: null }, {
            $set: {
                commissionRate: rate,
                commissionRateUpdatedAt: new Date(),
                commissionRateUpdatedById: new Types.ObjectId(adminId),
            },
        }, { returnDocument: 'after', session: session ?? null })
            .lean()
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async updateAllInstructorsCommissionRate(newRate, adminId, session) {
        const result = await this.model
            .updateMany({ role: RoleEnum.INSTRUCTOR, deletedAt: null }, {
            $set: {
                commissionRate: newRate,
                commissionRateUpdatedAt: new Date(),
                commissionRateUpdatedById: new Types.ObjectId(adminId),
            },
        }, session ? { session } : {})
            .exec();
        return result.modifiedCount;
    }
};
UserRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(UserEntity.name)),
    __metadata("design:paramtypes", [Model])
], UserRepository);
export { UserRepository };
//# sourceMappingURL=user.repository.js.map