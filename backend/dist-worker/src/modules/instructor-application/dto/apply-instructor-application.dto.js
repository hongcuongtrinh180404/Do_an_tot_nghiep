var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsNotEmpty, IsString, IsArray, ArrayMinSize, MinLength, MaxLength, IsOptional, } from 'class-validator';
import { Transform } from 'class-transformer';
export class ApplyInstructorApplicationDto {
    phone;
    expertises;
    bio;
    experience;
    cvFileName;
    cvFileUrl;
}
__decorate([
    IsNotEmpty({ message: 'Số điện thoại không được để trống' }),
    IsString({ message: 'Số điện thoại phải là chuỗi ký tự' }),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    __metadata("design:type", String)
], ApplyInstructorApplicationDto.prototype, "phone", void 0);
__decorate([
    IsArray({ message: 'Lĩnh vực chuyên môn phải là danh sách mảng' }),
    ArrayMinSize(1, { message: 'Vui lòng chọn ít nhất 1 lĩnh vực chuyên môn' }),
    IsString({ each: true, message: 'Mỗi lĩnh vực chuyên môn phải là chuỗi ký tự' }),
    __metadata("design:type", Array)
], ApplyInstructorApplicationDto.prototype, "expertises", void 0);
__decorate([
    IsNotEmpty({ message: 'Tiểu sử chuyên môn không được để trống' }),
    IsString({ message: 'Tiểu sử chuyên môn phải là chuỗi ký tự' }),
    MinLength(10, { message: 'Tiểu sử chuyên môn phải có ít nhất 10 ký tự' }),
    MaxLength(2000, { message: 'Tiểu sử chuyên môn không được vượt quá 2000 ký tự' }),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    __metadata("design:type", String)
], ApplyInstructorApplicationDto.prototype, "bio", void 0);
__decorate([
    IsNotEmpty({ message: 'Kinh nghiệm giảng dạy & đào tạo không được để trống' }),
    IsString({ message: 'Kinh nghiệm giảng dạy phải là chuỗi ký tự' }),
    MinLength(10, { message: 'Kinh nghiệm giảng dạy phải có ít nhất 10 ký tự' }),
    MaxLength(2000, { message: 'Kinh nghiệm giảng dạy không được vượt quá 2000 ký tự' }),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    __metadata("design:type", String)
], ApplyInstructorApplicationDto.prototype, "experience", void 0);
__decorate([
    IsOptional(),
    IsString({ message: 'Tên file CV phải là chuỗi ký tự' }),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    __metadata("design:type", String)
], ApplyInstructorApplicationDto.prototype, "cvFileName", void 0);
__decorate([
    IsOptional(),
    IsString({ message: 'Đường dẫn file CV phải là chuỗi ký tự' }),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    __metadata("design:type", String)
], ApplyInstructorApplicationDto.prototype, "cvFileUrl", void 0);
//# sourceMappingURL=apply-instructor-application.dto.js.map