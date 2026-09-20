import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  IAuthResponse,
  IAuthTokens,
  IUserProfile,
  RoleEnum,
  AuthProviderEnum,
  UserStatusEnum,
  IUser,
} from 'share-lib';
import { UserService } from '../../user/services/user.service.js';
import { SessionService } from '../../session/services/session.service.js';
import { LocalAuthService } from './local-auth.service.js';
import { AuthTokenService } from './auth-token.service.js';
import { RegisterDto } from '../dto/register.dto.js';
import { LoginDto } from '../dto/login.dto.js';
import { RefreshTokenDto } from '../dto/refresh-token.dto.js';

export interface IOAuthProfile {
  provider: AuthProviderEnum;
  providerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly localAuthService: LocalAuthService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  private mapToProfile(user: IUser): IUserProfile {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      provider: user.provider,
    };
  }

  async register(dto: RegisterDto): Promise<IAuthResponse> {
    await this.userService.ensureEmailNotTaken(dto.email);

    const hashedPassword = await this.localAuthService.hashPassword(dto.password);

    const newUser = await this.userService.create({
      email: dto.email.toLowerCase().trim(),
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: RoleEnum.USER,
      provider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.ACTIVE,
    });

    const userProfile = this.mapToProfile(newUser);
    const tokens = await this.authTokenService.generateTokens(userProfile);
    const refreshTokenHash = this.authTokenService.hashToken(tokens.refreshToken);

    await this.sessionService.createOrUpdateSession(
      newUser.id,
      refreshTokenHash,
      this.authTokenService.getRefreshTokenExpiryDate(),
    );

    return {
      user: userProfile,
      tokens,
    };
  }

  async login(dto: LoginDto): Promise<IAuthResponse> {
    const user = await this.localAuthService.validateUser(dto.email, dto.password);
    const userProfile = this.mapToProfile(user);
    const tokens = await this.authTokenService.generateTokens(userProfile);
    const refreshTokenHash = this.authTokenService.hashToken(tokens.refreshToken);

    await this.sessionService.createOrUpdateSession(
      user.id,
      refreshTokenHash,
      this.authTokenService.getRefreshTokenExpiryDate(),
    );

    return {
      user: userProfile,
      tokens,
    };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<IAuthTokens> {
    const payload = await this.authTokenService.verifyRefreshToken(dto.refreshToken);

    const user = await this.userService.findById(payload.sub);
    if (!user || user.status !== UserStatusEnum.ACTIVE) {
      throw new UnauthorizedException('User account is invalid or deactivated');
    }

    const userProfile = this.mapToProfile(user);
    const incomingHash = this.authTokenService.hashToken(dto.refreshToken);
    const newTokens = await this.authTokenService.generateTokens(userProfile);
    const newHash = this.authTokenService.hashToken(newTokens.refreshToken);

    await this.sessionService.validateAndRotateSession(
      user.id,
      incomingHash,
      newHash,
      this.authTokenService.getRefreshTokenExpiryDate(),
    );

    return newTokens;
  }

  async logout(userId: string): Promise<boolean> {
    return this.sessionService.revokeAllUserSessions(userId);
  }

  async getMe(userId: string): Promise<IUserProfile> {
    const user = await this.userService.findById(userId);
    if (!user || user.status !== UserStatusEnum.ACTIVE) {
      throw new UnauthorizedException('User not found or inactive');
    }
    return this.mapToProfile(user);
  }

  /**
   * Extensible hook for third-party OAuth providers (Google, GitHub, etc.)
   */
  async validateOAuthLogin(oauthProfile: IOAuthProfile): Promise<IAuthResponse> {
    let user = await this.userService.findByProvider(
      oauthProfile.provider,
      oauthProfile.providerId,
    );

    if (!user) {
      const existingEmailUser = await this.userService.findByEmail(oauthProfile.email);
      if (existingEmailUser) {
        user = (await this.userService.update(existingEmailUser.id, {
          provider: oauthProfile.provider,
          providerId: oauthProfile.providerId,
          avatar: oauthProfile.avatar ?? existingEmailUser.avatar,
        })) as IUser;
      } else {
        user = await this.userService.create({
          email: oauthProfile.email.toLowerCase().trim(),
          firstName: oauthProfile.firstName,
          lastName: oauthProfile.lastName,
          avatar: oauthProfile.avatar,
          role: RoleEnum.USER,
          provider: oauthProfile.provider,
          providerId: oauthProfile.providerId,
          status: UserStatusEnum.ACTIVE,
        });
      }
    }

    if (user.status !== UserStatusEnum.ACTIVE) {
      throw new UnauthorizedException('User account is deactivated');
    }

    const userProfile = this.mapToProfile(user);
    const tokens = await this.authTokenService.generateTokens(userProfile);
    const refreshTokenHash = this.authTokenService.hashToken(tokens.refreshToken);

    await this.sessionService.createOrUpdateSession(
      user.id,
      refreshTokenHash,
      this.authTokenService.getRefreshTokenExpiryDate(),
    );

    return {
      user: userProfile,
      tokens,
    };
  }
}
