var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsOptional, IsString, IsEnum, IsInt, Min, Max, } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CourseLevelEnum } from 'share-lib';
export class QueryPublicCoursesDto {
    q;
    category;
    level;
    priceRange;
    sort;
    instructorId;
    page = 1;
    limit = 10;
}
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", String)
], QueryPublicCoursesDto.prototype, "q", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", String)
], QueryPublicCoursesDto.prototype, "category", void 0);
__decorate([
    IsOptional(),
    IsEnum(CourseLevelEnum),
    __metadata("design:type", String)
], QueryPublicCoursesDto.prototype, "level", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], QueryPublicCoursesDto.prototype, "priceRange", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], QueryPublicCoursesDto.prototype, "sort", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", String)
], QueryPublicCoursesDto.prototype, "instructorId", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], QueryPublicCoursesDto.prototype, "page", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    Max(100),
    __metadata("design:type", Number)
], QueryPublicCoursesDto.prototype, "limit", void 0);
//# sourceMappingURL=query-public-courses.dto.js.map