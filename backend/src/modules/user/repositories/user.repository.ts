import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
import { IUser, AuthProviderEnum, RoleEnum, UserStatusEnum } from 'share-lib';
import { BaseMongoRepository, PaginationOptions, PaginationResult } from '../../base/index.js';
import { UserEntity } from '../schemas/user.schema.js';
import { QueryUsersDto } from '../dto/query-users.dto.js';
import { generateUsername, isUsernameDuplicateKeyError } from '../utils/username.util.js';

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

  async claimUsername(
    userId: string,
    username: string,
    session?: ClientSession,
  ): Promise<IUser | null> {
    const doc = await this.model.findOneAndUpdate(
      { _id: userId, deletedAt: null, $or: [{ username: null }, { username: '' }] },
      { $set: { username } },
      { returnDocument: 'after', session: session ?? null },
    ).exec();
    return doc ? this.toDomain(doc) : null;
  }

  override async restore(
    userId: string,
    updatedById?: string,
    session?: ClientSession,
  ): Promise<boolean> {
    const deleted = await this.model
      .findOne({ _id: userId, deletedAt: { $ne: null } })
      .session(session ?? null)
      .exec();
    if (!deleted) return false;

    for (let attempt = 0; attempt < 5; attempt++) {
      const owner = deleted.username ? await this.findByUsername(deleted.username, session) : null;
      const username = deleted.username && !owner
        ? deleted.username
        : await generateUsername(deleted.email, async (candidate) =>
          Boolean(await this.findByUsername(candidate, session)));
      try {
        const result = await this.model.updateOne(
          { _id: userId, deletedAt: { $ne: null } },
          { $set: { deletedAt: null, username, ...(updatedById ? { updatedById } : {}) } },
          session ? { session } : {},
        ).exec();
        return result.modifiedCount > 0;
      } catch (error) {
        if (!isUsernameDuplicateKeyError(error) || session?.inTransaction()) throw error;
      }
    }
    throw new Error('Không thể khôi phục đường dẫn hồ sơ duy nhất');
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

  /**
   * Tìm người dùng theo hash của mã xác nhận thay đổi email.
   */
  async findByEmailChangeTokenHash(
    tokenHash: string,
    session?: ClientSession,
  ): Promise<IUser | null> {
    const doc = await this.model
      .findOne({
        emailChangeTokenHash: tokenHash.trim(),
        deletedAt: null,
      })
      .select(
        '+passwordHash +emailChangeTokenHash +emailChangeExpires +emailChangeRequestedAt +pendingNewEmail',
      )
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Ghi nhận yêu cầu đổi email vào tài khoản người dùng, lưu email mới chờ duyệt và mã hash token.
   */
  async claimEmailChangeRequest(
    userId: string,
    pendingNewEmail: string,
    tokenHash: string,
    expiresAt: Date,
    requestedAt: Date,
    session?: ClientSession,
  ): Promise<IUser | null> {
    const doc = await this.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(userId),
          deletedAt: null,
          status: UserStatusEnum.ACTIVE,
        },
        {
          $set: {
            pendingNewEmail: pendingNewEmail.toLowerCase().trim(),
            emailChangeTokenHash: tokenHash,
            emailChangeExpires: expiresAt,
            emailChangeRequestedAt: requestedAt,
          },
        },
        { new: true, session: session ?? null },
      )
      .select(
        '+passwordHash +emailChangeTokenHash +emailChangeExpires +emailChangeRequestedAt +pendingNewEmail',
      )
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Hủy token đổi email khi gửi mail thất bại.
   */
  async clearEmailChangeRequest(
    userId: string,
    tokenHash: string,
    session?: ClientSession,
  ): Promise<void> {
    await this.model
      .updateOne(
        {
          _id: new Types.ObjectId(userId),
          emailChangeTokenHash: tokenHash,
          deletedAt: null,
        },
        {
          $set: {
            pendingNewEmail: null,
            emailChangeTokenHash: null,
            emailChangeExpires: null,
            emailChangeRequestedAt: null,
          },
        },
        session ? { session } : undefined,
      )
      .exec();
  }

  /**
   * Cập nhật email chính thức và hủy hiệu lực token đổi email nguyên tử.
   */
  async applyEmailChange(
    userId: string,
    tokenHash: string,
    newEmail: string,
    now: Date,
    session?: ClientSession,
  ): Promise<IUser | null> {
    const doc = await this.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(userId),
          emailChangeTokenHash: tokenHash,
          emailChangeExpires: { $gt: now },
          deletedAt: null,
          status: UserStatusEnum.ACTIVE,
        },
        {
          $set: {
            email: newEmail.toLowerCase().trim(),
            isEmailVerified: true,
            pendingNewEmail: null,
            emailChangeTokenHash: null,
            emailChangeExpires: null,
            emailChangeRequestedAt: null,
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

  async updateCommissionRate(
    userId: string,
    rate: number,
    adminId: string,
    session?: ClientSession,
  ): Promise<IUser | null> {
    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(userId), deletedAt: null },
        {
          $set: {
            commissionRate: rate,
            commissionRateUpdatedAt: new Date(),
            commissionRateUpdatedById: new Types.ObjectId(adminId),
          },
        },
        { returnDocument: 'after', session: session ?? null },
      )
      .lean()
      .exec();
    return doc ? this.toDomain(doc) : null;
  }

  async updateAllInstructorsCommissionRate(
    newRate: number,
    adminId: string,
    session?: ClientSession,
  ): Promise<number> {
    const result = await this.model
      .updateMany(
        { role: RoleEnum.INSTRUCTOR, deletedAt: null },
        {
          $set: {
            commissionRate: newRate,
            commissionRateUpdatedAt: new Date(),
            commissionRateUpdatedById: new Types.ObjectId(adminId),
          },
        },
        session ? { session } : {},
      )
      .exec();
    return result.modifiedCount;
  }
}
