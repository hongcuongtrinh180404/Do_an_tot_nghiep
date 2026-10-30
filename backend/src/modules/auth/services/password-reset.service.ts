import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  AUTH_CONSTANTS,
  IForgotPasswordResponse,
  IResetPasswordResponse,
  IUser,
  UserStatusEnum,
} from 'share-lib';
import { UserService } from '../../user/services/user.service.js';
import { SessionService } from '../../session/services/session.service.js';
import { MailService } from '../../mail/mail.service.js';
import { LocalAuthService } from './local-auth.service.js';
import { AuthTokenService } from './auth-token.service.js';
import { ForgotPasswordDto } from '../dto/forgot-password.dto.js';
import { ResetPasswordDto } from '../dto/reset-password.dto.js';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly mailService: MailService,
    private readonly localAuthService: LocalAuthService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  /**
   * Gửi liên kết đặt lại mật khẩu hoặc tạo mật khẩu đầu tiên cho tài khoản Google.
   *
   * Bảo mật: luôn trả về cùng một message cho mọi trạng thái tài khoản
   * (không tồn tại, bị khóa, chưa xác thực, chưa có phương thức đăng nhập, đang cooldown,
   * hoặc SMTP lỗi) để chống email enumeration.
   */
  async requestReset(dto: ForgotPasswordDto): Promise<IForgotPasswordResponse> {
    const genericResponse: IForgotPasswordResponse = {
      message: AUTH_CONSTANTS.PASSWORD_RESET_GENERIC_MESSAGE,
    };

    const user = await this.userService.findByEmailForPasswordReset(dto.email);
    if (!user || !this.isEligibleForPasswordReset(user)) {
      return genericResponse;
    }

    const now = Date.now();
    const requestedAt = new Date(now);
    const expiresAt = new Date(now + AUTH_CONSTANTS.PASSWORD_RESET_TOKEN_TTL_MS);
    const cooldownCutoff = new Date(now - AUTH_CONSTANTS.PASSWORD_RESET_COOLDOWN_MS);
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.authTokenService.hashToken(rawToken);

    // Claim nguyên tử: chỉ request thắng cuộc mới được ghi token và gửi mail.
    // Request thua (cooldown / race condition) vẫn nhận generic response.
    const claimedUser = await this.userService.claimPasswordResetRequest(
      user.id,
      tokenHash,
      expiresAt,
      requestedAt,
      cooldownCutoff,
    );

    if (!claimedUser) {
      return genericResponse;
    }

    const fullName = claimedUser.fullName || claimedUser.email.split('@')[0];
    const emailSent = await this.mailService.sendPasswordResetEmail(
      claimedUser.email,
      fullName,
      rawToken,
    );

    if (!emailSent) {
      // Rollback để người dùng có thể thử lại ngay. Không trả lỗi ra client
      // vì điều đó sẽ làm lộ việc email có tồn tại trong hệ thống hay không.
      await this.userService.clearPasswordResetRequest(claimedUser.id, tokenHash);
      this.logger.error(
        `Không thể gửi email đặt lại mật khẩu đến ${claimedUser.email}. Đã rollback token để cho phép thử lại.`,
      );
    }

    return genericResponse;
  }

  /**
   * Xác thực token và đặt mật khẩu mới.
   *
   * Token chỉ được consume khi người dùng submit form (không consume lúc mở
   * trang) để tránh email security scanner vô tình đốt token.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<IResetPasswordResponse> {
    const tokenHash = this.authTokenService.hashToken(dto.token.trim());
    const user = await this.userService.findByPasswordResetTokenHash(tokenHash);

    if (!user || !this.isResetTokenValid(user)) {
      throw new BadRequestException(
        AUTH_CONSTANTS.PASSWORD_RESET_INVALID_TOKEN_MESSAGE,
      );
    }

    const passwordHash = await this.localAuthService.hashPassword(dto.password);
    const now = new Date();

    await this.userService.runInTransaction(async (session) => {
      // Atomic consume: bảo đảm token chỉ dùng được một lần kể cả khi có
      // nhiều request đồng thời.
      const updated = await this.userService.consumePasswordResetToken(
        user.id,
        tokenHash,
        passwordHash,
        now,
        session,
      );

      if (!updated) {
        throw new BadRequestException(
          AUTH_CONSTANTS.PASSWORD_RESET_INVALID_TOKEN_MESSAGE,
        );
      }

      // Đổi mật khẩu phải thu hồi toàn bộ phiên đăng nhập cũ.
      await this.sessionService.revokeAllUserSessions(updated.id, session);
    });

    return { message: AUTH_CONSTANTS.PASSWORD_RESET_SUCCESS_MESSAGE };
  }

  private isEligibleForPasswordReset(user: IUser): boolean {
    const hasLocalPassword =
      typeof user.passwordHash === 'string' && user.passwordHash.length > 0;
    const hasGoogleAccount =
      typeof user.googleSub === 'string' && user.googleSub.trim().length > 0;

    return (
      user.status === UserStatusEnum.ACTIVE &&
      user.isEmailVerified === true &&
      (hasLocalPassword || hasGoogleAccount)
    );
  }

  private isResetTokenValid(user: IUser): boolean {
    if (!user.passwordResetExpires) {
      return false;
    }

    const expiresAt = new Date(user.passwordResetExpires).getTime();
    return Number.isFinite(expiresAt) && expiresAt > Date.now();
  }
}
