import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { IUser, AuthProviderEnum } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { UserEntity } from '../schemas/user.schema.js';

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
      query.select('+password');
    }

    const doc = await query.session(session ?? null).exec();
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
}
