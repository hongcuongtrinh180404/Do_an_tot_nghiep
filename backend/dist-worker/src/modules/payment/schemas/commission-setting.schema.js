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
import { BaseAbstractDocument } from '../../base/index.js';
import { UserEntity } from '../../user/schemas/user.schema.js';
let CommissionSettingEntity = class CommissionSettingEntity extends BaseAbstractDocument {
    defaultRate;
    isCurrent;
    appliedById;
};
__decorate([
    Prop({ type: Number, required: true, default: 30, min: 0, max: 100 }),
    __metadata("design:type", Number)
], CommissionSettingEntity.prototype, "defaultRate", void 0);
__decorate([
    Prop({ type: Boolean, default: true, index: true }),
    __metadata("design:type", Boolean)
], CommissionSettingEntity.prototype, "isCurrent", void 0);
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: UserEntity.name,
        default: null,
    }),
    __metadata("design:type", Object)
], CommissionSettingEntity.prototype, "appliedById", void 0);
CommissionSettingEntity = __decorate([
    Schema({ timestamps: true, collection: 'commission_settings' })
], CommissionSettingEntity);
export { CommissionSettingEntity };
export const CommissionSettingSchema = SchemaFactory.createForClass(CommissionSettingEntity);
CommissionSettingSchema.index({ isCurrent: 1 });
//# sourceMappingURL=commission-setting.schema.js.map