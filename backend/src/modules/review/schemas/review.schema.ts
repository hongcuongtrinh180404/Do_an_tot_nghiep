import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
import { UserEntity } from '../../user/schemas/user.schema.js';
import { CourseEntity } from '../../course/schemas/course.schema.js';
import { ReviewStatusEnum, type ReviewModerationAction } from 'share-lib';

export type ReviewDocument = HydratedDocument<ReviewEntity>;

@Schema({ _id: false, timestamps: false })
export class ReviewModerationEntrySchema {
  @Prop({ type: String, required: true })
  action: ReviewModerationAction;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: UserEntity.name, required: true })
  adminId: Types.ObjectId;

  @Prop({ type: String, required: false, default: null })
  adminName?: string | null;

  @Prop({ type: String, required: false, default: null })
  reason?: string | null;

  @Prop({ type: Date, default: () => new Date() })
  createdAt: Date;
}

export const ReviewModerationEntryModelSchema =
  SchemaFactory.createForClass(ReviewModerationEntrySchema);

@Schema({ _id: false, timestamps: false })
export class ReviewReportEntrySchema {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: UserEntity.name, required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: false, default: null })
  userName?: string | null;

  @Prop({ type: String, required: true, trim: true })
  reason: string;

  @Prop({ type: Date, default: () => new Date() })
  createdAt: Date;
}

export const ReviewReportEntryModelSchema =
  SchemaFactory.createForClass(ReviewReportEntrySchema);

@Schema({ _id: false, timestamps: false })
export class ReviewInstructorReplyEntrySchema {
  @Prop({ type: String, required: true, trim: true, maxlength: 2000 })
  content: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: UserEntity.name, required: true })
  instructorId: Types.ObjectId;

  @Prop({ type: String, required: false, default: null })
  instructorName?: string | null;

  @Prop({ type: Date, default: () => new Date() })
  repliedAt: Date;

  @Prop({ type: Date, required: false, default: null })
  updatedAt?: Date | null;
}

export const ReviewInstructorReplyEntryModelSchema =
  SchemaFactory.createForClass(ReviewInstructorReplyEntrySchema);

@Schema({ timestamps: true, collection: 'reviews' })
export class ReviewEntity extends BaseAbstractDocument {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: UserEntity.name,
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: CourseEntity.name,
    required: true,
    index: true,
  })
  courseId: Types.ObjectId;

  @Prop({
    type: Number,
    required: true,
    min: 1,
    max: 5,
  })
  rating: number;

  @Prop({
    type: String,
    required: false,
    default: null,
    trim: true,
  })
  comment?: string | null;

  @Prop({
    type: String,
    enum: Object.values(ReviewStatusEnum),
    default: ReviewStatusEnum.VISIBLE,
    index: true,
  })
  status: ReviewStatusEnum;

  @Prop({
    type: String,
    required: false,
    default: null,
    trim: true,
  })
  hideReason?: string | null;

  @Prop({
    type: [ReviewModerationEntryModelSchema],
    default: [],
  })
  moderationHistory: ReviewModerationEntrySchema[];

  @Prop({
    type: [ReviewReportEntryModelSchema],
    default: [],
  })
  reports: ReviewReportEntrySchema[];

  @Prop({
    type: Number,
    default: 0,
    index: true,
  })
  reportCount: number;

  @Prop({
    type: ReviewInstructorReplyEntryModelSchema,
    default: null,
  })
  instructorReply?: ReviewInstructorReplyEntrySchema | null;
}

export const ReviewSchema = SchemaFactory.createForClass(ReviewEntity);

// 1. Partial Unique Index: Mỗi học viên chỉ có tối đa 1 đánh giá active (deletedAt: null) cho mỗi khóa học
ReviewSchema.index(
  { userId: 1, courseId: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  },
);

// 2. Query Index: Lấy danh sách đánh giá của khóa học theo thời gian mới nhất (loại bỏ đánh giá đã xóa mềm hoặc đã bị ẩn)
ReviewSchema.index({ courseId: 1, status: 1, deletedAt: 1, createdAt: -1 });

// 3. Admin Query Index: Lọc theo status và thời gian
ReviewSchema.index({ status: 1, deletedAt: 1, createdAt: -1 });

// 4. Report Index: Lọc theo số lượt báo cáo vi phạm
ReviewSchema.index({ reportCount: -1, status: 1 });
