var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsInt, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
export class UpdateReviewDto {
    rating;
    comment;
}
__decorate([
    IsOptional(),
    IsInt({ message: 'Số sao đánh giá phải là số nguyên' }),
    Min(1, { message: 'Số sao tối thiểu là 1' }),
    Max(5, { message: 'Số sao tối đa là 5' }),
    __metadata("design:type", Number)
], UpdateReviewDto.prototype, "rating", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed.length > 0 ? trimmed : null;
        }
        return null;
    }),
    IsString({ message: 'Nội dung nhận xét phải là chuỗi ký tự' }),
    MaxLength(2000, { message: 'Nội dung nhận xét tối đa 2000 ký tự' }),
    __metadata("design:type", Object)
], UpdateReviewDto.prototype, "comment", void 0);
//# sourceMappingURL=update-review.dto.js.map