var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ChangeEmailService_1;
import { BadRequestException, Injectable, Logger, } from '@nestjs/common';
import * as crypto from 'crypto';
import { AUTH_CONSTANTS, UserStatusEnum, } from 'share-lib';
import { UserService } from '../../user/services/user.service.js';
import { SessionService } from '../../session/services/session.service.js';
import { MailService } from '../../mail/mail.service.js';
import { LocalAuthService } from './local-auth.service.js';
import { AuthTokenService } from './auth-token.service.js';
let ChangeEmailService = ChangeEmailService_1 = class ChangeEmailService {
    userService;
    sessionService;
    mailService;
    localAuthService;
    authTokenService;
    logger = new Logger(ChangeEmailService_1.name);
    constructor(userService, sessionService, mailService, localAuthService, authTokenService) {
        this.userService = userService;
        this.sessionService = sessionService;
        this.mailService = mailService;
        this.localAuthService = localAuthService;
        this.authTokenService = authTokenService;
    }
    async requestChangeEmail(userId, dto) {
        const user = await this.userService.findById(userId);
        if (!user || user.status !== UserStatusEnum.ACTIVE || user.deletedAt) {
            throw new BadRequestException('Tài khoản không tồn tại hoặc đã bị khóa');
        }
        const userWithPassword = await this.userService.findByEmail(user.email, true);
        const passwordHash = userWithPassword?.passwordHash || userWithPassword?.password;
        if (!passwordHash) {
            throw new BadRequestException(AUTH_CONSTANTS.EMAIL_CHANGE_PASSWORD_NOT_SET_MESSAGE);
        }
        const isPasswordValid = await this.localAuthService.comparePassword(dto.currentPassword, passwordHash);
        if (!isPasswordValid) {
            throw new BadRequestException(AUTH_CONSTANTS.EMAIL_CHANGE_INVALID_PASSWORD_MESSAGE);
        }
        const normalizedNewEmail = dto.newEmail.toLowerCase().trim();
        if (normalizedNewEmail === user.email.toLowerCase().trim()) {
            throw new BadRequestException(AUTH_CONSTANTS.EMAIL_CHANGE_SAME_EMAIL_MESSAGE);
        }
        const existingUser = await this.userService.findByEmail(normalizedNewEmail);
        if (existingUser) {
            throw new BadRequestException(AUTH_CONSTANTS.EMAIL_CHANGE_ALREADY_EXISTS_MESSAGE);
        }
        const now = new Date();
        const expiresAt = new Date(now.getTime() + AUTH_CONSTANTS.EMAIL_CHANGE_TOKEN_TTL_MS);
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = this.authTokenService.hashToken(rawToken);
        const claimedUser = await this.userService.claimEmailChangeRequest(user.id, normalizedNewEmail, tokenHash, expiresAt, now);
        if (!claimedUser) {
            throw new BadRequestException('Không thể khởi tạo yêu cầu đổi email. Vui lòng thử lại.');
        }
        const fullName = user.fullName || user.email.split('@')[0];
        const emailSent = await this.mailService.sendChangeEmailVerification(normalizedNewEmail, fullName, rawToken);
        if (!emailSent) {
            await this.userService.clearEmailChangeRequest(user.id, tokenHash);
            this.logger.error(`Không thể gửi email xác nhận đổi email tới ${normalizedNewEmail}. Đã hủy token để thử lại.`);
        }
        return {
            message: AUTH_CONSTANTS.EMAIL_CHANGE_REQUEST_SUCCESS_MESSAGE,
        };
    }
    async verifyEmailChange(dto) {
        const tokenHash = this.authTokenService.hashToken(dto.token.trim());
        const user = await this.userService.findByEmailChangeTokenHash(tokenHash);
        if (!user ||
            !user.emailChangeExpires ||
            new Date(user.emailChangeExpires) <= new Date() ||
            !user.pendingNewEmail ||
            user.status !== UserStatusEnum.ACTIVE ||
            user.deletedAt) {
            throw new BadRequestException(AUTH_CONSTANTS.EMAIL_CHANGE_INVALID_TOKEN_MESSAGE);
        }
        const newEmail = user.pendingNewEmail.toLowerCase().trim();
        const oldEmail = user.email;
        const emailCollision = await this.userService.findByEmail(newEmail);
        if (emailCollision && emailCollision.id !== user.id) {
            await this.userService.clearEmailChangeRequest(user.id, tokenHash);
            throw new BadRequestException(AUTH_CONSTANTS.EMAIL_CHANGE_ALREADY_EXISTS_MESSAGE);
        }
        const updatedUser = await this.userService.applyEmailChange(user.id, tokenHash, newEmail, new Date());
        if (!updatedUser) {
            throw new BadRequestException(AUTH_CONSTANTS.EMAIL_CHANGE_INVALID_TOKEN_MESSAGE);
        }
        try {
            await this.sessionService.revokeAllUserSessions(user.id);
        }
        catch (sessionError) {
            this.logger.warn(`Lỗi khi hủy session của user ${user.id}: ${sessionError instanceof Error ? sessionError.message : String(sessionError)}`);
        }
        const fullName = user.fullName || oldEmail.split('@')[0];
        await this.mailService.sendEmailChangeSecurityAlert(oldEmail, fullName, newEmail);
        return {
            message: AUTH_CONSTANTS.EMAIL_CHANGE_SUCCESS_MESSAGE,
            email: newEmail,
        };
    }
};
ChangeEmailService = ChangeEmailService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [UserService,
        SessionService,
        MailService,
        LocalAuthService,
        AuthTokenService])
], ChangeEmailService);
export { ChangeEmailService };
//# sourceMappingURL=change-email.service.js.map