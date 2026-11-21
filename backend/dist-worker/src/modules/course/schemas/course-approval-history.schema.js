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
import { CourseApprovalActionEnum, CourseStatusEnum, } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
import { CourseEntity } from './course.schema.js';
import { UserEntity } from '../../user/schemas/user.schema.js';
let CourseApprovalHistoryEntity = class CourseApprovalHistoryEntity extends BaseAbstractDocument {
    courseId;
    adminId;
    instructorId;
    action;
    reason;
    previousStatus;
    targetStatus;
};
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: CourseEntity.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", Types.ObjectId)
], CourseApprovalHistoryEntity.prototype, "courseId", void 0);
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: UserEntity.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", Types.ObjectId)
], CourseApprovalHistoryEntity.prototype, "adminId", void 0);
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: UserEntity.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", Types.ObjectId)
], CourseApprovalHistoryEntity.prototype, "instructorId", void 0);
__decorate([
    Prop({
        type: String,
        enum: Object.values(CourseApprovalActionEnum),
        required: true,
        index: true,
    }),
    __metadata("design:type", String)
], CourseApprovalHistoryEntity.prototype, "action", void 0);
__decorate([
    Prop({
        type: String,
        required: false,
        default: null,
        trim: true,
        maxlength: 1000,
    }),
    __metadata("design:type", Object)
], CourseApprovalHistoryEntity.prototype, "reason", void 0);
__decorate([
    Prop({
        type: String,
        enum: Object.values(CourseStatusEnum),
        required: true,
    }),
    __metadata("design:type", String)
], CourseApprovalHistoryEntity.prototype, "previousStatus", void 0);
__decorate([
    Prop({
        type: String,
        enum: Object.values(CourseStatusEnum),
        required: true,
    }),
    __metadata("design:type", String)
], CourseApprovalHistoryEntity.prototype, "targetStatus", void 0);
CourseApprovalHistoryEntity = __decorate([
    Schema({ timestamps: true, collection: 'course_approval_histories' })
], CourseApprovalHistoryEntity);
export { CourseApprovalHistoryEntity };
export const CourseApprovalHistorySchema = SchemaFactory.createForClass(CourseApprovalHistoryEntity);
CourseApprovalHistorySchema.index({ courseId: 1, createdAt: -1 });
CourseApprovalHistorySchema.index({ createdAt: -1 });
CourseApprovalHistorySchema.index({ action: 1, createdAt: -1 });
CourseApprovalHistorySchema.index({ adminId: 1, createdAt: -1 });
//# sourceMappingURL=course-approval-history.schema.js.map