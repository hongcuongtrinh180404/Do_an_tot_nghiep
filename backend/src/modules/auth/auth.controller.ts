import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type {
  IAuthResponse,
  IAuthTokens,
  IUserProfile,
} from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { AuthService } from './services/auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { Public } from './decorators/public.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<ApiResponse<IAuthResponse>> {
    const result = await this.authService.register(dto);
    return ApiResponse.success(result, 'User registration successful');
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<ApiResponse<IAuthResponse>> {
    const result = await this.authService.login(dto);
    return ApiResponse.success(result, 'Login successful');
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
