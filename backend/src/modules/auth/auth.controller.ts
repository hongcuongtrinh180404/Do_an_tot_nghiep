import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type {
  IAuthResponse,
  IAuthTokens,
  IUserProfile,
  IRegisterResponse,
  IForgotPasswordResponse,
  IResetPasswordResponse,
} from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { AuthService } from './services/auth.service.js';
import { PasswordResetService } from './services/password-reset.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { GoogleAuthDto } from './dto/google-auth.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<ApiResponse<IRegisterResponse>> {
    const result = await this.authService.register(dto);
    return ApiResponse.success(result, result.message);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<ApiResponse<IAuthResponse>> {
    const result = await this.authService.verifyEmail(dto);
    return ApiResponse.success(result, 'Xác thực tài khoản thành công');
  }

  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(
    @Body() dto: ResendVerificationDto,
  ): Promise<ApiResponse<{ sent: boolean; message: string }>> {
    const result = await this.authService.resendVerification(dto);
    return ApiResponse.success(result, result.message);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<ApiResponse<IForgotPasswordResponse>> {
    const result = await this.passwordResetService.requestReset(dto);
    return ApiResponse.success(result, result.message);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 15 * 60 * 1000 } })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<ApiResponse<IResetPasswordResponse>> {
    const result = await this.passwordResetService.resetPassword(dto);
    return ApiResponse.success(result, result.message);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<ApiResponse<IAuthResponse>> {
    const result = await this.authService.login(dto);
    return ApiResponse.success(result, 'Login successful');
  }

  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async googleAuth(@Body() dto: GoogleAuthDto): Promise<ApiResponse<IAuthResponse>> {
    const result = await this.authService.loginWithGoogle(dto);
    return ApiResponse.success(result, 'Đăng nhập Google thành công');
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto): Promise<ApiResponse<IAuthTokens>> {
    const tokens = await this.authService.refreshToken(dto);
    return ApiResponse.success(tokens, 'Token refresh successful');
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser('id') userId: string): Promise<ApiResponse<{ loggedOut: boolean }>> {
    await this.authService.logout(userId);
    return ApiResponse.success({ loggedOut: true }, 'Logout successful');
  }

  @Get('me')
  async getMe(@CurrentUser() user: IUserProfile): Promise<ApiResponse<IUserProfile>> {
    const profile = await this.authService.getMe(user.id);
    return ApiResponse.success(profile, 'Profile retrieved successfully');
  }
}
