var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { AUTH_CONSTANTS } from 'share-lib';
export class ChangePasswordDto {
    currentPassword;
    newPassword;
    confirmPassword;
}
__decorate([
    IsString({ message: 'Mật khẩu hiện tại phải là chuỗi ký tự' }),
    IsNotEmpty({ message: 'Mật khẩu hiện tại không được để trống' }),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "currentPassword", void 0);
__decorate([
    IsString({ message: 'Mật khẩu mới phải là chuỗi ký tự' }),
    IsNotEmpty({ message: 'Mật khẩu mới không được để trống' }),
    MinLength(AUTH_CONSTANTS.MIN_PASSWORD_LENGTH, {
        message: `Mật khẩu mới phải có ít nhất ${AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} ký tự`,
    }),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "newPassword", void 0);
__decorate([
    IsString({ message: 'Xác nhận mật khẩu mới phải là chuỗi ký tự' }),
    IsNotEmpty({ message: 'Xác nhận mật khẩu mới không được để trống' }),
    MinLength(AUTH_CONSTANTS.MIN_PASSWORD_LENGTH, {
        message: `Xác nhận mật khẩu mới phải có ít nhất ${AUTH_CONSTANTS.MIN_PASSWORD_LENGTH} ký tự`,
    }),
    __metadata("design:type", String)
], ChangePasswordDto.prototype, "confirmPassword", void 0);
//# sourceMappingURL=change-password.dto.js.map