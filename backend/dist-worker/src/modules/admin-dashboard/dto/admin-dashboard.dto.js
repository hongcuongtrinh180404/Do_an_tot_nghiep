var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsOptional, IsString, IsIn, IsNumber, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
export class AdminDashboardQueryDto {
    period = 'this_month';
    startDate;
    endDate;
    groupBy;
}
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)),
    IsIn([
        'today',
        'yesterday',
        '7d',
        '7days',
        '30d',
        '30days',
        'this_month',
        'thismonth',
        'last_month',
        'lastmonth',
        'this_year',
        'thisyear',
        'custom',
        'all',
    ]),
    __metadata("design:type", String)
], AdminDashboardQueryDto.prototype, "period", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", String)
], AdminDashboardQueryDto.prototype, "startDate", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", String)
], AdminDashboardQueryDto.prototype, "endDate", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)),
    IsIn(['day', 'month']),
    __metadata("design:type", String)
], AdminDashboardQueryDto.prototype, "groupBy", void 0);
export class AdminCoursesPerformanceQueryDto extends AdminDashboardQueryDto {
    categoryId;
    instructorId;
    tab;
    limit = 10;
}
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", String)
], AdminCoursesPerformanceQueryDto.prototype, "categoryId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    __metadata("design:type", String)
], AdminCoursesPerformanceQueryDto.prototype, "instructorId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)),
    IsIn(['revenue', 'enrollment', 'completion']),
    __metadata("design:type", String)
], AdminCoursesPerformanceQueryDto.prototype, "tab", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsNumber(),
    Min(1),
    __metadata("design:type", Number)
], AdminCoursesPerformanceQueryDto.prototype, "limit", void 0);
export class AdminInstructorsRankingQueryDto extends AdminDashboardQueryDto {
    sortBy = 'grossRevenue';
    limit = 5;
}
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => {
        if (typeof value !== 'string')
            return value;
        const v = value.trim().toLowerCase();
        if (v === 'grossrevenue' || v === 'gross_revenue')
            return 'grossRevenue';
        if (v === 'salescount' || v === 'sales_count')
            return 'salesCount';
        if (v === 'netrevenue' || v === 'net_revenue')
            return 'netRevenue';
        return value.trim();
    }),
    IsIn(['grossRevenue', 'salesCount', 'netRevenue']),
    __metadata("design:type", String)
], AdminInstructorsRankingQueryDto.prototype, "sortBy", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsNumber(),
    Min(1),
    __metadata("design:type", Number)
], AdminInstructorsRankingQueryDto.prototype, "limit", void 0);
//# sourceMappingURL=admin-dashboard.dto.js.map