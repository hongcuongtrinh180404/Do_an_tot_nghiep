var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsNotEmpty, IsString, MinLength, MaxLength, IsOptional, IsInt, Min, } from 'class-validator';
import { Transform, Type } from 'class-transformer';
export class CreateSectionDto {
    title;
    description;
    order;
}
__decorate([
    IsNotEmpty({ message: 'Tiêu đề chương học không được để trống' }),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    IsString({ message: 'Tiêu đề chương học phải là chuỗi ký tự' }),
    MinLength(1, { message: 'Tiêu đề chương học không được để trống' }),
    MaxLength(200, { message: 'Tiêu đề chương học không được vượt quá 200 ký tự' }),
    __metadata("design:type", String)
], CreateSectionDto.prototype, "title", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() || undefined : value),
    IsString({ message: 'Mô tả chương học phải là chuỗi ký tự' }),
    MaxLength(1000, { message: 'Mô tả chương học không được vượt quá 1000 ký tự' }),
    __metadata("design:type", String)
], CreateSectionDto.prototype, "description", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt({ message: 'Thứ tự chương học phải là số nguyên' }),
    Min(0, { message: 'Thứ tự chương học phải lớn hơn hoặc bằng 0' }),
    __metadata("design:type", Number)
], CreateSectionDto.prototype, "order", void 0);
//# sourceMappingURL=create-section.dto.js.map