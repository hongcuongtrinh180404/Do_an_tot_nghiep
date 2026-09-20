import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IUser, UserStatusEnum } from 'share-lib';
import { UserService } from '../../user/services/user.service.js';

@Injectable()
export class LocalAuthService {
  private readonly saltRounds = 10;

  constructor(private readonly userService: UserService) {}

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async comparePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  async validateUser(email: string, plainPassword: string): Promise<IUser> {
    const user = await this.userService.findByEmail(email, true);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.password) {
      throw new UnauthorizedException('This account was registered using an external authentication provider');
    }

    const isMatch = await this.comparePassword(plainPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatusEnum.ACTIVE) {
      throw new UnauthorizedException('Account is not active or has been suspended');
    }

    return user;
  }
}
