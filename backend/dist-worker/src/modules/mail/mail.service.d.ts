import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private readonly configService;
    private readonly logger;
    constructor(configService: ConfigService);
    private createTransporter;
    sendVerificationEmail(to: string, fullName: string, token: string): Promise<boolean>;
    sendPasswordResetEmail(to: string, fullName: string, token: string): Promise<boolean>;
    sendChangeEmailVerification(to: string, fullName: string, token: string): Promise<boolean>;
    sendEmailChangeSecurityAlert(toOldEmail: string, fullName: string, newEmail: string): Promise<boolean>;
}
