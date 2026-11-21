var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsOptional, IsString, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaginationParamsDto } from '../../base/dto/pagination-params.dto.js';
export class AdminQueryReviewsDto extends PaginationParamsDto {
    search;
    status;
    rating;
    courseId;
    hasReports;
    startDate;
    endDate;
}
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : undefined),
    __metadata("design:type", String)
], AdminQueryReviewsDto.prototype, "search", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : undefined),
    __metadata("design:type", String)
], AdminQueryReviewsDto.prototype, "status", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    Max(5),
    __metadata("design:type", Number)
], AdminQueryReviewsDto.prototype, "rating", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : undefined),
    __metadata("design:type", String)
], AdminQueryReviewsDto.prototype, "courseId", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => {
        if (value === 'true' || value === true)
            return true;
        if (value === 'false' || value === false)
            return false;
        return undefined;
    }),
    IsBoolean(),
    __metadata("design:type", Boolean)
], AdminQueryReviewsDto.prototype, "hasReports", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], AdminQueryReviewsDto.prototype, "startDate", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], AdminQueryReviewsDto.prototype, "endDate", void 0);
//# sourceMappingURL=admin-query-reviews.dto.js.map