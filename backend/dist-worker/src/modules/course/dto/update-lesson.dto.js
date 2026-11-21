var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsOptional, IsString, MinLength, MaxLength, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
export class UpdateLessonDto {
    title;
    isPreview;
}
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    IsString({ message: 'Tiêu đề bài học phải là chuỗi ký tự' }),
    MinLength(1, { message: 'Tiêu đề bài học không được để trống' }),
    MaxLength(200, { message: 'Tiêu đề bài học không được vượt quá 200 ký tự' }),
    __metadata("design:type", String)
], UpdateLessonDto.prototype, "title", void 0);
__decorate([
    IsOptional(),
    IsBoolean({ message: 'Trạng thái học thử phải là boolean' }),
    __metadata("design:type", Boolean)
], UpdateLessonDto.prototype, "isPreview", void 0);
//# sourceMappingURL=update-lesson.dto.js.map