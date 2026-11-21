var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiResponse } from '../base/index.js';
import { AuthService } from './services/auth.service.js';
import { PasswordResetService } from './services/password-reset.service.js';
import { ChangeEmailService } from './services/change-email.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { GoogleAuthDto } from './dto/google-auth.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ChangeEmailRequestDto } from './dto/change-email.dto.js';
import { VerifyEmailChangeDto } from './dto/verify-email-change.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
let AuthController = class AuthController {
    authService;
    passwordResetService;
    changeEmailService;
    constructor(authService, passwordResetService, changeEmailService) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
        this.changeEmailService = changeEmailService;
    }
    async register(dto) {
        const result = await this.authService.register(dto);
        return ApiResponse.success(result, result.message);
    }
    async verifyEmail(dto) {
        const result = await this.authService.verifyEmail(dto);
        return ApiResponse.success(result, 'Xác thực tài khoản thành công');
    }
    async resendVerification(dto) {
        const result = await this.authService.resendVerification(dto);
        return ApiResponse.success(result, result.message);
    }
    async forgotPassword(dto) {
        const result = await this.passwordResetService.requestReset(dto);
        return ApiResponse.success(result, result.message);
    }
    async resetPassword(dto) {
        const result = await this.passwordResetService.resetPassword(dto);
        return ApiResponse.success(result, result.message);
    }
    async requestChangeEmail(userId, dto) {
        const result = await this.changeEmailService.requestChangeEmail(userId, dto);
        return ApiResponse.success(result, result.message);
    }
    async verifyEmailChange(dto) {
        const result = await this.changeEmailService.verifyEmailChange(dto);
        return ApiResponse.success(result, result.message);
    }
    async changePassword(userId, dto) {
        const result = await this.authService.changePassword(userId, dto);
        return ApiResponse.success(result, result.message);
    }
    async login(dto) {
        const result = await this.authService.login(dto);
        return ApiResponse.success(result, 'Login successful');
    }
    async googleAuth(dto) {
        const result = await this.authService.loginWithGoogle(dto);
        return ApiResponse.success(result, 'Đăng nhập Google thành công');
    }
    async refresh(dto) {
        const tokens = await this.authService.refreshToken(dto);
        return ApiResponse.success(tokens, 'Token refresh successful');
    }
    async logout(userId) {
        await this.authService.logout(userId);
        return ApiResponse.success({ loggedOut: true }, 'Logout successful');
    }
    async getMe(user) {
        const profile = await this.authService.getMe(user.id);
        return ApiResponse.success(profile, 'Profile retrieved successfully');
    }
};
__decorate([
    Public(),
    Post('register'),
    HttpCode(HttpStatus.CREATED),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    Public(),
    Post('verify-email'),
    HttpCode(HttpStatus.OK),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VerifyEmailDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    Public(),
    Post('resend-verification'),
    HttpCode(HttpStatus.OK),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ResendVerificationDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resendVerification", null);
__decorate([
    Public(),
    Post('forgot-password'),
    HttpCode(HttpStatus.OK),
    UseGuards(ThrottlerGuard),
    Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } }),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    Public(),
    Post('reset-password'),
    HttpCode(HttpStatus.OK),
    UseGuards(ThrottlerGuard),
    Throttle({ default: { limit: 10, ttl: 15 * 60 * 1000 } }),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    Post('change-email/request'),
    HttpCode(HttpStatus.OK),
    UseGuards(ThrottlerGuard),
    Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } }),
    __param(0, CurrentUser('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ChangeEmailRequestDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "requestChangeEmail", null);
__decorate([
    Public(),
    Post('change-email/verify'),
    HttpCode(HttpStatus.OK),
    UseGuards(ThrottlerGuard),
    Throttle({ default: { limit: 10, ttl: 15 * 60 * 1000 } }),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VerifyEmailChangeDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmailChange", null);
__decorate([
    Post('change-password'),
    HttpCode(HttpStatus.OK),
    UseGuards(ThrottlerGuard),
    Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } }),
    __param(0, CurrentUser('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ChangePasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
__decorate([
    Public(),
    Post('login'),
    HttpCode(HttpStatus.OK),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    Public(),
    Post('google'),
    HttpCode(HttpStatus.OK),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [GoogleAuthDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleAuth", null);
__decorate([
    Public(),
    Post('refresh'),
    HttpCode(HttpStatus.OK),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RefreshTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    Post('logout'),
    HttpCode(HttpStatus.OK),
    __param(0, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    Get('me'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getMe", null);
AuthController = __decorate([
    Controller('auth'),
    __metadata("design:paramtypes", [AuthService,
        PasswordResetService,
        ChangeEmailService])
], AuthController);
export { AuthController };
//# sourceMappingURL=auth.controller.js.map