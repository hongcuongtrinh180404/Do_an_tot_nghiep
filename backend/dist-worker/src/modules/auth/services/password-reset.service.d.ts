import { IForgotPasswordResponse, IResetPasswordResponse } from 'share-lib';
import { UserService } from '../../user/services/user.service.js';
import { SessionService } from '../../session/services/session.service.js';
import { MailService } from '../../mail/mail.service.js';
import { LocalAuthService } from './local-auth.service.js';
import { AuthTokenService } from './auth-token.service.js';
import { ForgotPasswordDto } from '../dto/forgot-password.dto.js';
import { ResetPasswordDto } from '../dto/reset-password.dto.js';
export declare class PasswordResetService {
    private readonly userService;
    private readonly sessionService;
    private readonly mailService;
    private readonly localAuthService;
    private readonly authTokenService;
    private readonly logger;
    constructor(userService: UserService, sessionService: SessionService, mailService: MailService, localAuthService: LocalAuthService, authTokenService: AuthTokenService);
    requestReset(dto: ForgotPasswordDto): Promise<IForgotPasswordResponse>;
    resetPassword(dto: ResetPasswordDto): Promise<IResetPasswordResponse>;
    private isEligibleForPasswordReset;
    private isResetTokenValid;
}
