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
import { CourseEntity } from '../../course/schemas/course.schema.js';
import { ReviewStatusEnum } from 'share-lib';
let ReviewModerationEntrySchema = class ReviewModerationEntrySchema {
    action;
    adminId;
    adminName;
    reason;
    createdAt;
};
__decorate([
    Prop({ type: String, required: true }),
    __metadata("design:type", String)
], ReviewModerationEntrySchema.prototype, "action", void 0);
__decorate([
    Prop({ type: MongooseSchema.Types.ObjectId, ref: UserEntity.name, required: true }),
    __metadata("design:type", Types.ObjectId)
], ReviewModerationEntrySchema.prototype, "adminId", void 0);
__decorate([
    Prop({ type: String, required: false, default: null }),
    __metadata("design:type", Object)
], ReviewModerationEntrySchema.prototype, "adminName", void 0);
__decorate([
    Prop({ type: String, required: false, default: null }),
    __metadata("design:type", Object)
], ReviewModerationEntrySchema.prototype, "reason", void 0);
__decorate([
    Prop({ type: Date, default: () => new Date() }),
    __metadata("design:type", Date)
], ReviewModerationEntrySchema.prototype, "createdAt", void 0);
ReviewModerationEntrySchema = __decorate([
    Schema({ _id: false, timestamps: false })
], ReviewModerationEntrySchema);
export { ReviewModerationEntrySchema };
export const ReviewModerationEntryModelSchema = SchemaFactory.createForClass(ReviewModerationEntrySchema);
let ReviewReportEntrySchema = class ReviewReportEntrySchema {
    userId;
    userName;
    reason;
    createdAt;
};
__decorate([
    Prop({ type: MongooseSchema.Types.ObjectId, ref: UserEntity.name, required: true }),
    __metadata("design:type", Types.ObjectId)
], ReviewReportEntrySchema.prototype, "userId", void 0);
__decorate([
    Prop({ type: String, required: false, default: null }),
    __metadata("design:type", Object)
], ReviewReportEntrySchema.prototype, "userName", void 0);
__decorate([
    Prop({ type: String, required: true, trim: true }),
    __metadata("design:type", String)
], ReviewReportEntrySchema.prototype, "reason", void 0);
__decorate([
    Prop({ type: Date, default: () => new Date() }),
    __metadata("design:type", Date)
], ReviewReportEntrySchema.prototype, "createdAt", void 0);
ReviewReportEntrySchema = __decorate([
    Schema({ _id: false, timestamps: false })
], ReviewReportEntrySchema);
export { ReviewReportEntrySchema };
export const ReviewReportEntryModelSchema = SchemaFactory.createForClass(ReviewReportEntrySchema);
let ReviewInstructorReplyEntrySchema = class ReviewInstructorReplyEntrySchema {
    content;
    instructorId;
    instructorName;
    repliedAt;
    updatedAt;
};
__decorate([
    Prop({ type: String, required: true, trim: true, maxlength: 2000 }),
    __metadata("design:type", String)
], ReviewInstructorReplyEntrySchema.prototype, "content", void 0);
__decorate([
    Prop({ type: MongooseSchema.Types.ObjectId, ref: UserEntity.name, required: true }),
    __metadata("design:type", Types.ObjectId)
], ReviewInstructorReplyEntrySchema.prototype, "instructorId", void 0);
__decorate([
    Prop({ type: String, required: false, default: null }),
    __metadata("design:type", Object)
], ReviewInstructorReplyEntrySchema.prototype, "instructorName", void 0);
__decorate([
    Prop({ type: Date, default: () => new Date() }),
    __metadata("design:type", Date)
], ReviewInstructorReplyEntrySchema.prototype, "repliedAt", void 0);
__decorate([
    Prop({ type: Date, required: false, default: null }),
    __metadata("design:type", Object)
], ReviewInstructorReplyEntrySchema.prototype, "updatedAt", void 0);
ReviewInstructorReplyEntrySchema = __decorate([
    Schema({ _id: false, timestamps: false })
], ReviewInstructorReplyEntrySchema);
export { ReviewInstructorReplyEntrySchema };
export const ReviewInstructorReplyEntryModelSchema = SchemaFactory.createForClass(ReviewInstructorReplyEntrySchema);
let ReviewAdminReplyEntrySchema = class ReviewAdminReplyEntrySchema {
    content;
    adminId;
    adminName;
    repliedAt;
    updatedAt;
    updatedById;
    updatedByName;
};
__decorate([
    Prop({ type: String, required: true, trim: true, maxlength: 2000 }),
    __metadata("design:type", String)
], ReviewAdminReplyEntrySchema.prototype, "content", void 0);
__decorate([
    Prop({ type: MongooseSchema.Types.ObjectId, ref: UserEntity.name, required: true }),
    __metadata("design:type", Types.ObjectId)
], ReviewAdminReplyEntrySchema.prototype, "adminId", void 0);
__decorate([
    Prop({ type: String, required: false, default: null }),
    __metadata("design:type", Object)
], ReviewAdminReplyEntrySchema.prototype, "adminName", void 0);
__decorate([
    Prop({ type: Date, default: () => new Date() }),
    __metadata("design:type", Date)
], ReviewAdminReplyEntrySchema.prototype, "repliedAt", void 0);
__decorate([
    Prop({ type: Date, required: false, default: null }),
    __metadata("design:type", Object)
], ReviewAdminReplyEntrySchema.prototype, "updatedAt", void 0);
__decorate([
    Prop({ type: MongooseSchema.Types.ObjectId, ref: UserEntity.name, default: null }),
    __metadata("design:type", Object)
], ReviewAdminReplyEntrySchema.prototype, "updatedById", void 0);
__decorate([
    Prop({ type: String, required: false, default: null }),
    __metadata("design:type", Object)
], ReviewAdminReplyEntrySchema.prototype, "updatedByName", void 0);
ReviewAdminReplyEntrySchema = __decorate([
    Schema({ _id: false, timestamps: false })
], ReviewAdminReplyEntrySchema);
export { ReviewAdminReplyEntrySchema };
export const ReviewAdminReplyEntryModelSchema = SchemaFactory.createForClass(ReviewAdminReplyEntrySchema);
let ReviewEntity = class ReviewEntity extends BaseAbstractDocument {
    userId;
    courseId;
    rating;
    comment;
    status;
    hideReason;
    moderationHistory;
    reports;
    reportCount;
    instructorReply;
    adminReply;
};
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: UserEntity.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", Types.ObjectId)
], ReviewEntity.prototype, "userId", void 0);
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: CourseEntity.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", Types.ObjectId)
], ReviewEntity.prototype, "courseId", void 0);
__decorate([
    Prop({
        type: Number,
        required: true,
        min: 1,
        max: 5,
    }),
    __metadata("design:type", Number)
], ReviewEntity.prototype, "rating", void 0);
__decorate([
    Prop({
        type: String,
        required: false,
        default: null,
        trim: true,
    }),
    __metadata("design:type", Object)
], ReviewEntity.prototype, "comment", void 0);
__decorate([
    Prop({
        type: String,
        enum: Object.values(ReviewStatusEnum),
        default: ReviewStatusEnum.VISIBLE,
        index: true,
    }),
    __metadata("design:type", String)
], ReviewEntity.prototype, "status", void 0);
__decorate([
    Prop({
        type: String,
        required: false,
        default: null,
        trim: true,
    }),
    __metadata("design:type", Object)
], ReviewEntity.prototype, "hideReason", void 0);
__decorate([
    Prop({
        type: [ReviewModerationEntryModelSchema],
        default: [],
    }),
    __metadata("design:type", Array)
], ReviewEntity.prototype, "moderationHistory", void 0);
__decorate([
    Prop({
        type: [ReviewReportEntryModelSchema],
        default: [],
    }),
    __metadata("design:type", Array)
], ReviewEntity.prototype, "reports", void 0);
__decorate([
    Prop({
        type: Number,
        default: 0,
        index: true,
    }),
    __metadata("design:type", Number)
], ReviewEntity.prototype, "reportCount", void 0);
__decorate([
    Prop({
        type: ReviewInstructorReplyEntryModelSchema,
        default: null,
    }),
    __metadata("design:type", Object)
], ReviewEntity.prototype, "instructorReply", void 0);
__decorate([
    Prop({
        type: ReviewAdminReplyEntryModelSchema,
        default: null,
    }),
    __metadata("design:type", Object)
], ReviewEntity.prototype, "adminReply", void 0);
ReviewEntity = __decorate([
    Schema({ timestamps: true, collection: 'reviews' })
], ReviewEntity);
export { ReviewEntity };
export const ReviewSchema = SchemaFactory.createForClass(ReviewEntity);
ReviewSchema.index({ userId: 1, courseId: 1 }, {
    unique: true,
    partialFilterExpression: { deletedAt: null },
});
ReviewSchema.index({ courseId: 1, status: 1, deletedAt: 1, createdAt: -1 });
ReviewSchema.index({ status: 1, deletedAt: 1, createdAt: -1 });
ReviewSchema.index({ reportCount: -1, status: 1 });
//# sourceMappingURL=review.schema.js.map