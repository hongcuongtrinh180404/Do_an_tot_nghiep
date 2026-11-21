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
import { InstructorApplicationStatusEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
import { UserEntity } from '../../user/schemas/user.schema.js';
let InstructorApplicationEntity = class InstructorApplicationEntity extends BaseAbstractDocument {
    userId;
    applicantName;
    email;
    phone;
    avatarUrl;
    expertises;
    bio;
    experience;
    cvFileName;
    cvFileUrl;
    status;
    rejectionReason;
    reviewedById;
    reviewedByName;
    reviewedAt;
    history;
};
__decorate([
    Prop({ type: MongooseSchema.Types.ObjectId, ref: UserEntity.name, required: true, index: true }),
    __metadata("design:type", Types.ObjectId)
], InstructorApplicationEntity.prototype, "userId", void 0);
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], InstructorApplicationEntity.prototype, "applicantName", void 0);
__decorate([
    Prop({ type: String, required: true, lowercase: true, trim: true }),
    __metadata("design:type", String)
], InstructorApplicationEntity.prototype, "email", void 0);
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], InstructorApplicationEntity.prototype, "phone", void 0);
__decorate([
    Prop({ type: String, required: false, default: null }),
    __metadata("design:type", Object)
], InstructorApplicationEntity.prototype, "avatarUrl", void 0);
__decorate([
    Prop({ type: [String], default: [] }),
    __metadata("design:type", Array)
], InstructorApplicationEntity.prototype, "expertises", void 0);
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], InstructorApplicationEntity.prototype, "bio", void 0);
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], InstructorApplicationEntity.prototype, "experience", void 0);
__decorate([
    Prop({ type: String, required: false, default: null }),
    __metadata("design:type", Object)
], InstructorApplicationEntity.prototype, "cvFileName", void 0);
__decorate([
    Prop({ type: String, required: false, default: null }),
    __metadata("design:type", Object)
], InstructorApplicationEntity.prototype, "cvFileUrl", void 0);
__decorate([
    Prop({
        type: String,
        enum: Object.values(InstructorApplicationStatusEnum),
        default: InstructorApplicationStatusEnum.PENDING,
        index: true,
    }),
    __metadata("design:type", String)
], InstructorApplicationEntity.prototype, "status", void 0);
__decorate([
    Prop({ type: String, required: false, default: null, trim: true }),
    __metadata("design:type", Object)
], InstructorApplicationEntity.prototype, "rejectionReason", void 0);
__decorate([
    Prop({ type: MongooseSchema.Types.ObjectId, ref: UserEntity.name, required: false, default: null }),
    __metadata("design:type", Object)
], InstructorApplicationEntity.prototype, "reviewedById", void 0);
__decorate([
    Prop({ type: String, required: false, default: null, trim: true }),
    __metadata("design:type", Object)
], InstructorApplicationEntity.prototype, "reviewedByName", void 0);
__decorate([
    Prop({ type: Date, required: false, default: null }),
    __metadata("design:type", Object)
], InstructorApplicationEntity.prototype, "reviewedAt", void 0);
__decorate([
    Prop({
        type: [
            {
                action: { type: String, required: true },
                actorId: { type: MongooseSchema.Types.ObjectId, ref: UserEntity.name, required: true },
                actorName: { type: String, required: true, trim: true },
                actorRole: { type: String, required: true },
                comment: { type: String, required: false, default: null, trim: true },
                timestamp: { type: Date, required: true, default: Date.now },
            },
        ],
        default: [],
    }),
    __metadata("design:type", Array)
], InstructorApplicationEntity.prototype, "history", void 0);
InstructorApplicationEntity = __decorate([
    Schema({ timestamps: true, collection: 'instructor_applications' })
], InstructorApplicationEntity);
export { InstructorApplicationEntity };
export const InstructorApplicationModelSchema = SchemaFactory.createForClass(InstructorApplicationEntity);
InstructorApplicationModelSchema.index({ status: 1, createdAt: -1 });
InstructorApplicationModelSchema.index({ email: 1 });
InstructorApplicationModelSchema.index({ userId: 1 });
//# sourceMappingURL=instructor-application.schema.js.map