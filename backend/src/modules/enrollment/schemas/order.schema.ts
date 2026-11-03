import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { OrderStatusEnum } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
import { UserEntity } from '../../user/schemas/user.schema.js';
import { CourseEntity } from '../../course/schemas/course.schema.js';

export type OrderDocument = HydratedDocument<OrderEntity>;

@Schema({ timestamps: true, collection: 'orders' })
export class OrderEntity extends BaseAbstractDocument {
  @Prop({ type: String, required: true, unique: true, trim: true, index: true })
  orderCode: string;

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

  @Prop({ type: Number, required: true, min: [0, 'Order amount cannot be negative'] })
  amount: number;

  @Prop({
    type: String,
    enum: Object.values(OrderStatusEnum),
    default: OrderStatusEnum.PAID,
    index: true,
  })
  status: OrderStatusEnum;
}

export const OrderSchema = SchemaFactory.createForClass(OrderEntity);

OrderSchema.index({ userId: 1, createdAt: -1 });

