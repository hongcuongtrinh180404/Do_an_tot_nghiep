var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { AUTH_CONSTANTS } from 'share-lib';
let AuthTokenService = class AuthTokenService {
    jwtService;
    accessSecret;
    refreshSecret;
    accessExpiresIn;
    refreshExpiresIn;
    constructor(jwtService, configService) {
        this.jwtService = jwtService;
        this.accessSecret = configService.get('JWT_SECRET') || 'default_secret_key_min_32_chars';
        this.refreshSecret = configService.get('JWT_REFRESH_SECRET') || 'default_refresh_secret_key_min_32_chars';
        this.accessExpiresIn = configService.get('JWT_EXPIRES_IN') || AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN;
        this.refreshExpiresIn = configService.get('JWT_REFRESH_EXPIRES_IN') || AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRES_IN;
    }
    hashToken(token) {
        return createHash('sha256').update(token).digest('hex');
    }
    async generateTokens(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };
        const refreshPayload = { ...payload, jti: randomUUID() };
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.accessSecret,
                expiresIn: this.accessExpiresIn,
            }),
            this.jwtService.signAsync(refreshPayload, {
                secret: this.refreshSecret,
                expiresIn: this.refreshExpiresIn,
            }),
        ]);
        return {
            accessToken,
            refreshToken,
            expiresIn: this.accessExpiresIn,
        };
    }
    async verifyRefreshToken(refreshToken) {
        try {
            return await this.jwtService.verifyAsync(refreshToken, {
                secret: this.refreshSecret,
            });
        }
        catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }
    }
    getRefreshTokenExpiryDate() {
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
};
AuthTokenService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [JwtService,
        ConfigService])
], AuthTokenService);
export { AuthTokenService };
//# sourceMappingURL=auth-token.service.js.map