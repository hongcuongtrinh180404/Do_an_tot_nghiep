import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
import { IUser, AuthProviderEnum, RoleEnum, UserStatusEnum } from 'share-lib';
import { BaseMongoRepository, PaginationOptions, PaginationResult } from '../../base/index.js';
import { UserEntity } from '../schemas/user.schema.js';
import { QueryUsersDto } from '../dto/query-users.dto.js';

@Injectable()
export class UserRepository extends BaseMongoRepository<IUser, UserEntity> {
  constructor(
    @InjectModel(UserEntity.name)
    userModel: Model<UserEntity>,
  ) {
    super(userModel);
  }

  async findByEmail(
    email: string,
    includePassword = false,
    session?: ClientSession,
  ): Promise<IUser | null> {
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

  async findByUsername(
    username: string,
    session?: ClientSession,
  ): Promise<IUser | null> {
    const doc = await this.model
      .findOne({
        username: username.toLowerCase().trim(),
        deletedAt: null,
      })
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async findByProvider(
    provider: AuthProviderEnum,
    providerId: string,
    session?: ClientSession,
  ): Promise<IUser | null> {
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

  async findByGoogleSub(
    googleSub: string,
    session?: ClientSession,
  ): Promise<IUser | null> {
    const doc = await this.model
      .findOne({
        googleSub: googleSub.trim(),
        deletedAt: null,
      })
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async findByVerificationToken(
    token: string,
    session?: ClientSession,
  ): Promise<IUser | null> {
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

  async findByEmailForPasswordReset(
    email: string,
    session?: ClientSession,
  ): Promise<IUser | null> {
    const doc = await this.model
      .findOne({
        email: email.toLowerCase().trim(),
        deletedAt: null,
      })
      .select(
        '+passwordHash +passwordResetTokenHash +passwordResetExpires +passwordResetRequestedAt',
      )
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async findByPasswordResetTokenHash(
    tokenHash: string,
    session?: ClientSession,
  ): Promise<IUser | null> {
    const doc = await this.model
      .findOne({
        passwordResetTokenHash: tokenHash.trim(),
        deletedAt: null,
      })
      .select(
        '+passwordHash +passwordResetTokenHash +passwordResetExpires +passwordResetRequestedAt',
      )
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Atomically claims a password reset request slot.
   * Returns null when the account is ineligible or still inside the cooldown
   * window, which prevents concurrent requests from sending duplicate emails.
   */
  async claimPasswordResetRequest(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    requestedAt: Date,
    cooldownCutoff: Date,
    session?: ClientSession,
  ): Promise<IUser | null> {
    const doc = await this.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(userId),
          deletedAt: null,
          status: UserStatusEnum.ACTIVE,
          isEmailVerified: true,
          // Eligibility and cooldown must both hold, including Google-only users.
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
        },
        {
          $set: {
            passwordResetTokenHash: tokenHash,
            passwordResetExpires: expiresAt,
            passwordResetRequestedAt: requestedAt,
          },
        },
        { new: true, session: session ?? null },
      )
      .select(
        '+passwordHash +passwordResetTokenHash +passwordResetExpires +passwordResetRequestedAt',
      )
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Rolls back a reset request after an email delivery failure.
   * The token hash guard avoids clearing a newer request created meanwhile.
   */
  async clearPasswordResetRequest(
    userId: string,
    tokenHash: string,
    session?: ClientSession,
  ): Promise<void> {
    await this.model
      .updateOne(
        {
          _id: new Types.ObjectId(userId),
          passwordResetTokenHash: tokenHash,
          deletedAt: null,
        },
        {
          $set: {
            passwordResetTokenHash: null,
            passwordResetExpires: null,
            passwordResetRequestedAt: null,
          },
        },
        session ? { session } : undefined,
      )
      .exec();
  }

  /**
   * Atomically consumes a reset token. The filter requires the hash to still
   * match, the token to be unexpired and the account to remain active, so a
   * token can only ever be used once.
   */
  async consumePasswordResetToken(
    userId: string,
    tokenHash: string,
    passwordHash: string,
    now: Date,
    session?: ClientSession,
  ): Promise<IUser | null> {
    const doc = await this.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(userId),
          passwordResetTokenHash: tokenHash,
          passwordResetExpires: { $gt: now },
          deletedAt: null,
          status: UserStatusEnum.ACTIVE,
          isEmailVerified: true,
        },
        {
          $set: {
            passwordHash,
            passwordResetTokenHash: null,
            passwordResetExpires: null,
            passwordResetRequestedAt: null,
          },
        },
        { new: true, session: session ?? null },
      )
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async findUsersWithPagination(
    queryDto: QueryUsersDto,
    session?: ClientSession,
  ): Promise<PaginationResult<IUser>> {
    const filterQuery: Record<string, unknown> = {
      deletedAt: null,
    };

    const searchText = queryDto.search?.trim() || (queryDto.filters?.search as string)?.trim();
    if (searchText) {
      const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filterQuery.$or = [
        { fullName: { $regex: escaped, $options: 'i' } },
        { email: { $regex: escaped, $options: 'i' } },
        { username: { $regex: escaped, $options: 'i' } },
      ];
    }

    const role = queryDto.role || (queryDto.filters?.role as RoleEnum);
    if (role) {
      filterQuery.role = role;
    }

    const status = queryDto.status || (queryDto.filters?.status as UserStatusEnum);
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

    const options: PaginationOptions = {
      page: queryDto.page || 1,
      limit: queryDto.limit || 10,
      isPagination: queryDto.isPagination,
      sort: queryDto.sort,
      filters: filterQuery,
    };

    return this.findManyWithPagination(options, session);
  }
}
