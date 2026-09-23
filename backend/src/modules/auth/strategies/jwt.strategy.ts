import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { IJwtPayload, IUserProfile, UserStatusEnum } from 'share-lib';
import { UserService } from '../../user/services/user.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'default_secret_key_min_32_chars',
    });
  }

  async validate(payload: IJwtPayload): Promise<IUserProfile> {
    const user = await this.userService.findById(payload.sub);
    if (!user || user.status !== UserStatusEnum.ACTIVE) {
      throw new UnauthorizedException('User account is invalid or deactivated');
    }

    return this.userService.toUserProfile(user);
  }
}
