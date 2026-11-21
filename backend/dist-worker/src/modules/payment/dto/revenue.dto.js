var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsOptional, IsString, IsNumber, Min, Max, IsNotEmpty, IsIn, } from 'class-validator';
import { Type, Transform } from 'class-transformer';
export class RevenueTimeRangeQueryDto {
    timeRange;
    startDate;
    endDate;
}
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : undefined),
    __metadata("design:type", String)
], RevenueTimeRangeQueryDto.prototype, "timeRange", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : undefined),
    __metadata("design:type", String)
], RevenueTimeRangeQueryDto.prototype, "startDate", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : undefined),
    __metadata("design:type", String)
], RevenueTimeRangeQueryDto.prototype, "endDate", void 0);
export class RevenueTransactionsQueryDto extends RevenueTimeRangeQueryDto {
    page = 1;
    limit = 10;
    search;
    sort = 'newest';
    status;
}
__decorate([
    IsOptional(),
    Type(() => Number),
    IsNumber(),
    Min(1),
    __metadata("design:type", Number)
], RevenueTransactionsQueryDto.prototype, "page", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsNumber(),
    Min(1),
    Max(100),
    __metadata("design:type", Number)
], RevenueTransactionsQueryDto.prototype, "limit", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : undefined),
    __metadata("design:type", String)
], RevenueTransactionsQueryDto.prototype, "search", void 0);
__decorate([
    IsOptional(),
    IsString(),
    IsIn(['newest', 'oldest', 'amount_desc', 'amount_asc']),
    __metadata("design:type", String)
], RevenueTransactionsQueryDto.prototype, "sort", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : undefined),
    __metadata("design:type", String)
], RevenueTransactionsQueryDto.prototype, "status", void 0);
export class InstructorsRevenueQueryDto extends RevenueTimeRangeQueryDto {
    page = 1;
    limit = 10;
    search;
    sort = 'revenue_desc';
}
__decorate([
    IsOptional(),
    Type(() => Number),
    IsNumber(),
    Min(1),
    __metadata("design:type", Number)
], InstructorsRevenueQueryDto.prototype, "page", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsNumber(),
    Min(1),
    Max(100),
    __metadata("design:type", Number)
], InstructorsRevenueQueryDto.prototype, "limit", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : undefined),
    __metadata("design:type", String)
], InstructorsRevenueQueryDto.prototype, "search", void 0);
__decorate([
    IsOptional(),
    IsString(),
    IsIn([
        'revenue_desc',
        'revenue_asc',
        'sales_desc',
        'courses_desc',
        'commission_desc',
        'commission_asc',
    ]),
    __metadata("design:type", String)
], InstructorsRevenueQueryDto.prototype, "sort", void 0);
export class UpdateCommissionConfigDto {
    defaultRate;
    reason;
}
__decorate([
    IsNumber({ maxDecimalPlaces: 2 }, { message: 'Tỷ lệ hoa hồng phải là số hợp lệ (tối đa 2 chữ số thập phân)' }),
    Min(0, { message: 'Tỷ lệ hoa hồng không được nhỏ hơn 0%' }),
    Max(100, { message: 'Tỷ lệ hoa hồng không được vượt quá 100%' }),
    __metadata("design:type", Number)
], UpdateCommissionConfigDto.prototype, "defaultRate", void 0);
__decorate([
    IsOptional(),
    IsString({ message: 'Lý do thay đổi hoa hồng phải là chuỗi ký tự' }),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : undefined),
    __metadata("design:type", String)
], UpdateCommissionConfigDto.prototype, "reason", void 0);
export class UpdateInstructorCommissionDto {
    commissionRate;
    reason;
}
__decorate([
    IsNumber({ maxDecimalPlaces: 2 }, { message: 'Tỷ lệ hoa hồng phải là số hợp lệ (tối đa 2 chữ số thập phân)' }),
    Min(0, { message: 'Tỷ lệ hoa hồng không được nhỏ hơn 0%' }),
    Max(100, { message: 'Tỷ lệ hoa hồng không được vượt quá 100%' }),
    __metadata("design:type", Number)
], UpdateInstructorCommissionDto.prototype, "commissionRate", void 0);
__decorate([
    IsString({ message: 'Lý do thay đổi hoa hồng là bắt buộc' }),
    IsNotEmpty({ message: 'Lý do thay đổi hoa hồng không được để trống' }),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : ''),
    __metadata("design:type", String)
], UpdateInstructorCommissionDto.prototype, "reason", void 0);
//# sourceMappingURL=revenue.dto.js.map