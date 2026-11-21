var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsOptional, IsString, IsNumber, Min, Max, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';
export class InstructorQueryReviewsDto {
    courseId;
    rating;
    sort = 'created_desc';
    page = 1;
    limit = 10;
}
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => typeof value === 'string' && value.trim() ? value.trim() : undefined),
    __metadata("design:type", String)
], InstructorQueryReviewsDto.prototype, "courseId", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsNumber(),
    Min(1),
    Max(5),
    __metadata("design:type", Number)
], InstructorQueryReviewsDto.prototype, "rating", void 0);
__decorate([
    IsOptional(),
    IsString(),
    IsIn(['created_desc', 'created_asc']),
    __metadata("design:type", String)
], InstructorQueryReviewsDto.prototype, "sort", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsNumber(),
    Min(1),
    __metadata("design:type", Number)
], InstructorQueryReviewsDto.prototype, "page", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsNumber(),
    Min(1),
    Max(100),
    __metadata("design:type", Number)
], InstructorQueryReviewsDto.prototype, "limit", void 0);
//# sourceMappingURL=instructor-query-reviews.dto.js.map