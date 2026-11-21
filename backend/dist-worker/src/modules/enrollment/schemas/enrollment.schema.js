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
import { OrderEntity } from './order.schema.js';
let EnrollmentEntity = class EnrollmentEntity extends BaseAbstractDocument {
    userId;
    courseId;
    orderId;
    enrolledAt;
};
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: UserEntity.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", Types.ObjectId)
], EnrollmentEntity.prototype, "userId", void 0);
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: CourseEntity.name,
        required: true,
        index: true,
    }),
    __metadata("design:type", Types.ObjectId)
], EnrollmentEntity.prototype, "courseId", void 0);
__decorate([
    Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: OrderEntity.name,
        required: false,
        default: null,
    }),
    __metadata("design:type", Object)
], EnrollmentEntity.prototype, "orderId", void 0);
__decorate([
    Prop({ type: Date, default: Date.now, index: true }),
    __metadata("design:type", Date)
], EnrollmentEntity.prototype, "enrolledAt", void 0);
EnrollmentEntity = __decorate([
    Schema({ timestamps: true, collection: 'enrollments' })
], EnrollmentEntity);
export { EnrollmentEntity };
export const EnrollmentSchema = SchemaFactory.createForClass(EnrollmentEntity);
EnrollmentSchema.index({ userId: 1, courseId: 1, deletedAt: 1 }, { unique: true });
EnrollmentSchema.index({ userId: 1, enrolledAt: -1 });
//# sourceMappingURL=enrollment.schema.js.map