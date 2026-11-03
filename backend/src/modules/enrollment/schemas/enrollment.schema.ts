import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { BaseAbstractDocument } from '../../base/index.js';
import { UserEntity } from '../../user/schemas/user.schema.js';
import { CourseEntity } from '../../course/schemas/course.schema.js';
import { OrderEntity } from './order.schema.js';

export type EnrollmentDocument = HydratedDocument<EnrollmentEntity>;

@Schema({ timestamps: true, collection: 'enrollments' })
export class EnrollmentEntity extends BaseAbstractDocument {
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
    type: MongooseSchema.Types.ObjectId,
    ref: OrderEntity.name,
    required: false,
    default: null,
  })
  orderId?: Types.ObjectId | null;

  @Prop({ type: Date, default: Date.now, index: true })
  enrolledAt: Date;
}

export const EnrollmentSchema = SchemaFactory.createForClass(EnrollmentEntity);

// Compound unique index prevents race condition duplicate enrollments
EnrollmentSchema.index({ userId: 1, courseId: 1, deletedAt: 1 }, { unique: true });
EnrollmentSchema.index({ userId: 1, enrolledAt: -1 });

