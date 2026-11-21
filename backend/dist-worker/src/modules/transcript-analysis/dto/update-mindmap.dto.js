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
export class LessonMindmapNodeDto {
    id;
    title;
    timestamp;
    children;
}
__decorate([
    IsNotEmpty({ message: 'ID của node không được để trống' }),
    IsString({ message: 'ID của node phải là chuỗi ký tự' }),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", String)
], LessonMindmapNodeDto.prototype, "id", void 0);
__decorate([
    IsNotEmpty({ message: 'Tiêu đề của node không được để trống' }),
    IsString({ message: 'Tiêu đề của node phải là chuỗi ký tự' }),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", String)
], LessonMindmapNodeDto.prototype, "title", void 0);
__decorate([
    IsNumber({}, { message: 'Timestamp phải là số giây hợp lệ' }),
    Min(0, { message: 'Timestamp không được âm' }),
    Transform(({ value }) => {
        if (value === null || value === undefined || value === '')
            return 0;
        const num = Number(value);
        return isNaN(num) ? value : Math.max(0, Math.floor(num));
    }),
    __metadata("design:type", Number)
], LessonMindmapNodeDto.prototype, "timestamp", void 0);
__decorate([
    IsOptional(),
    IsArray({ message: 'Danh sách node con phải là mảng' }),
    ValidateNested({ each: true }),
    Type(() => LessonMindmapNodeDto),
    Transform(({ value }) => (value === null ? undefined : value)),
    __metadata("design:type", Array)
], LessonMindmapNodeDto.prototype, "children", void 0);
export class LessonMindmapDataDto {
    root;
}
__decorate([
    ValidateNested(),
    Type(() => LessonMindmapNodeDto),
    __metadata("design:type", LessonMindmapNodeDto)
], LessonMindmapDataDto.prototype, "root", void 0);
export class UpdateLessonMindmapDto {
    mindmap;
}
__decorate([
    ValidateNested(),
    Type(() => LessonMindmapDataDto),
    __metadata("design:type", LessonMindmapDataDto)
], UpdateLessonMindmapDto.prototype, "mindmap", void 0);
//# sourceMappingURL=update-mindmap.dto.js.map