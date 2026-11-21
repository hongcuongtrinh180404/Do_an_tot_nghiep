var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested, } from 'class-validator';
import { Transform, Type } from 'class-transformer';
export class LessonSummaryKeyPointDto {
    title;
    content;
    timestamp;
}
__decorate([
    IsNotEmpty({ message: 'Tiêu đề ý chính không được để trống' }),
    IsString({ message: 'Tiêu đề ý chính phải là chuỗi ký tự' }),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", String)
], LessonSummaryKeyPointDto.prototype, "title", void 0);
__decorate([
    IsNotEmpty({ message: 'Nội dung ý chính không được để trống' }),
    IsString({ message: 'Nội dung ý chính phải là chuỗi ký tự' }),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", String)
], LessonSummaryKeyPointDto.prototype, "content", void 0);
__decorate([
    IsOptional(),
    IsNumber({}, { message: 'Mốc thời gian phải là số nguyên giây hợp lệ' }),
    Min(0, { message: 'Mốc thời gian không được âm' }),
    Transform(({ value }) => {
        if (value === null || value === undefined || value === '')
            return undefined;
        const num = Number(value);
        return isNaN(num) ? value : num;
    }),
    __metadata("design:type", Number)
], LessonSummaryKeyPointDto.prototype, "timestamp", void 0);
export class UpdateLessonSummaryDto {
    title;
    overview;
    keyPoints;
}
__decorate([
    IsNotEmpty({ message: 'Tiêu đề tóm tắt không được để trống' }),
    IsString({ message: 'Tiêu đề tóm tắt phải là chuỗi ký tự' }),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", String)
], UpdateLessonSummaryDto.prototype, "title", void 0);
__decorate([
    IsNotEmpty({ message: 'Nội dung tổng quan không được để trống' }),
    IsString({ message: 'Nội dung tổng quan phải là chuỗi ký tự' }),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", String)
], UpdateLessonSummaryDto.prototype, "overview", void 0);
__decorate([
    IsArray({ message: 'Danh sách ý chính phải là một mảng' }),
    ValidateNested({ each: true }),
    Type(() => LessonSummaryKeyPointDto),
    __metadata("design:type", Array)
], UpdateLessonSummaryDto.prototype, "keyPoints", void 0);
//# sourceMappingURL=update-summary.dto.js.map