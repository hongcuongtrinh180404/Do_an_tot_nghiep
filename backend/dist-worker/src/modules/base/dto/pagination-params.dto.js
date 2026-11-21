var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
export class PaginationParamsDto {
    page = 1;
    limit = 10;
    isPagination = true;
    sort;
    filters;
}
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], PaginationParamsDto.prototype, "page", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    Max(100),
    __metadata("design:type", Number)
], PaginationParamsDto.prototype, "limit", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => {
        if (value === 'true' || value === true)
            return true;
        if (value === 'false' || value === false)
            return false;
        return true;
    }),
    IsBoolean(),
    __metadata("design:type", Boolean)
], PaginationParamsDto.prototype, "isPagination", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed)
                return undefined;
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed))
                    return parsed;
            }
            catch {
            }
            if (trimmed.includes(':')) {
                const [orderBy, order] = trimmed.split(':');
                if (orderBy) {
                    return [{ orderBy, order: order?.toLowerCase() === 'asc' ? 'asc' : 'desc' }];
                }
            }
            return [{ orderBy: trimmed, order: 'desc' }];
        }
        return Array.isArray(value) ? value : undefined;
    }),
    __metadata("design:type", Array)
], PaginationParamsDto.prototype, "sort", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed)
                return undefined;
            try {
                return JSON.parse(trimmed);
            }
            catch {
                return undefined;
            }
        }
        return typeof value === 'object' && value !== null ? value : undefined;
    }),
    __metadata("design:type", Object)
], PaginationParamsDto.prototype, "filters", void 0);
//# sourceMappingURL=pagination-params.dto.js.map