import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import {
  IAuthResponse,
  IAuthTokens,
  IUserProfile,
  IRegisterResponse,
  RoleEnum,
  AuthProviderEnum,
  UserStatusEnum,
  IUser,
} from 'share-lib';
import { UserService } from '../../user/services/user.service.js';
import { SessionService } from '../../session/services/session.service.js';
import { MailService } from '../../mail/mail.service.js';
import { LocalAuthService } from './local-auth.service.js';
import { AuthTokenService } from './auth-token.service.js';
import { RegisterDto } from '../dto/register.dto.js';
import { LoginDto } from '../dto/login.dto.js';
import { RefreshTokenDto } from '../dto/refresh-token.dto.js';
import { GoogleAuthDto } from '../dto/google-auth.dto.js';
import { VerifyEmailDto } from '../dto/verify-email.dto.js';
import { ResendVerificationDto } from '../dto/resend-verification.dto.js';

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
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly localAuthService: LocalAuthService,
    private readonly authTokenService: AuthTokenService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {
    this.googleClient = new OAuth2Client();
  }

  private mapToProfile(user: IUser): IUserProfile {
    const fallbackFullName =
      user.fullName ||
      (user.firstName || user.lastName
        ? `${user.lastName || ''} ${user.firstName || ''}`.trim()
        : user.email.split('@')[0]);

    return {
      id: user.id,
      email: user.email,
      fullName: fallbackFullName,
      username: user.username ?? null,
      avatarUrl: user.avatarUrl || user.avatar || null,
      bio: user.bio ?? null,
      role: user.role,
      status: user.status,
      googleSub: user.googleSub ?? null,
      isEmailVerified: !!user.isEmailVerified,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatarUrl || user.avatar || null,
      provider: user.provider,
    };
  }

  async register(dto: RegisterDto): Promise<IRegisterResponse> {
    await this.userService.ensureEmailNotTaken(dto.email);
    if (dto.username) {
      await this.userService.ensureUsernameNotTaken(dto.username);
    }

    const hashedPassword = await this.localAuthService.hashPassword(dto.password);
    const fullName =
      dto.fullName ||
      (dto.firstName || dto.lastName
        ? `${dto.lastName || ''} ${dto.firstName || ''}`.trim()
        : dto.email.split('@')[0]);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newUser = await this.userService.create({
      email: dto.email.toLowerCase().trim(),
      passwordHash: hashedPassword,
      password: hashedPassword,
      fullName,
      username: dto.username || null,
      role: RoleEnum.STUDENT,
      provider: AuthProviderEnum.LOCAL,
      status: UserStatusEnum.INACTIVE,
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    const emailSent = await this.mailService.sendVerificationEmail(
      newUser.email,
      fullName,
      verificationToken,
    );

    return {
      user: this.mapToProfile(newUser),
      message: 'Đăng ký tài khoản thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.',
      emailSent,
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

    const rotation = await this.sessionService.validateAndRotateSession(
      user.id,
      incomingHash,
      newHash,
      this.authTokenService.getRefreshTokenExpiryDate(),
    );

    // Another tab already rotated the refresh token within the grace window.
    // Keep that token (the caller's incoming token is only valid for the grace
    // period) and issue a fresh access token so this request can continue.
    if (rotation.isReusedGrace) {
      return {
        accessToken: newTokens.accessToken,
        refreshToken: dto.refreshToken,
        expiresIn: newTokens.expiresIn,
      };
    }

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
        const dummyHash = await this.localAuthService.hashPassword(
          Math.random().toString(36).substring(2) + Date.now().toString(36),
        );
        const fullName =
          `${oauthProfile.lastName || ''} ${oauthProfile.firstName || ''}`.trim() ||
          oauthProfile.email.split('@')[0];

        user = await this.userService.create({
          email: oauthProfile.email.toLowerCase().trim(),
          passwordHash: dummyHash,
          password: dummyHash,
          fullName,
          avatarUrl: oauthProfile.avatar,
          avatar: oauthProfile.avatar,
          role: RoleEnum.STUDENT,
          provider: oauthProfile.provider,
          providerId: oauthProfile.providerId,
          status: UserStatusEnum.ACTIVE,
          firstName: oauthProfile.firstName,
          lastName: oauthProfile.lastName,
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

  /**
   * Xác thực và đăng nhập qua Google OAuth (ID Token verification)
   */
  async loginWithGoogle(dto: GoogleAuthDto): Promise<IAuthResponse> {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!googleClientId) {
      throw new UnauthorizedException('GOOGLE_CLIENT_ID chưa được cấu hình trên server');
    }

    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: googleClientId,
      });
      payload = ticket.getPayload();
    } catch (error) {
      throw new UnauthorizedException(
        `Xác thực Google ID Token không hợp lệ: ${error instanceof Error ? error.message : 'Token không hợp lệ'}`,
      );
    }

    if (!payload || !payload.sub || !payload.email) {
      throw new UnauthorizedException('Thông tin người dùng từ Google ID Token không đầy đủ');
    }

    if (!payload.email_verified) {
      throw new BadRequestException('Email Google chưa được xác minh bởi Google');
    }

    const email = payload.email.toLowerCase().trim();
    const googleSub = payload.sub.trim();

    // 1. Tìm user theo googleSub (Đã từng liên kết hoặc đăng nhập Google trước đó)
    let user = await this.userService.findByGoogleSub(googleSub);

    if (!user) {
      // 2. Nếu chưa liên kết googleSub, kiểm tra theo email
      const existingUser = await this.userService.findByEmail(email);

      if (existingUser) {
        // Safe Account Linking (Lựa chọn B): Tự động liên kết vì Google đã chứng minh email_verified === true
        const updateData: Partial<IUser> = {
          googleSub,
          provider: AuthProviderEnum.GOOGLE,
          providerId: googleSub,
          isEmailVerified: true,
        };

        if (existingUser.status === UserStatusEnum.INACTIVE) {
          updateData.status = UserStatusEnum.ACTIVE;
        }

        if (!existingUser.avatarUrl && payload.picture) {
          updateData.avatarUrl = payload.picture;
          updateData.avatar = payload.picture;
        }

        user = (await this.userService.updateOrFail(existingUser.id, updateData)) as IUser;
      } else {
        // 3. Tạo tài khoản mới cho người dùng
        const fullName = payload.name?.trim() || email.split('@')[0];

        user = await this.userService.create({
          email,
          fullName,
          googleSub,
          avatarUrl: payload.picture || null,
          avatar: payload.picture || null,
          role: RoleEnum.STUDENT,
          status: UserStatusEnum.ACTIVE,
          isEmailVerified: true,
          provider: AuthProviderEnum.GOOGLE,
          providerId: googleSub,
          passwordHash: null,
        });
      }
    }

    // 4. Kiểm tra trạng thái tài khoản
    if (user.status !== UserStatusEnum.ACTIVE) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị vô hiệu hóa hoặc khóa');
    }

    // 5. Cấp phát phiên làm việc (Tokens & Session)
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

  /**
   * Kích hoạt tài khoản bằng mã token từ email
   */
  async verifyEmail(dto: VerifyEmailDto): Promise<IAuthResponse> {
    const user = await this.userService.findByVerificationToken(dto.token);

    if (!user) {
      throw new BadRequestException('Mã xác thực không hợp lệ hoặc đã được sử dụng.');
    }

    if (user.emailVerificationExpires && new Date() > new Date(user.emailVerificationExpires)) {
      throw new BadRequestException(
        'Mã xác thực đã hết hạn. Vui lòng yêu cầu gửi lại email xác thực.',
      );
    }

    const updatedUser = (await this.userService.updateOrFail(user.id, {
      isEmailVerified: true,
      status: UserStatusEnum.ACTIVE,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    })) as IUser;

    const userProfile = this.mapToProfile(updatedUser);
    const tokens = await this.authTokenService.generateTokens(userProfile);
    const refreshTokenHash = this.authTokenService.hashToken(tokens.refreshToken);

    await this.sessionService.createOrUpdateSession(
      updatedUser.id,
      refreshTokenHash,
      this.authTokenService.getRefreshTokenExpiryDate(),
    );

    return {
      user: userProfile,
      tokens,
    };
  }

  /**
   * Gửi lại email xác thực kích hoạt tài khoản
   */
  async resendVerification(
    dto: ResendVerificationDto,
  ): Promise<{ sent: boolean; message: string }> {
    const user = await this.userService.findByEmail(dto.email);

    if (!user) {
      return {
        sent: true,
        message: 'Nếu tài khoản tồn tại trong hệ thống, liên kết xác thực đã được gửi lại.',
      };
    }

    if (user.isEmailVerified) {
      throw new BadRequestException(
        'Tài khoản này đã được xác thực trước đó. Bạn có thể đăng nhập ngay.',
      );
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.userService.updateOrFail(user.id, {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    const fullName = user.fullName || user.email.split('@')[0];
    const emailSent = await this.mailService.sendVerificationEmail(
      user.email,
      fullName,
      verificationToken,
    );

    return {
      sent: emailSent,
      message: 'Liên kết xác thực mới đã được gửi vào email của bạn.',
    };
  }
}

