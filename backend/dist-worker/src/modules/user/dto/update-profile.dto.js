var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
export class UpdateSocialLinksDto {
    facebook;
    youtube;
    linkedin;
    github;
}
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() || undefined : value),
    IsString({ message: 'Facebook link phải là chuỗi ký tự' }),
    MaxLength(255, { message: 'Facebook link không được vượt quá 255 ký tự' }),
    __metadata("design:type", String)
], UpdateSocialLinksDto.prototype, "facebook", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() || undefined : value),
    IsString({ message: 'YouTube link phải là chuỗi ký tự' }),
    MaxLength(255, { message: 'YouTube link không được vượt quá 255 ký tự' }),
    __metadata("design:type", String)
], UpdateSocialLinksDto.prototype, "youtube", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() || undefined : value),
    IsString({ message: 'LinkedIn link phải là chuỗi ký tự' }),
    MaxLength(255, { message: 'LinkedIn link không được vượt quá 255 ký tự' }),
    __metadata("design:type", String)
], UpdateSocialLinksDto.prototype, "linkedin", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() || undefined : value),
    IsString({ message: 'GitHub link phải là chuỗi ký tự' }),
    MaxLength(255, { message: 'GitHub link không được vượt quá 255 ký tự' }),
    __metadata("design:type", String)
], UpdateSocialLinksDto.prototype, "github", void 0);
export class UpdateProfileDto {
    fullName;
    bio;
    firstName;
    lastName;
    socialLinks;
}
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() || undefined : value),
    IsString({ message: 'Họ và tên phải là chuỗi ký tự' }),
    MaxLength(100, { message: 'Họ và tên không được vượt quá 100 ký tự' }),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "fullName", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    IsString({ message: 'Bio phải là chuỗi ký tự' }),
    MaxLength(500, { message: 'Bio không được vượt quá 500 ký tự' }),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "bio", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() || undefined : value),
    IsString({ message: 'Tên phải là chuỗi ký tự' }),
    MaxLength(50, { message: 'Tên không được vượt quá 50 ký tự' }),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "firstName", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() || undefined : value),
    IsString({ message: 'Họ và tên đệm phải là chuỗi ký tự' }),
    MaxLength(50, { message: 'Họ và tên đệm không được vượt quá 50 ký tự' }),
    __metadata("design:type", String)
], UpdateProfileDto.prototype, "lastName", void 0);
__decorate([
    IsOptional(),
    ValidateNested(),
    Type(() => UpdateSocialLinksDto),
    __metadata("design:type", UpdateSocialLinksDto)
], UpdateProfileDto.prototype, "socialLinks", void 0);
//# sourceMappingURL=update-profile.dto.js.map