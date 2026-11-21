var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
export class HideReviewDto {
    reason;
}
__decorate([
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    IsNotEmpty({ message: 'Lý do ẩn đánh giá là bắt buộc' }),
    IsString({ message: 'Lý do ẩn đánh giá phải là chuỗi ký tự' }),
    MaxLength(500, { message: 'Lý do ẩn đánh giá tối đa 500 ký tự' }),
    __metadata("design:type", String)
], HideReviewDto.prototype, "reason", void 0);
//# sourceMappingURL=hide-review.dto.js.map