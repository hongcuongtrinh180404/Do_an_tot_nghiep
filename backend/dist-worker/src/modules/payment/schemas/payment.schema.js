var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import { ReconciliationStatusEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
import { OrderEntity } from '../../enrollment/schemas/order.schema.js';
let PaymentEntity = class PaymentEntity extends BaseAbstractDocument {
    orderId;
    orderCode;
    sepayTransactionId;
    amountIn;
    bankBrandName;
    accountNumber;
    transactionDate;
    content;
    reconciliationStatus;
    rawPayload;
    appliedAt;
    verifiedAt;
    payloadHash;
    excessAmount;
    resolution;
    auditHistory;
};
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: OrderEntity.name,
        default: null,
        index: true,
    }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "orderId", void 0);
__decorate([
    Prop({ type: String, default: null, trim: true, index: true }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "orderCode", void 0);
__decorate([
    Prop({ type: String, required: true, unique: true, trim: true, index: true }),
    __metadata("design:type", String)
], PaymentEntity.prototype, "sepayTransactionId", void 0);
__decorate([
    Prop({ type: Number, required: true, min: [0, 'Received amount cannot be negative'] }),
    __metadata("design:type", Number)
], PaymentEntity.prototype, "amountIn", void 0);
__decorate([
    Prop({ type: String, default: '', trim: true }),
    __metadata("design:type", String)
], PaymentEntity.prototype, "bankBrandName", void 0);
__decorate([
    Prop({ type: String, default: '', trim: true }),
    __metadata("design:type", String)
], PaymentEntity.prototype, "accountNumber", void 0);
__decorate([
    Prop({ type: Date, default: null }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "transactionDate", void 0);
__decorate([
    Prop({ type: String, default: '', trim: true }),
    __metadata("design:type", String)
], PaymentEntity.prototype, "content", void 0);
__decorate([
    Prop({
        type: String,
        enum: Object.values(ReconciliationStatusEnum),
        default: ReconciliationStatusEnum.MATCHED,
        index: true,
    }),
    __metadata("design:type", String)
], PaymentEntity.prototype, "reconciliationStatus", void 0);
__decorate([
    Prop({ type: MongooseSchema.Types.Mixed, default: {} }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "rawPayload", void 0);
__decorate([
    Prop({ type: Date, default: null }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "appliedAt", void 0);
__decorate([
    Prop({ type: Date }),
    __metadata("design:type", Date)
], PaymentEntity.prototype, "verifiedAt", void 0);
__decorate([
    Prop({ type: String }),
    __metadata("design:type", String)
], PaymentEntity.prototype, "payloadHash", void 0);
__decorate([
    Prop({ type: Number, default: 0, min: 0 }),
    __metadata("design:type", Number)
], PaymentEntity.prototype, "excessAmount", void 0);
__decorate([
    Prop({ type: MongooseSchema.Types.Mixed, default: null }),
    __metadata("design:type", Object)
], PaymentEntity.prototype, "resolution", void 0);
__decorate([
    Prop({ type: [MongooseSchema.Types.Mixed], default: [] }),
    __metadata("design:type", Array)
], PaymentEntity.prototype, "auditHistory", void 0);
PaymentEntity = __decorate([
    Schema({ timestamps: true, collection: 'payments' })
], PaymentEntity);
export { PaymentEntity };
export const PaymentSchema = SchemaFactory.createForClass(PaymentEntity);
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ orderCode: 1, reconciliationStatus: 1 });
//# sourceMappingURL=payment.schema.js.map