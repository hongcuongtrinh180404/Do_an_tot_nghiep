import { ConfigService } from '@nestjs/config';
import { IAuthResponse, IAuthTokens, IUserProfile, IRegisterResponse, IChangePasswordResponse, AuthProviderEnum } from 'share-lib';
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
import { ChangePasswordDto } from '../dto/change-password.dto.js';
export interface IOAuthProfile {
    provider: AuthProviderEnum;
    providerId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
}
export declare class AuthService {
    private readonly userService;
    private readonly sessionService;
    private readonly localAuthService;
    private readonly authTokenService;
    private readonly configService;
    private readonly mailService;
    private readonly logger;
    private readonly googleClient;
    constructor(userService: UserService, sessionService: SessionService, localAuthService: LocalAuthService, authTokenService: AuthTokenService, configService: ConfigService, mailService: MailService);
    private mapToProfile;
    register(dto: RegisterDto): Promise<IRegisterResponse>;
    login(dto: LoginDto): Promise<IAuthResponse>;
    refreshToken(dto: RefreshTokenDto): Promise<IAuthTokens>;
    logout(userId: string): Promise<boolean>;
    getMe(userId: string): Promise<IUserProfile>;
    validateOAuthLogin(oauthProfile: IOAuthProfile): Promise<IAuthResponse>;
    loginWithGoogle(dto: GoogleAuthDto): Promise<IAuthResponse>;
    verifyEmail(dto: VerifyEmailDto): Promise<IAuthResponse>;
    resendVerification(dto: ResendVerificationDto): Promise<{
        sent: boolean;
        message: string;
    }>;
    changePassword(userId: string, dto: ChangePasswordDto): Promise<IChangePasswordResponse>;
}
