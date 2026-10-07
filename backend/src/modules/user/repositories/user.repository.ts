import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
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
