var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
export class RegisterDto {
    email;
    password;
    fullName;
    firstName;
    lastName;
}
__decorate([
    IsEmail({}, { message: 'Invalid email format' }),
    IsNotEmpty({ message: 'Email cannot be empty' }),
    Transform(({ value }) => typeof value === 'string' ? value.toLowerCase().trim() : value),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    IsString(),
    IsNotEmpty({ message: 'Password cannot be empty' }),
    MinLength(6, { message: 'Password must be at least 6 characters long' }),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    __metadata("design:type", String)
], RegisterDto.prototype, "fullName", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    __metadata("design:type", String)
], RegisterDto.prototype, "firstName", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    __metadata("design:type", String)
], RegisterDto.prototype, "lastName", void 0);
//# sourceMappingURL=register.dto.js.map