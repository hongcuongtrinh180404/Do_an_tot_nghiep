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
import { Schema as MongooseSchema, Types } from 'mongoose';
import { OrderStatusEnum, ReconciliationStatusEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
import { UserEntity } from '../../user/schemas/user.schema.js';
import { CourseEntity } from '../../course/schemas/course.schema.js';
let OrderEntity = class OrderEntity extends BaseAbstractDocument {
    orderCode;
    userId;
    courseId;
    instructorId;
    amount;
    originalPrice;
    discountAmount;
    paymentMethod;
    expiresAt;
    paidAt;
    platformCommissionRate;
    platformEarnings;
    instructorCommissionRate;
    instructorEarnings;
    pendingCheckoutKey;
    paymentRevision;
    receivedAmount;
    lastPaymentStatus;
    courseSnapshot;
    bankSnapshot;
    status;
};
__decorate([
    Prop({ type: String, required: true, unique: true, trim: true, index: true }),
    __metadata("design:type", String)
], OrderEntity.prototype, "orderCode", void 0);
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: UserEntity.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", Types.ObjectId)
], OrderEntity.prototype, "userId", void 0);
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: CourseEntity.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", Types.ObjectId)
], OrderEntity.prototype, "courseId", void 0);
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: UserEntity.name,
        default: null,
        index: true,
    }),
    __metadata("design:type", Object)
], OrderEntity.prototype, "instructorId", void 0);
__decorate([
    Prop({ type: Number, required: true, min: [0, 'Order amount cannot be negative'] }),
    __metadata("design:type", Number)
], OrderEntity.prototype, "amount", void 0);
__decorate([
    Prop({ type: Number, default: 0, min: [0, 'Original price cannot be negative'] }),
    __metadata("design:type", Number)
], OrderEntity.prototype, "originalPrice", void 0);
__decorate([
    Prop({ type: Number, default: 0, min: [0, 'Discount amount cannot be negative'] }),
    __metadata("design:type", Number)
], OrderEntity.prototype, "discountAmount", void 0);
__decorate([
    Prop({ type: String, default: 'SEPAY_BANK_TRANSFER', trim: true }),
    __metadata("design:type", String)
], OrderEntity.prototype, "paymentMethod", void 0);
__decorate([
    Prop({ type: Date, index: true }),
    __metadata("design:type", Date)
], OrderEntity.prototype, "expiresAt", void 0);
__decorate([
    Prop({ type: Date, default: null }),
    __metadata("design:type", Object)
], OrderEntity.prototype, "paidAt", void 0);
__decorate([
    Prop({ type: Number, default: 30, min: 0, max: 100 }),
    __metadata("design:type", Number)
], OrderEntity.prototype, "platformCommissionRate", void 0);
__decorate([
    Prop({ type: Number, default: 0, min: 0 }),
    __metadata("design:type", Number)
], OrderEntity.prototype, "platformEarnings", void 0);
__decorate([
    Prop({ type: Number, default: 0.7, min: 0, max: 1 }),
    __metadata("design:type", Number)
], OrderEntity.prototype, "instructorCommissionRate", void 0);
__decorate([
    Prop({ type: Number, default: 0, min: 0 }),
    __metadata("design:type", Number)
], OrderEntity.prototype, "instructorEarnings", void 0);
__decorate([
    Prop({ type: String, required: false }),
    __metadata("design:type", String)
], OrderEntity.prototype, "pendingCheckoutKey", void 0);
__decorate([
    Prop({ type: Number, default: 0 }),
    __metadata("design:type", Number)
], OrderEntity.prototype, "paymentRevision", void 0);
__decorate([
    Prop({ type: Number, default: 0, min: 0 }),
    __metadata("design:type", Number)
], OrderEntity.prototype, "receivedAmount", void 0);
__decorate([
    Prop({ type: String, enum: Object.values(ReconciliationStatusEnum) }),
    __metadata("design:type", String)
], OrderEntity.prototype, "lastPaymentStatus", void 0);
__decorate([
    Prop({ type: MongooseSchema.Types.Mixed }),
    __metadata("design:type", Object)
], OrderEntity.prototype, "courseSnapshot", void 0);
__decorate([
    Prop({ type: MongooseSchema.Types.Mixed }),
    __metadata("design:type", Object)
], OrderEntity.prototype, "bankSnapshot", void 0);
__decorate([
    Prop({
        type: String,
        enum: Object.values(OrderStatusEnum),
        default: OrderStatusEnum.PENDING,
        index: true,
    }),
    __metadata("design:type", String)
], OrderEntity.prototype, "status", void 0);
OrderEntity = __decorate([
    Schema({ timestamps: true, collection: 'orders' })
], OrderEntity);
export { OrderEntity };
export const OrderSchema = SchemaFactory.createForClass(OrderEntity);
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ userId: 1, courseId: 1, status: 1 });
OrderSchema.index({ instructorId: 1, status: 1, paidAt: -1 });
OrderSchema.index({ status: 1, paidAt: -1 });
OrderSchema.index({ pendingCheckoutKey: 1 }, { unique: true, sparse: true, name: 'unique_pending_checkout' });
//# sourceMappingURL=order.schema.js.map