import { IChangeEmailRequestResponse, IVerifyEmailChangeResponse } from 'share-lib';
import { UserService } from '../../user/services/user.service.js';
import { SessionService } from '../../session/services/session.service.js';
import { MailService } from '../../mail/mail.service.js';
import { LocalAuthService } from './local-auth.service.js';
import { AuthTokenService } from './auth-token.service.js';
import { ChangeEmailRequestDto } from '../dto/change-email.dto.js';
import { VerifyEmailChangeDto } from '../dto/verify-email-change.dto.js';
export declare class ChangeEmailService {
    private readonly userService;
    private readonly sessionService;
    private readonly mailService;
    private readonly localAuthService;
    private readonly authTokenService;
    private readonly logger;
    constructor(userService: UserService, sessionService: SessionService, mailService: MailService, localAuthService: LocalAuthService, authTokenService: AuthTokenService);
    requestChangeEmail(userId: string, dto: ChangeEmailRequestDto): Promise<IChangeEmailRequestResponse>;
    verifyEmailChange(dto: VerifyEmailChangeDto): Promise<IVerifyEmailChangeResponse>;
}
