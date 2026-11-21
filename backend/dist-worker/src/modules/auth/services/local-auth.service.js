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
import * as bcrypt from 'bcrypt';
import { UserStatusEnum } from 'share-lib';
import { UserService } from '../../user/services/user.service.js';
let LocalAuthService = class LocalAuthService {
    userService;
    saltRounds = 10;
    constructor(userService) {
        this.userService = userService;
    }
    async hashPassword(password) {
        return bcrypt.hash(password, this.saltRounds);
    }
    async comparePassword(plain, hash) {
        return bcrypt.compare(plain, hash);
    }
    async validateUser(email, plainPassword) {
        const user = await this.userService.findByEmail(email, true);
        if (!user) {
            throw new UnauthorizedException('Invalid email or password');
        }
        const userHash = user.passwordHash || user.password;
        if (!userHash) {
            throw new UnauthorizedException('This account was registered using an external authentication provider');
        }
        const isMatch = await this.comparePassword(plainPassword, userHash);
        if (!isMatch) {
            throw new UnauthorizedException('Invalid email or password');
        }
        if (user.isEmailVerified === false) {
            throw new UnauthorizedException('Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email để kích hoạt tài khoản trước khi đăng nhập.');
        }
        if (user.status !== UserStatusEnum.ACTIVE) {
            throw new UnauthorizedException('Account is not active or has been suspended');
        }
        return user;
    }
};
LocalAuthService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [UserService])
], LocalAuthService);
export { LocalAuthService };
//# sourceMappingURL=local-auth.service.js.map