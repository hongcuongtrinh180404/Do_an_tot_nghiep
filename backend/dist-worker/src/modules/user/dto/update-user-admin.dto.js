var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsOptional, IsString, IsEnum, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { RoleEnum, UserStatusEnum } from 'share-lib';
export class UpdateUserAdminDto {
    fullName;
    bio;
    role;
    status;
}
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(100),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : undefined),
    __metadata("design:type", String)
], UpdateUserAdminDto.prototype, "fullName", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(500),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : undefined),
    __metadata("design:type", String)
], UpdateUserAdminDto.prototype, "bio", void 0);
__decorate([
    IsOptional(),
    IsEnum(RoleEnum),
    __metadata("design:type", String)
], UpdateUserAdminDto.prototype, "role", void 0);
__decorate([
    IsOptional(),
    IsEnum(UserStatusEnum),
    __metadata("design:type", String)
], UpdateUserAdminDto.prototype, "status", void 0);
//# sourceMappingURL=update-user-admin.dto.js.map