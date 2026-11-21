var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
import { Injectable, UnauthorizedException, BadRequestException, Logger, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { AUTH_CONSTANTS, RoleEnum, AuthProviderEnum, UserStatusEnum, } from 'share-lib';
import { UserService } from '../../user/services/user.service.js';
import { SessionService } from '../../session/services/session.service.js';
import { MailService } from '../../mail/mail.service.js';
import { LocalAuthService } from './local-auth.service.js';
import { AuthTokenService } from './auth-token.service.js';
let AuthService = AuthService_1 = class AuthService {
    userService;
    sessionService;
    localAuthService;
    authTokenService;
    configService;
    mailService;
    logger = new Logger(AuthService_1.name);
    googleClient;
    constructor(userService, sessionService, localAuthService, authTokenService, configService, mailService) {
        this.userService = userService;
        this.sessionService = sessionService;
        this.localAuthService = localAuthService;
        this.authTokenService = authTokenService;
        this.configService = configService;
        this.mailService = mailService;
        this.googleClient = new OAuth2Client();
    }
    mapToProfile(user) {
        const fallbackFullName = user.fullName ||
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
            hasPassword: !!(user.passwordHash || user.password),
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatarUrl || user.avatar || null,
            provider: user.provider,
        };
    }
    async register(dto) {
        await this.userService.ensureEmailNotTaken(dto.email);
        const hashedPassword = await this.localAuthService.hashPassword(dto.password);
        const fullName = dto.fullName ||
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
            role: RoleEnum.STUDENT,
            provider: AuthProviderEnum.LOCAL,
            status: UserStatusEnum.INACTIVE,
            isEmailVerified: false,
            emailVerificationToken: verificationToken,
            emailVerificationExpires: verificationExpires,
            firstName: dto.firstName,
            lastName: dto.lastName,
        });
        const emailSent = await this.mailService.sendVerificationEmail(newUser.email, fullName, verificationToken);
        return {
            user: this.mapToProfile(newUser),
            message: 'Đăng ký tài khoản thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.',
            emailSent,
        };
    }
    async login(dto) {
        const user = await this.localAuthService.validateUser(dto.email, dto.password);
        const userProfile = this.mapToProfile(await this.userService.ensureUsername(user));
        const tokens = await this.authTokenService.generateTokens(userProfile);
        const refreshTokenHash = this.authTokenService.hashToken(tokens.refreshToken);
        await this.sessionService.createOrUpdateSession(user.id, refreshTokenHash, this.authTokenService.getRefreshTokenExpiryDate());
        return {
            user: userProfile,
            tokens,
        };
    }
    async refreshToken(dto) {
        const payload = await this.authTokenService.verifyRefreshToken(dto.refreshToken);
        const user = await this.userService.findById(payload.sub);
        if (!user || user.status !== UserStatusEnum.ACTIVE) {
            throw new UnauthorizedException('User account is invalid or deactivated');
        }
        const userProfile = this.mapToProfile(await this.userService.ensureUsername(user));
        const incomingHash = this.authTokenService.hashToken(dto.refreshToken);
        const newTokens = await this.authTokenService.generateTokens(userProfile);
        const newHash = this.authTokenService.hashToken(newTokens.refreshToken);
        const rotation = await this.sessionService.validateAndRotateSession(user.id, incomingHash, newHash, this.authTokenService.getRefreshTokenExpiryDate());
        if (rotation.isReusedGrace) {
            return {
                accessToken: newTokens.accessToken,
                refreshToken: dto.refreshToken,
                expiresIn: newTokens.expiresIn,
            };
        }
        return newTokens;
    }
    async logout(userId) {
        return this.sessionService.revokeAllUserSessions(userId);
    }
    async getMe(userId) {
        const user = await this.userService.findById(userId);
        if (!user || user.status !== UserStatusEnum.ACTIVE) {
            throw new UnauthorizedException('User not found or inactive');
        }
        const userWithPassword = await this.userService.findByEmail(user.email, true);
        const profile = this.mapToProfile(await this.userService.ensureUsername(user));
        profile.hasPassword = !!(userWithPassword?.passwordHash ||
            userWithPassword?.password);
        return profile;
    }
    async validateOAuthLogin(oauthProfile) {
        let user = await this.userService.findByProvider(oauthProfile.provider, oauthProfile.providerId);
        if (!user) {
            const existingEmailUser = await this.userService.findByEmail(oauthProfile.email);
            if (existingEmailUser) {
                user = (await this.userService.update(existingEmailUser.id, {
                    provider: oauthProfile.provider,
                    providerId: oauthProfile.providerId,
                    avatar: oauthProfile.avatar ?? existingEmailUser.avatar,
                }));
            }
            else {
                const dummyHash = await this.localAuthService.hashPassword(Math.random().toString(36).substring(2) + Date.now().toString(36));
                const fullName = `${oauthProfile.lastName || ''} ${oauthProfile.firstName || ''}`.trim() ||
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
        const userProfile = this.mapToProfile(await this.userService.ensureUsername(user));
        const tokens = await this.authTokenService.generateTokens(userProfile);
        const refreshTokenHash = this.authTokenService.hashToken(tokens.refreshToken);
        await this.sessionService.createOrUpdateSession(user.id, refreshTokenHash, this.authTokenService.getRefreshTokenExpiryDate());
        return {
            user: userProfile,
            tokens,
        };
    }
    async loginWithGoogle(dto) {
        const googleClientId = this.configService.get('GOOGLE_CLIENT_ID');
        if (!googleClientId) {
            this.logger.error('GOOGLE_CLIENT_ID chưa được cấu hình trên server');
            throw new UnauthorizedException('GOOGLE_CLIENT_ID chưa được cấu hình trên server');
        }
        let payload;
        try {
            const ticket = await this.googleClient.verifyIdToken({
                idToken: dto.idToken,
                audience: googleClientId,
            });
            payload = ticket.getPayload();
        }
        catch (error) {
            const isTransientCertError = error instanceof Error &&
                (error.message.includes('certificates') ||
                    error.message.includes('ECONNRESET') ||
                    error.message.includes('ETIMEDOUT') ||
                    error.message.includes('ENOTFOUND'));
            if (isTransientCertError) {
                this.logger.warn(`Lỗi tạm thời khi tải certificates từ Google, đang thử lại: ${error.message}`);
                try {
                    const retryTicket = await this.googleClient.verifyIdToken({
                        idToken: dto.idToken,
                        audience: googleClientId,
                    });
                    payload = retryTicket.getPayload();
                }
                catch (retryError) {
                    this.logger.error(`Xác thực Google ID Token thất bại sau khi thử lại: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
                    throw new UnauthorizedException(`Xác thực Google ID Token không hợp lệ: ${retryError instanceof Error ? retryError.message : 'Token không hợp lệ'}`);
                }
            }
            else {
                this.logger.error(`Xác thực Google ID Token không hợp lệ: ${error instanceof Error ? error.message : 'Token không hợp lệ'}`);
                throw new UnauthorizedException(`Xác thực Google ID Token không hợp lệ: ${error instanceof Error ? error.message : 'Token không hợp lệ'}`);
            }
        }
        if (!payload || !payload.sub || !payload.email) {
            this.logger.warn('Thông tin người dùng từ Google ID Token không đầy đủ');
            throw new UnauthorizedException('Thông tin người dùng từ Google ID Token không đầy đủ');
        }
        if (!payload.email_verified) {
            this.logger.warn(`Email Google ${payload.email} chưa được xác minh bởi Google`);
            throw new BadRequestException('Email Google chưa được xác minh bởi Google');
        }
        const email = payload.email.toLowerCase().trim();
        const googleSub = payload.sub.trim();
        let user = await this.userService.findByGoogleSub(googleSub);
        if (!user) {
            const existingUser = await this.userService.findByEmail(email);
            if (existingUser) {
                this.logger.log(`Liên kết tài khoản Google (${googleSub}) cho người dùng hiện tại: ${email}`);
                const updateData = {
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
                user = (await this.userService.updateOrFail(existingUser.id, updateData));
            }
            else {
                this.logger.log(`Tạo tài khoản học viên mới qua Google OAuth: ${email}`);
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
        if (user.status !== UserStatusEnum.ACTIVE) {
            this.logger.warn(`Từ chối đăng nhập Google cho tài khoản không hoạt động: ${email} (${user.status})`);
            throw new UnauthorizedException('Tài khoản của bạn đã bị vô hiệu hóa hoặc khóa');
        }
        const userProfile = this.mapToProfile(await this.userService.ensureUsername(user));
        const tokens = await this.authTokenService.generateTokens(userProfile);
        const refreshTokenHash = this.authTokenService.hashToken(tokens.refreshToken);
        await this.sessionService.createOrUpdateSession(user.id, refreshTokenHash, this.authTokenService.getRefreshTokenExpiryDate());
        this.logger.log(`Đăng nhập Google thành công cho user: ${user.email} (ID: ${user.id}, Role: ${user.role})`);
        return {
            user: userProfile,
            tokens,
        };
    }
    async verifyEmail(dto) {
        const user = await this.userService.findByVerificationToken(dto.token);
        if (!user) {
            throw new BadRequestException('Mã xác thực không hợp lệ hoặc đã được sử dụng.');
        }
        if (user.emailVerificationExpires && new Date() > new Date(user.emailVerificationExpires)) {
            throw new BadRequestException('Mã xác thực đã hết hạn. Vui lòng yêu cầu gửi lại email xác thực.');
        }
        const updatedUser = (await this.userService.updateOrFail(user.id, {
            isEmailVerified: true,
            status: UserStatusEnum.ACTIVE,
            emailVerificationToken: null,
            emailVerificationExpires: null,
        }));
        const userProfile = this.mapToProfile(await this.userService.ensureUsername(updatedUser));
        const tokens = await this.authTokenService.generateTokens(userProfile);
        const refreshTokenHash = this.authTokenService.hashToken(tokens.refreshToken);
        await this.sessionService.createOrUpdateSession(updatedUser.id, refreshTokenHash, this.authTokenService.getRefreshTokenExpiryDate());
        return {
            user: userProfile,
            tokens,
        };
    }
    async resendVerification(dto) {
        const user = await this.userService.findByEmail(dto.email);
        if (!user) {
            return {
                sent: true,
                message: 'Nếu tài khoản tồn tại trong hệ thống, liên kết xác thực đã được gửi lại.',
            };
        }
        if (user.isEmailVerified) {
            throw new BadRequestException('Tài khoản này đã được xác thực trước đó. Bạn có thể đăng nhập ngay.');
        }
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.userService.updateOrFail(user.id, {
            emailVerificationToken: verificationToken,
            emailVerificationExpires: verificationExpires,
        });
        const fullName = user.fullName || user.email.split('@')[0];
        const emailSent = await this.mailService.sendVerificationEmail(user.email, fullName, verificationToken);
        return {
            sent: emailSent,
            message: 'Liên kết xác thực mới đã được gửi vào email của bạn.',
        };
    }
    async changePassword(userId, dto) {
        const user = await this.userService.findById(userId);
        if (!user || user.status !== UserStatusEnum.ACTIVE || user.deletedAt) {
            throw new BadRequestException('Tài khoản không tồn tại hoặc đã bị khóa.');
        }
        const userWithPassword = await this.userService.findByEmail(user.email, true);
        const currentHash = userWithPassword?.passwordHash || userWithPassword?.password;
        if (!currentHash) {
            throw new BadRequestException(AUTH_CONSTANTS.EMAIL_CHANGE_PASSWORD_NOT_SET_MESSAGE);
        }
        const isMatch = await this.localAuthService.comparePassword(dto.currentPassword, currentHash);
        if (!isMatch) {
            throw new BadRequestException(AUTH_CONSTANTS.CHANGE_PASSWORD_INVALID_CURRENT_MESSAGE);
        }
        if (dto.currentPassword === dto.newPassword) {
            throw new BadRequestException(AUTH_CONSTANTS.CHANGE_PASSWORD_SAME_PASSWORD_MESSAGE);
        }
        if (dto.confirmPassword !== dto.newPassword) {
            throw new BadRequestException(AUTH_CONSTANTS.CHANGE_PASSWORD_MISMATCH_MESSAGE);
        }
        const newHashedPassword = await this.localAuthService.hashPassword(dto.newPassword);
        await this.userService.updateOrFail(user.id, {
            passwordHash: newHashedPassword,
            password: newHashedPassword,
        });
        return {
            message: AUTH_CONSTANTS.CHANGE_PASSWORD_SUCCESS_MESSAGE,
        };
    }
};
AuthService = AuthService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [UserService,
        SessionService,
        LocalAuthService,
        AuthTokenService,
        ConfigService,
        MailService])
], AuthService);
export { AuthService };
//# sourceMappingURL=auth.service.js.map