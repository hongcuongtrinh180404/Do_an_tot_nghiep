var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
export class ReconciliationQueryDto {
    page = 1;
    limit = 20;
}
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Object)
], ReconciliationQueryDto.prototype, "page", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    Max(100),
    __metadata("design:type", Object)
], ReconciliationQueryDto.prototype, "limit", void 0);
export class ReprocessPaymentDto {
    orderCode;
    note;
}
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value),
    Matches(/^MD(?:[A-Z0-9]{10}|\d{5})$/),
    __metadata("design:type", String)
], ReprocessPaymentDto.prototype, "orderCode", void 0);
__decorate([
    IsString(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    MinLength(5),
    MaxLength(1000),
    __metadata("design:type", String)
], ReprocessPaymentDto.prototype, "note", void 0);
export class ResolvePaymentDto {
    type;
    note;
    bankReference;
    refundedAmount;
}
__decorate([
    IsIn(['ACKNOWLEDGED', 'REFUNDED']),
    __metadata("design:type", String)
], ResolvePaymentDto.prototype, "type", void 0);
__decorate([
    IsString(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    MinLength(5),
    MaxLength(1000),
    __metadata("design:type", String)
], ResolvePaymentDto.prototype, "note", void 0);
__decorate([
    ValidateIf((dto) => dto.type === 'REFUNDED' || dto.bankReference !== undefined),
    IsString(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    MinLength(3),
    MaxLength(128),
    __metadata("design:type", String)
], ResolvePaymentDto.prototype, "bankReference", void 0);
__decorate([
    ValidateIf((dto) => dto.type === 'REFUNDED' || dto.refundedAmount !== undefined),
    IsInt(),
    Min(1),
    Max(Number.MAX_SAFE_INTEGER),
    __metadata("design:type", Number)
], ResolvePaymentDto.prototype, "refundedAmount", void 0);
//# sourceMappingURL=reconciliation.dto.js.map