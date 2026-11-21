import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import {
  CourseApprovalActionEnum,
  CourseStatusEnum,
} from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
import { CourseEntity } from './course.schema.js';
import { UserEntity } from '../../user/schemas/user.schema.js';

export type CourseApprovalHistoryDocument = HydratedDocument<CourseApprovalHistoryEntity>;

@Schema({ timestamps: true, collection: 'course_approval_histories' })
export class CourseApprovalHistoryEntity extends BaseAbstractDocument {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: CourseEntity.name,
    required: true,
    index: true,
  })
  courseId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: UserEntity.name,
    required: true,
    index: true,
  })
  adminId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: UserEntity.name,
    required: true,
    index: true,
  })
  instructorId: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(CourseApprovalActionEnum),
    required: true,
    index: true,
  })
  action: CourseApprovalActionEnum;

  @Prop({
    type: String,
    required: false,
    default: null,
    trim: true,
    maxlength: 1000,
  })
  reason?: string | null;

  @Prop({
    type: String,
    enum: Object.values(CourseStatusEnum),
    required: true,
  })
  previousStatus: CourseStatusEnum;

  @Prop({
    type: String,
    enum: Object.values(CourseStatusEnum),
    required: true,
  })
  targetStatus: CourseStatusEnum;
}

export const CourseApprovalHistorySchema = SchemaFactory.createForClass(
  CourseApprovalHistoryEntity,
);

CourseApprovalHistorySchema.index({ courseId: 1, createdAt: -1 });
CourseApprovalHistorySchema.index({ createdAt: -1 });
CourseApprovalHistorySchema.index({ action: 1, createdAt: -1 });
CourseApprovalHistorySchema.index({ adminId: 1, createdAt: -1 });
