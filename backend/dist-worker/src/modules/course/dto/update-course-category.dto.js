var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsBoolean, IsInt, IsOptional, IsString, Matches, MaxLength, Min, MinLength, } from 'class-validator';
import { Transform, Type } from 'class-transformer';
export class UpdateCourseCategoryDto {
    name;
    slug;
    description;
    order;
    isActive;
}
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    IsString({ message: 'Tên danh mục phải là chuỗi ký tự' }),
    MinLength(2, { message: 'Tên danh mục phải có ít nhất 2 ký tự' }),
    MaxLength(100, { message: 'Tên danh mục không được vượt quá 100 ký tự' }),
    __metadata("design:type", String)
], UpdateCourseCategoryDto.prototype, "name", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? value.toLowerCase().trim() : value),
    IsString({ message: 'Slug phải là chuỗi ký tự' }),
    Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: 'Slug chỉ được chứa chữ cái thường, số và dấu gạch ngang (kebab-case)',
    }),
    __metadata("design:type", String)
], UpdateCourseCategoryDto.prototype, "slug", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    IsString({ message: 'Mô tả danh mục phải là chuỗi ký tự' }),
    MaxLength(500, { message: 'Mô tả danh mục không được vượt quá 500 ký tự' }),
    __metadata("design:type", Object)
], UpdateCourseCategoryDto.prototype, "description", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt({ message: 'Thứ tự danh mục phải là số nguyên' }),
    Min(0, { message: 'Thứ tự danh mục phải lớn hơn hoặc bằng 0' }),
    __metadata("design:type", Number)
], UpdateCourseCategoryDto.prototype, "order", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => {
        if (value === 'true' || value === true)
            return true;
        if (value === 'false' || value === false)
            return false;
        return value;
    }),
    IsBoolean({ message: 'Trạng thái hiển thị phải là boolean' }),
    __metadata("design:type", Boolean)
], UpdateCourseCategoryDto.prototype, "isActive", void 0);
//# sourceMappingURL=update-course-category.dto.js.map