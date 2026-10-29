import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
import { ISession } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { SessionEntity } from '../schemas/session.schema.js';

@Injectable()
export class SessionRepository extends BaseMongoRepository<ISession, SessionEntity> {
  constructor(
    @InjectModel(SessionEntity.name)
    sessionModel: Model<SessionEntity>,
  ) {
    super(sessionModel);
  }

  async findActiveByUserId(
    userId: string,
    session?: ClientSession,
  ): Promise<ISession | null> {
    const doc = await this.model
      .findOne({
        userId: new Types.ObjectId(userId),
        isRevoked: false,
        deletedAt: null,
      })
      .sort({ updatedAt: -1, createdAt: -1 })
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  /**
   * Atomically rotates the refresh token hash only when the incoming hash is
   * still the current one. This prevents two concurrent refresh requests from
   * both rotating the session and overwriting each other's hashes.
   */
  async rotateIfCurrent(
    userId: string,
    incomingHash: string,
    newHash: string,
    newExpiresAt: Date,
    session?: ClientSession,
  ): Promise<ISession | null> {
    const doc = await this.model
      .findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          refreshTokenHash: incomingHash,
          isRevoked: false,
          deletedAt: null,
        },
        {
          $set: {
            previousRefreshTokenHash: incomingHash,
            refreshTokenHash: newHash,
            hashRotatedAt: new Date(),
            expiresAt: newExpiresAt,
          },
        },
        { new: true, ...(session ? { session } : {}) },
      )
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async revokeAllByUserId(
    userId: string,
    session?: ClientSession,
  ): Promise<boolean> {
    const result = await this.model
      .updateMany(
        {
          userId: new Types.ObjectId(userId),
          isRevoked: false,
        },
        {
          $set: { isRevoked: true },
        },
        session ? { session } : {},
      )
      .exec();

    return result.modifiedCount > 0;
  }
}
