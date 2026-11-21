var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsOptional, IsString, MinLength, MaxLength, Matches, IsNumber, Min, IsEnum, IsMongoId, } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CourseLevelEnum, CourseStatusEnum } from 'share-lib';
export class UpdateCourseDto {
    title;
    slug;
    description;
    thumbnailUrl;
    trailerUrl;
    price;
    originalPrice;
    level;
    status;
    categoryId;
}
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    IsString({ message: 'Tiêu đề khóa học phải là chuỗi ký tự' }),
    MinLength(3, { message: 'Tiêu đề khóa học phải có ít nhất 3 ký tự' }),
    MaxLength(200, { message: 'Tiêu đề khóa học không được vượt quá 200 ký tự' }),
    __metadata("design:type", String)
], UpdateCourseDto.prototype, "title", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? value.toLowerCase().trim() : value),
    IsString({ message: 'Đường dẫn tĩnh (slug) phải là chuỗi ký tự' }),
    Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: 'Slug chỉ được chứa chữ cái thường, số và dấu gạch ngang (kebab-case)',
    }),
    __metadata("design:type", String)
], UpdateCourseDto.prototype, "slug", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() || undefined : value),
    IsString({ message: 'Mô tả chi tiết phải là chuỗi ký tự' }),
    __metadata("design:type", Object)
], UpdateCourseDto.prototype, "description", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() || undefined : value),
    IsString({ message: 'Đường dẫn ảnh đại diện phải là chuỗi ký tự' }),
    __metadata("design:type", Object)
], UpdateCourseDto.prototype, "thumbnailUrl", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() || undefined : value),
    IsString({ message: 'Đường dẫn trailer phải là chuỗi ký tự' }),
    __metadata("design:type", Object)
], UpdateCourseDto.prototype, "trailerUrl", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsNumber({}, { message: 'Giá khóa học phải là số' }),
    Min(0, { message: 'Giá khóa học phải lớn hơn hoặc bằng 0' }),
    __metadata("design:type", Number)
], UpdateCourseDto.prototype, "price", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsNumber({}, { message: 'Giá gốc khóa học phải là số' }),
    Min(0, { message: 'Giá gốc khóa học phải lớn hơn hoặc bằng 0' }),
    __metadata("design:type", Object)
], UpdateCourseDto.prototype, "originalPrice", void 0);
__decorate([
    IsOptional(),
    IsEnum(CourseLevelEnum, {
        message: `Cấp độ khóa học không hợp lệ. Các giá trị hợp lệ: ${Object.values(CourseLevelEnum).join(', ')}`,
    }),
    __metadata("design:type", String)
], UpdateCourseDto.prototype, "level", void 0);
__decorate([
    IsOptional(),
    IsEnum(CourseStatusEnum, {
        message: `Trạng thái khóa học không hợp lệ. Các giá trị hợp lệ: ${Object.values(CourseStatusEnum).join(', ')}`,
    }),
    __metadata("design:type", String)
], UpdateCourseDto.prototype, "status", void 0);
__decorate([
    IsOptional(),
    IsMongoId({ message: 'Danh mục khóa học không hợp lệ' }),
    __metadata("design:type", Object)
], UpdateCourseDto.prototype, "categoryId", void 0);
//# sourceMappingURL=update-course.dto.js.map