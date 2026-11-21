var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AUTH_CONSTANTS } from 'share-lib';
import { UserModule } from '../user/user.module.js';
import { SessionModule } from '../session/session.module.js';
import { MailModule } from '../mail/mail.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './services/auth.service.js';
import { LocalAuthService } from './services/local-auth.service.js';
import { AuthTokenService } from './services/auth-token.service.js';
import { PasswordResetService } from './services/password-reset.service.js';
import { ChangeEmailService } from './services/change-email.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
let AuthModule = class AuthModule {
};
AuthModule = __decorate([
    Module({
        imports: [
            UserModule,
            SessionModule,
            MailModule,
            PassportModule.register({ defaultStrategy: 'jwt' }),
            JwtModule.registerAsync({
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: (config) => ({
                    secret: config.get('JWT_SECRET') || 'default_secret_key_min_32_chars',
                    signOptions: {
                        expiresIn: (config.get('JWT_EXPIRES_IN') || '15m'),
                    },
                }),
            }),
            ThrottlerModule.forRootAsync({
                imports: [ConfigModule],
                inject: [ConfigService],
                useFactory: (config) => ({
                    throttlers: [
                        {
                            name: 'default',
                            ttl: Number(config.get('THROTTLE_TTL') ?? 60000),
                            limit: Number(config.get('THROTTLE_LIMIT') ?? 100),
                        },
                    ],
                    errorMessage: AUTH_CONSTANTS.PASSWORD_RESET_RATE_LIMIT_MESSAGE,
                }),
            }),
        ],
        controllers: [AuthController],
        providers: [
            AuthService,
            LocalAuthService,
            AuthTokenService,
            PasswordResetService,
            ChangeEmailService,
            JwtStrategy,
            {
                provide: APP_GUARD,
                useClass: JwtAuthGuard,
            },
            {
                provide: APP_GUARD,
                useClass: RolesGuard,
            },
        ],
        exports: [AuthService, LocalAuthService, AuthTokenService, PasswordResetService, ChangeEmailService],
    })
], AuthModule);
export { AuthModule };
//# sourceMappingURL=auth.module.js.map