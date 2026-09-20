import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { AUTH_CONSTANTS, IAuthTokens, IJwtPayload, IUserProfile } from 'share-lib';

@Injectable()
export class AuthTokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.accessSecret = configService.get<string>('JWT_SECRET') || 'default_secret_key_min_32_chars';
    this.refreshSecret = configService.get<string>('JWT_REFRESH_SECRET') || 'default_refresh_secret_key_min_32_chars';
    this.accessExpiresIn = configService.get<string>('JWT_EXPIRES_IN') || AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN;
    this.refreshExpiresIn = configService.get<string>('JWT_REFRESH_EXPIRES_IN') || AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRES_IN;
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async generateTokens(user: IUserProfile): Promise<IAuthTokens> {
    const payload: IJwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.accessSecret,
        expiresIn: this.accessExpiresIn as unknown as undefined, // Type cast for jwt sign options
      }),
      this.jwtService.signAsync(payload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshExpiresIn as unknown as undefined,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessExpiresIn,
    };
  }

  async verifyRefreshToken(refreshToken: string): Promise<IJwtPayload> {
    try {
      return await this.jwtService.verifyAsync<IJwtPayload>(refreshToken, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  getRefreshTokenExpiryDate(): Date {
    // 7 days expiration default
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
}
