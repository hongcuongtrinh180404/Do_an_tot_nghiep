var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsNotEmpty, IsString, MinLength, MaxLength, IsOptional, IsInt, Min, IsEnum, IsNumber, IsBoolean, ValidateNested, IsDefined, IsObject, } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { LessonContentTypeEnum, decodeUtf8FileName } from 'share-lib';
export class LessonContentDto {
    type;
    url;
    publicId;
    fileName;
    fileSize;
    mimeType;
    duration;
}
__decorate([
    IsNotEmpty({ message: 'Loại nội dung bài học không được để trống' }),
    IsEnum(LessonContentTypeEnum, {
        message: 'Loại nội dung bài học phải là video hoặc document',
    }),
    __metadata("design:type", String)
], LessonContentDto.prototype, "type", void 0);
__decorate([
    IsNotEmpty({ message: 'URL nội dung không được để trống' }),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    IsString({ message: 'URL nội dung phải là chuỗi ký tự' }),
    __metadata("design:type", String)
], LessonContentDto.prototype, "url", void 0);
__decorate([
    IsOptional(),
    IsString({ message: 'publicId phải là chuỗi ký tự' }),
    __metadata("design:type", String)
], LessonContentDto.prototype, "publicId", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? decodeUtf8FileName(value.trim()) : value),
    IsString({ message: 'fileName phải là chuỗi ký tự' }),
    __metadata("design:type", String)
], LessonContentDto.prototype, "fileName", void 0);
__decorate([
    IsOptional(),
    IsInt({ message: 'fileSize phải là số nguyên' }),
    Min(0, { message: 'fileSize không được là số âm' }),
    __metadata("design:type", Number)
], LessonContentDto.prototype, "fileSize", void 0);
__decorate([
    IsOptional(),
    IsString({ message: 'mimeType phải là chuỗi ký tự' }),
    __metadata("design:type", String)
], LessonContentDto.prototype, "mimeType", void 0);
__decorate([
    IsOptional(),
    IsNumber({}, { message: 'duration phải là một số hợp lệ' }),
    Min(0, { message: 'duration không được là số âm' }),
    __metadata("design:type", Number)
], LessonContentDto.prototype, "duration", void 0);
export class CreateLessonDto {
    title;
    order;
    content;
    isPreview;
}
__decorate([
    IsNotEmpty({ message: 'Tiêu đề bài học không được để trống' }),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    IsString({ message: 'Tiêu đề bài học phải là chuỗi ký tự' }),
    MinLength(1, { message: 'Tiêu đề bài học không được để trống' }),
    MaxLength(200, { message: 'Tiêu đề bài học không được vượt quá 200 ký tự' }),
    __metadata("design:type", String)
], CreateLessonDto.prototype, "title", void 0);
__decorate([
    IsNotEmpty({ message: 'Thứ tự bài học không được để trống' }),
    Type(() => Number),
    IsInt({ message: 'Thứ tự bài học phải là số nguyên' }),
    Min(0, { message: 'Thứ tự bài học phải lớn hơn hoặc bằng 0' }),
    __metadata("design:type", Number)
], CreateLessonDto.prototype, "order", void 0);
__decorate([
    IsDefined({ message: 'Vui lòng tải lên video hoặc tài liệu cho bài học' }),
    IsObject({ message: 'Nội dung bài học phải là video hoặc tài liệu hợp lệ' }),
    ValidateNested(),
    Type(() => LessonContentDto),
    __metadata("design:type", LessonContentDto)
], CreateLessonDto.prototype, "content", void 0);
__decorate([
    IsOptional(),
    IsBoolean({ message: 'isPreview phải là giá trị boolean' }),
    __metadata("design:type", Boolean)
], CreateLessonDto.prototype, "isPreview", void 0);
//# sourceMappingURL=create-lesson.dto.js.map