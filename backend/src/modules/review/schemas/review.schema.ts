import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
import { UserEntity } from '../../user/schemas/user.schema.js';
import { CourseEntity } from '../../course/schemas/course.schema.js';

export type ReviewDocument = HydratedDocument<ReviewEntity>;

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

// 2. Query Index: Lấy danh sách đánh giá của khóa học theo thời gian mới nhất (loại bỏ đánh giá đã xóa mềm)
ReviewSchema.index({ courseId: 1, deletedAt: 1, createdAt: -1 });

