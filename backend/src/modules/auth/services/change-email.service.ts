import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  AUTH_CONSTANTS,
  IChangeEmailRequestResponse,
  IVerifyEmailChangeResponse,
  UserStatusEnum,
} from 'share-lib';
import { UserService } from '../../user/services/user.service.js';
import { SessionService } from '../../session/services/session.service.js';
import { MailService } from '../../mail/mail.service.js';
import { LocalAuthService } from './local-auth.service.js';
import { AuthTokenService } from './auth-token.service.js';
import { ChangeEmailRequestDto } from '../dto/change-email.dto.js';
import { VerifyEmailChangeDto } from '../dto/verify-email-change.dto.js';

@Injectable()
export class ChangeEmailService {
  private readonly logger = new Logger(ChangeEmailService.name);

  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly mailService: MailService,
    private readonly localAuthService: LocalAuthService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  /**
   * Bước 1 & 2: Tiếp nhận yêu cầu đổi email, xác minh mật khẩu hiện tại,
   * kiểm tra email mới và gửi link xác nhận đến email mới.
   */
  async requestChangeEmail(
    userId: string,
    dto: ChangeEmailRequestDto,
  ): Promise<IChangeEmailRequestResponse> {
    const user = await this.userService.findById(userId);
    if (!user || user.status !== UserStatusEnum.ACTIVE || user.deletedAt) {
      throw new BadRequestException('Tài khoản không tồn tại hoặc đã bị khóa');
    }

    // 1. Kiểm tra mật khẩu hiện tại
    const userWithPassword = await this.userService.findByEmail(user.email, true);
    const passwordHash = userWithPassword?.passwordHash || userWithPassword?.password;

    if (!passwordHash) {
      throw new BadRequestException(
        AUTH_CONSTANTS.EMAIL_CHANGE_PASSWORD_NOT_SET_MESSAGE,
      );
    }

    const isPasswordValid = await this.localAuthService.comparePassword(
      dto.currentPassword,
      passwordHash,
    );

    if (!isPasswordValid) {
      throw new BadRequestException(
        AUTH_CONSTANTS.EMAIL_CHANGE_INVALID_PASSWORD_MESSAGE,
      );
    }

    // 2. Kiểm tra email mới khác email hiện tại
    const normalizedNewEmail = dto.newEmail.toLowerCase().trim();
    if (normalizedNewEmail === user.email.toLowerCase().trim()) {
      throw new BadRequestException(
        AUTH_CONSTANTS.EMAIL_CHANGE_SAME_EMAIL_MESSAGE,
      );
    }

    // 3. Kiểm tra email mới chưa được đăng ký trên Mindly
    const existingUser = await this.userService.findByEmail(normalizedNewEmail);
    if (existingUser) {
      throw new BadRequestException(
        AUTH_CONSTANTS.EMAIL_CHANGE_ALREADY_EXISTS_MESSAGE,
      );
    }

    // 4. Tạo token dùng 1 lần (TTL 15 phút)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + AUTH_CONSTANTS.EMAIL_CHANGE_TOKEN_TTL_MS);
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.authTokenService.hashToken(rawToken);

    // 5. Ghi nhận yêu cầu đổi email vào DB (ghi đè yêu cầu cũ nếu có)
    const claimedUser = await this.userService.claimEmailChangeRequest(
      user.id,
      normalizedNewEmail,
      tokenHash,
      expiresAt,
      now,
    );

    if (!claimedUser) {
      throw new BadRequestException('Không thể khởi tạo yêu cầu đổi email. Vui lòng thử lại.');
    }

    // 6. Gửi đường dẫn xác nhận tới email mới
    const fullName = user.fullName || user.email.split('@')[0];
    const emailSent = await this.mailService.sendChangeEmailVerification(
      normalizedNewEmail,
      fullName,
      rawToken,
    );

    if (!emailSent) {
      await this.userService.clearEmailChangeRequest(user.id, tokenHash);
      this.logger.error(
        `Không thể gửi email xác nhận đổi email tới ${normalizedNewEmail}. Đã hủy token để thử lại.`,
      );
    }

    return {
      message: AUTH_CONSTANTS.EMAIL_CHANGE_REQUEST_SUCCESS_MESSAGE,
    };
  }

  /**
   * Bước 3, 4 & 5: Xác minh token từ liên kết email, kiểm tra tính hợp lệ,
   * cập nhật email chính thức, thu hồi phiên đăng nhập cũ và gửi cảnh báo bảo mật.
   */
  async verifyEmailChange(
    dto: VerifyEmailChangeDto,
  ): Promise<IVerifyEmailChangeResponse> {
    const tokenHash = this.authTokenService.hashToken(dto.token.trim());
    const user = await this.userService.findByEmailChangeTokenHash(tokenHash);

    if (
      !user ||
      !user.emailChangeExpires ||
      new Date(user.emailChangeExpires) <= new Date() ||
      !user.pendingNewEmail ||
      user.status !== UserStatusEnum.ACTIVE ||
      user.deletedAt
    ) {
      throw new BadRequestException(
        AUTH_CONSTANTS.EMAIL_CHANGE_INVALID_TOKEN_MESSAGE,
      );
    }

    const newEmail = user.pendingNewEmail.toLowerCase().trim();
    const oldEmail = user.email;

    // Kiểm tra ca biên: Trong lúc chờ người dùng click, email mới đã bị người khác đăng ký
    const emailCollision = await this.userService.findByEmail(newEmail);
    if (emailCollision && emailCollision.id !== user.id) {
      await this.userService.clearEmailChangeRequest(user.id, tokenHash);
      throw new BadRequestException(
        AUTH_CONSTANTS.EMAIL_CHANGE_ALREADY_EXISTS_MESSAGE,
      );
    }

    // Cập nhật nguyên tử email mới vào tài khoản
    const updatedUser = await this.userService.applyEmailChange(
      user.id,
      tokenHash,
      newEmail,
      new Date(),
    );

    if (!updatedUser) {
      throw new BadRequestException(
        AUTH_CONSTANTS.EMAIL_CHANGE_INVALID_TOKEN_MESSAGE,
      );
    }

    // Hủy toàn bộ phiên làm việc của user để ép đăng nhập lại đồng bộ phiên
    try {
      await this.sessionService.revokeAllUserSessions(user.id);
    } catch (sessionError) {
      this.logger.warn(
        `Lỗi khi hủy session của user ${user.id}: ${sessionError instanceof Error ? sessionError.message : String(sessionError)}`,
      );
    }

    // Gửi email thông báo bảo mật đến email cũ
    const fullName = user.fullName || oldEmail.split('@')[0];
    await this.mailService.sendEmailChangeSecurityAlert(
      oldEmail,
      fullName,
      newEmail,
    );

    return {
      message: AUTH_CONSTANTS.EMAIL_CHANGE_SUCCESS_MESSAGE,
      email: newEmail,
    };
  }
}
