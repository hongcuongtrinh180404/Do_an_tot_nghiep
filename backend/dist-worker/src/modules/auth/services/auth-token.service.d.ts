import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IAuthTokens, IJwtPayload, IUserProfile } from 'share-lib';
export declare class AuthTokenService {
    private readonly jwtService;
    private readonly accessSecret;
    private readonly refreshSecret;
    private readonly accessExpiresIn;
    private readonly refreshExpiresIn;
    constructor(jwtService: JwtService, configService: ConfigService);
    hashToken(token: string): string;
    generateTokens(user: IUserProfile): Promise<IAuthTokens>;
    verifyRefreshToken(refreshToken: string): Promise<IJwtPayload>;
    getRefreshTokenExpiryDate(): Date;
}
