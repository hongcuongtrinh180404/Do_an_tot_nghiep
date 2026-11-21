import type { IAuthResponse, IAuthTokens, IUserProfile, IRegisterResponse, IForgotPasswordResponse, IResetPasswordResponse, IChangeEmailRequestResponse, IVerifyEmailChangeResponse, IChangePasswordResponse } from 'share-lib';
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
export declare class AuthController {
    private readonly authService;
    private readonly passwordResetService;
    private readonly changeEmailService;
    constructor(authService: AuthService, passwordResetService: PasswordResetService, changeEmailService: ChangeEmailService);
    register(dto: RegisterDto): Promise<ApiResponse<IRegisterResponse>>;
    verifyEmail(dto: VerifyEmailDto): Promise<ApiResponse<IAuthResponse>>;
    resendVerification(dto: ResendVerificationDto): Promise<ApiResponse<{
        sent: boolean;
        message: string;
    }>>;
    forgotPassword(dto: ForgotPasswordDto): Promise<ApiResponse<IForgotPasswordResponse>>;
    resetPassword(dto: ResetPasswordDto): Promise<ApiResponse<IResetPasswordResponse>>;
    requestChangeEmail(userId: string, dto: ChangeEmailRequestDto): Promise<ApiResponse<IChangeEmailRequestResponse>>;
    verifyEmailChange(dto: VerifyEmailChangeDto): Promise<ApiResponse<IVerifyEmailChangeResponse>>;
    changePassword(userId: string, dto: ChangePasswordDto): Promise<ApiResponse<IChangePasswordResponse>>;
    login(dto: LoginDto): Promise<ApiResponse<IAuthResponse>>;
    googleAuth(dto: GoogleAuthDto): Promise<ApiResponse<IAuthResponse>>;
    refresh(dto: RefreshTokenDto): Promise<ApiResponse<IAuthTokens>>;
    logout(userId: string): Promise<ApiResponse<{
        loggedOut: boolean;
    }>>;
    getMe(user: IUserProfile): Promise<ApiResponse<IUserProfile>>;
}
