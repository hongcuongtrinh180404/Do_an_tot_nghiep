import { Injectable, ConflictException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import { IUser, AuthProviderEnum } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { UserRepository } from '../repositories/user.repository.js';

@Injectable()
export class UserService extends BaseService<IUser, string> {
  constructor(
    protected readonly userRepository: UserRepository,
    cls: ClsService,
  ) {
    super(userRepository, cls, UserService.name);
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

  async ensureEmailNotTaken(email: string, session?: ClientSession): Promise<void> {
    const existing = await this.findByEmail(email, false, session);
    if (existing) {
      throw new ConflictException(`Email '${email}' is already registered`);
    }
  }
}
