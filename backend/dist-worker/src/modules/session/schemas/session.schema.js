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
let SessionEntity = class SessionEntity extends BaseAbstractDocument {
    userId;
    refreshTokenHash;
    previousRefreshTokenHash;
    hashRotatedAt;
    expiresAt;
    isRevoked;
};
__decorate([
    Prop({ type: MongooseSchema.Types.ObjectId, required: true, ref: 'UserEntity', index: true }),
    __metadata("design:type", Types.ObjectId)
], SessionEntity.prototype, "userId", void 0);
__decorate([
    Prop({ type: String, required: true, index: true }),
    __metadata("design:type", String)
], SessionEntity.prototype, "refreshTokenHash", void 0);
__decorate([
    Prop({ type: String, default: null, index: true }),
    __metadata("design:type", Object)
], SessionEntity.prototype, "previousRefreshTokenHash", void 0);
__decorate([
    Prop({ type: Date, default: null }),
    __metadata("design:type", Object)
], SessionEntity.prototype, "hashRotatedAt", void 0);
__decorate([
    Prop({ type: Date, required: true }),
    __metadata("design:type", Date)
], SessionEntity.prototype, "expiresAt", void 0);
__decorate([
    Prop({ type: Boolean, default: false }),
    __metadata("design:type", Boolean)
], SessionEntity.prototype, "isRevoked", void 0);
SessionEntity = __decorate([
    Schema({ timestamps: true, collection: 'sessions' })
], SessionEntity);
export { SessionEntity };
export const SessionSchema = SchemaFactory.createForClass(SessionEntity);
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SessionSchema.index({ userId: 1, isRevoked: 1 });
//# sourceMappingURL=session.schema.js.map