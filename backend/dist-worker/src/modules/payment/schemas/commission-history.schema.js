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
import { BaseAbstractDocument } from '../../base/index.js';
import { UserEntity } from '../../user/schemas/user.schema.js';
let CommissionHistoryEntity = class CommissionHistoryEntity extends BaseAbstractDocument {
    targetType;
    instructorId;
    oldRate;
    newRate;
    reason;
    appliedById;
};
__decorate([
    Prop({
        type: String,
        enum: ['SYSTEM', 'INSTRUCTOR'],
        default: 'INSTRUCTOR',
        index: true,
    }),
    __metadata("design:type", String)
], CommissionHistoryEntity.prototype, "targetType", void 0);
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: UserEntity.name,
        required: false,
        index: true,
    }),
    __metadata("design:type", Object)
], CommissionHistoryEntity.prototype, "instructorId", void 0);
__decorate([
    Prop({ type: Number, required: true, min: 0, max: 100 }),
    __metadata("design:type", Number)
], CommissionHistoryEntity.prototype, "oldRate", void 0);
__decorate([
    Prop({ type: Number, required: true, min: 0, max: 100 }),
    __metadata("design:type", Number)
], CommissionHistoryEntity.prototype, "newRate", void 0);
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], CommissionHistoryEntity.prototype, "reason", void 0);
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: UserEntity.name,
        required: true,
    }),
    __metadata("design:type", Types.ObjectId)
], CommissionHistoryEntity.prototype, "appliedById", void 0);
CommissionHistoryEntity = __decorate([
    Schema({ timestamps: true, collection: 'commission_histories' })
], CommissionHistoryEntity);
export { CommissionHistoryEntity };
export const CommissionHistorySchema = SchemaFactory.createForClass(CommissionHistoryEntity);
CommissionHistorySchema.index({ instructorId: 1, createdAt: -1 });
CommissionHistorySchema.index({ targetType: 1, createdAt: -1 });
//# sourceMappingURL=commission-history.schema.js.map