var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
export class QueryReviewsDto {
    page = 1;
    limit = 10;
}
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt({ message: 'Số trang phải là số nguyên' }),
    Min(1, { message: 'Số trang tối thiểu là 1' }),
    __metadata("design:type", Number)
], QueryReviewsDto.prototype, "page", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt({ message: 'Số lượng mục trên trang phải là số nguyên' }),
    Min(1, { message: 'Số lượng tối thiểu là 1' }),
    Max(50, { message: 'Số lượng tối đa là 50' }),
    __metadata("design:type", Number)
], QueryReviewsDto.prototype, "limit", void 0);
//# sourceMappingURL=query-reviews.dto.js.map