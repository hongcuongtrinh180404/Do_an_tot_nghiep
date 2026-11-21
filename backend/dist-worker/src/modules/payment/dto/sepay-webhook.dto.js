var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
export class SepayWebhookDto {
    id;
    gateway;
    transactionDate;
    accountNumber;
    code;
    content;
    transferType;
    transferAmount;
    accumulated;
    subAccount;
    referenceCode;
    description;
}
__decorate([
    IsNotEmpty({ message: 'id giao dịch SePay không được để trống' }),
    Transform(({ value }) => typeof value === 'number' && Number.isSafeInteger(value) ? String(value) : value),
    IsString(),
    Matches(/^(0|[1-9]\d{0,19})$/),
    __metadata("design:type", Object)
], SepayWebhookDto.prototype, "id", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], SepayWebhookDto.prototype, "gateway", void 0);
__decorate([
    IsNotEmpty(),
    IsString(),
    __metadata("design:type", String)
], SepayWebhookDto.prototype, "transactionDate", void 0);
__decorate([
    IsNotEmpty({ message: 'accountNumber không được để trống' }),
    IsString(),
    MaxLength(64),
    __metadata("design:type", String)
], SepayWebhookDto.prototype, "accountNumber", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(128),
    __metadata("design:type", Object)
], SepayWebhookDto.prototype, "code", void 0);
__decorate([
    IsNotEmpty({ message: 'content không được để trống' }),
    IsString(),
    MaxLength(5000),
    __metadata("design:type", String)
], SepayWebhookDto.prototype, "content", void 0);
__decorate([
    IsNotEmpty({ message: 'transferType không được để trống' }),
    IsString(),
    IsIn(['in', 'out']),
    __metadata("design:type", String)
], SepayWebhookDto.prototype, "transferType", void 0);
__decorate([
    IsNotEmpty({ message: 'transferAmount không được để trống' }),
    IsInt({ message: 'transferAmount phải là số nguyên VND' }),
    Min(1),
    Max(Number.MAX_SAFE_INTEGER),
    __metadata("design:type", Number)
], SepayWebhookDto.prototype, "transferAmount", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    __metadata("design:type", Number)
], SepayWebhookDto.prototype, "accumulated", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", Object)
], SepayWebhookDto.prototype, "subAccount", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", Object)
], SepayWebhookDto.prototype, "referenceCode", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", Object)
], SepayWebhookDto.prototype, "description", void 0);
//# sourceMappingURL=sepay-webhook.dto.js.map