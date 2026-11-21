var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested, } from 'class-validator';
import { Type, Transform } from 'class-transformer';
export class TermItemDto {
    id;
    title;
    content;
    isMandatory;
    order;
}
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], TermItemDto.prototype, "id", void 0);
__decorate([
    IsNotEmpty({ message: 'Tiêu đề điều khoản không được để trống' }),
    IsString({ message: 'Tiêu đề điều khoản phải là chuỗi ký tự' }),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    __metadata("design:type", String)
], TermItemDto.prototype, "title", void 0);
__decorate([
    IsNotEmpty({ message: 'Nội dung điều khoản không được để trống' }),
    IsString({ message: 'Nội dung điều khoản phải là chuỗi ký tự' }),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    __metadata("design:type", String)
], TermItemDto.prototype, "content", void 0);
__decorate([
    IsOptional(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], TermItemDto.prototype, "isMandatory", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    __metadata("design:type", Number)
], TermItemDto.prototype, "order", void 0);
export class UpdateInstructorTermsDto {
    terms;
}
__decorate([
    IsArray({ message: 'Danh sách điều khoản phải là một mảng' }),
    ValidateNested({ each: true }),
    Type(() => TermItemDto),
    __metadata("design:type", Array)
], UpdateInstructorTermsDto.prototype, "terms", void 0);
//# sourceMappingURL=update-instructor-terms.dto.js.map