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
import { RoleEnum, UserStatusEnum, AuthProviderEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
let UserEntity = class UserEntity extends BaseAbstractDocument {
    email;
    passwordHash;
    fullName;
    username;
    avatarUrl;
    googleSub;
    provider;
    providerId;
    bio;
    socialLinks;
    role;
    status;
    commissionRate;
    commissionRateUpdatedAt;
    commissionRateUpdatedById;
    isEmailVerified;
    emailVerificationToken;
    emailVerificationExpires;
    passwordResetTokenHash;
    passwordResetExpires;
    passwordResetRequestedAt;
    pendingNewEmail;
    emailChangeTokenHash;
    emailChangeExpires;
    emailChangeRequestedAt;
};
__decorate([
    Prop({ type: String, required: true, lowercase: true, trim: true }),
    __metadata("design:type", String)
], UserEntity.prototype, "email", void 0);
__decorate([
    Prop({ type: String, required: false, select: false, default: null }),
    __metadata("design:type", Object)
], UserEntity.prototype, "passwordHash", void 0);
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], UserEntity.prototype, "fullName", void 0);
__decorate([
    Prop({ type: String, required: false, default: null, lowercase: true, trim: true }),
    __metadata("design:type", Object)
], UserEntity.prototype, "username", void 0);
__decorate([
    Prop({ type: String, required: false, default: null }),
    __metadata("design:type", Object)
], UserEntity.prototype, "avatarUrl", void 0);
__decorate([
    Prop({ type: String, required: false, default: null, trim: true }),
    __metadata("design:type", Object)
], UserEntity.prototype, "googleSub", void 0);
__decorate([
    Prop({
        type: String,
        enum: Object.values(AuthProviderEnum),
        default: AuthProviderEnum.LOCAL,
    }),
    __metadata("design:type", String)
], UserEntity.prototype, "provider", void 0);
__decorate([
    Prop({ type: String, required: false, default: null, trim: true }),
    __metadata("design:type", Object)
], UserEntity.prototype, "providerId", void 0);
__decorate([
    Prop({ type: String, required: false, default: null, trim: true }),
    __metadata("design:type", Object)
], UserEntity.prototype, "bio", void 0);
__decorate([
    Prop({
        type: {
            facebook: { type: String, default: null, trim: true },
            youtube: { type: String, default: null, trim: true },
            linkedin: { type: String, default: null, trim: true },
            github: { type: String, default: null, trim: true },
        },
        _id: false,
        default: null,
    }),
    __metadata("design:type", Object)
], UserEntity.prototype, "socialLinks", void 0);
__decorate([
    Prop({
        type: String,
        enum: Object.values(RoleEnum),
        default: RoleEnum.STUDENT,
        index: true,
    }),
    __metadata("design:type", String)
], UserEntity.prototype, "role", void 0);
__decorate([
    Prop({
        type: String,
        enum: Object.values(UserStatusEnum),
        default: UserStatusEnum.ACTIVE,
        index: true,
    }),
    __metadata("design:type", String)
], UserEntity.prototype, "status", void 0);
__decorate([
    Prop({ type: Number, default: 30, min: 0, max: 100 }),
    __metadata("design:type", Number)
], UserEntity.prototype, "commissionRate", void 0);
__decorate([
    Prop({ type: Date, default: null }),
    __metadata("design:type", Object)
], UserEntity.prototype, "commissionRateUpdatedAt", void 0);
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: 'UserEntity',
        default: null,
    }),
    __metadata("design:type", Object)
], UserEntity.prototype, "commissionRateUpdatedById", void 0);
__decorate([
    Prop({ type: Boolean, default: false, index: true }),
    __metadata("design:type", Boolean)
], UserEntity.prototype, "isEmailVerified", void 0);
__decorate([
    Prop({ type: String, required: false, default: null, select: false }),
    __metadata("design:type", Object)
], UserEntity.prototype, "emailVerificationToken", void 0);
__decorate([
    Prop({ type: Date, required: false, default: null, select: false }),
    __metadata("design:type", Object)
], UserEntity.prototype, "emailVerificationExpires", void 0);
__decorate([
    Prop({ type: String, required: false, default: null, select: false }),
    __metadata("design:type", Object)
], UserEntity.prototype, "passwordResetTokenHash", void 0);
__decorate([
    Prop({ type: Date, required: false, default: null, select: false }),
    __metadata("design:type", Object)
], UserEntity.prototype, "passwordResetExpires", void 0);
__decorate([
    Prop({ type: Date, required: false, default: null, select: false }),
    __metadata("design:type", Object)
], UserEntity.prototype, "passwordResetRequestedAt", void 0);
__decorate([
    Prop({ type: String, required: false, default: null, lowercase: true, trim: true, select: false }),
    __metadata("design:type", Object)
], UserEntity.prototype, "pendingNewEmail", void 0);
__decorate([
    Prop({ type: String, required: false, default: null, select: false }),
    __metadata("design:type", Object)
], UserEntity.prototype, "emailChangeTokenHash", void 0);
__decorate([
    Prop({ type: Date, required: false, default: null, select: false }),
    __metadata("design:type", Object)
], UserEntity.prototype, "emailChangeExpires", void 0);
__decorate([
    Prop({ type: Date, required: false, default: null, select: false }),
    __metadata("design:type", Object)
], UserEntity.prototype, "emailChangeRequestedAt", void 0);
UserEntity = __decorate([
    Schema({ timestamps: true, collection: 'users' })
], UserEntity);
export { UserEntity };
export const UserSchema = SchemaFactory.createForClass(UserEntity);
UserSchema.index({ email: 1 }, {
    unique: true,
    partialFilterExpression: { deletedAt: null },
});
UserSchema.index({ username: 1 }, {
    unique: true,
    partialFilterExpression: {
        deletedAt: null,
        username: { $type: 'string' },
    },
});
UserSchema.index({ googleSub: 1 }, {
    unique: true,
    partialFilterExpression: {
        deletedAt: null,
        googleSub: { $type: 'string' },
    },
});
UserSchema.index({ emailVerificationToken: 1 }, {
    partialFilterExpression: {
        deletedAt: null,
        emailVerificationToken: { $type: 'string' },
    },
});
UserSchema.index({ passwordResetTokenHash: 1 }, {
    partialFilterExpression: {
        deletedAt: null,
        passwordResetTokenHash: { $type: 'string' },
    },
});
UserSchema.index({ emailChangeTokenHash: 1 }, {
    partialFilterExpression: {
        deletedAt: null,
        emailChangeTokenHash: { $type: 'string' },
    },
});
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ deletedAt: 1, createdAt: -1 });
//# sourceMappingURL=user.schema.js.map