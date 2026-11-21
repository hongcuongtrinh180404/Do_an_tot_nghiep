var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PasswordResetService_1;
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { AUTH_CONSTANTS, UserStatusEnum, } from 'share-lib';
import { UserService } from '../../user/services/user.service.js';
import { SessionService } from '../../session/services/session.service.js';
import { MailService } from '../../mail/mail.service.js';
import { LocalAuthService } from './local-auth.service.js';
import { AuthTokenService } from './auth-token.service.js';
let PasswordResetService = PasswordResetService_1 = class PasswordResetService {
    userService;
    sessionService;
    mailService;
    localAuthService;
    authTokenService;
    logger = new Logger(PasswordResetService_1.name);
    constructor(userService, sessionService, mailService, localAuthService, authTokenService) {
        this.userService = userService;
        this.sessionService = sessionService;
        this.mailService = mailService;
        this.localAuthService = localAuthService;
        this.authTokenService = authTokenService;
    }
    async requestReset(dto) {
        const genericResponse = {
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
        const claimedUser = await this.userService.claimPasswordResetRequest(user.id, tokenHash, expiresAt, requestedAt, cooldownCutoff);
        if (!claimedUser) {
            return genericResponse;
        }
        const fullName = claimedUser.fullName || claimedUser.email.split('@')[0];
        const emailSent = await this.mailService.sendPasswordResetEmail(claimedUser.email, fullName, rawToken);
        if (!emailSent) {
            await this.userService.clearPasswordResetRequest(claimedUser.id, tokenHash);
            this.logger.error(`Không thể gửi email đặt lại mật khẩu đến ${claimedUser.email}. Đã rollback token để cho phép thử lại.`);
        }
        return genericResponse;
    }
    async resetPassword(dto) {
        const tokenHash = this.authTokenService.hashToken(dto.token.trim());
        const user = await this.userService.findByPasswordResetTokenHash(tokenHash);
        if (!user || !this.isResetTokenValid(user)) {
            throw new BadRequestException(AUTH_CONSTANTS.PASSWORD_RESET_INVALID_TOKEN_MESSAGE);
        }
        const passwordHash = await this.localAuthService.hashPassword(dto.password);
        const now = new Date();
        await this.userService.runInTransaction(async (session) => {
            const updated = await this.userService.consumePasswordResetToken(user.id, tokenHash, passwordHash, now, session);
            if (!updated) {
                throw new BadRequestException(AUTH_CONSTANTS.PASSWORD_RESET_INVALID_TOKEN_MESSAGE);
            }
            await this.sessionService.revokeAllUserSessions(updated.id, session);
        });
        return { message: AUTH_CONSTANTS.PASSWORD_RESET_SUCCESS_MESSAGE };
    }
    isEligibleForPasswordReset(user) {
        const hasLocalPassword = typeof user.passwordHash === 'string' && user.passwordHash.length > 0;
        const hasGoogleAccount = typeof user.googleSub === 'string' && user.googleSub.trim().length > 0;
        return (user.status === UserStatusEnum.ACTIVE &&
            user.isEmailVerified === true &&
            (hasLocalPassword || hasGoogleAccount));
    }
    isResetTokenValid(user) {
        if (!user.passwordResetExpires) {
            return false;
        }
        const expiresAt = new Date(user.passwordResetExpires).getTime();
        return Number.isFinite(expiresAt) && expiresAt > Date.now();
    }
};
PasswordResetService = PasswordResetService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [UserService,
        SessionService,
        MailService,
        LocalAuthService,
        AuthTokenService])
], PasswordResetService);
export { PasswordResetService };
//# sourceMappingURL=password-reset.service.js.map