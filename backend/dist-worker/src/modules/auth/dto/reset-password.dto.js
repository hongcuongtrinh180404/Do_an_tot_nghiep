var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsNotEmpty, IsString, Length, Matches, MinLength, } from 'class-validator';
import { Transform } from 'class-transformer';
export class ResetPasswordDto {
    token;
    password;
}
__decorate([
    IsNotEmpty({ message: 'Token đặt lại mật khẩu không được để trống' }),
    IsString({ message: 'Token đặt lại mật khẩu phải là chuỗi hợp lệ' }),
    Length(64, 64, { message: 'Token đặt lại mật khẩu không hợp lệ' }),
    Matches(/^[a-f0-9]+$/i, { message: 'Token đặt lại mật khẩu không hợp lệ' }),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "token", void 0);
__decorate([
    IsString(),
    IsNotEmpty({ message: 'Mật khẩu mới không được để trống' }),
    MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' }),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    __metadata("design:type", String)
], ResetPasswordDto.prototype, "password", void 0);
//# sourceMappingURL=reset-password.dto.js.map