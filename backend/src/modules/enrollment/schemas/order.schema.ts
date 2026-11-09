import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { OrderStatusEnum, ReconciliationStatusEnum } from 'share-lib';
import type { IOrderCourseSnapshot, IOrderBankSnapshot } from 'share-lib';
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

  @Prop({ type: Number, default: 0, min: [0, 'Original price cannot be negative'] })
  originalPrice?: number;

  @Prop({ type: Number, default: 0, min: [0, 'Discount amount cannot be negative'] })
  discountAmount?: number;

  @Prop({ type: String, default: 'SEPAY_BANK_TRANSFER', trim: true })
  paymentMethod?: string;

  @Prop({ type: Date, index: true })
  expiresAt?: Date;

  @Prop({ type: Date, default: null })
  paidAt?: Date | null;

  @Prop({ type: Number, default: 0.7, min: 0, max: 1 })
  instructorCommissionRate?: number;

  @Prop({ type: Number, default: 0, min: 0 })
  instructorEarnings?: number;

  // Present only while a new checkout is PENDING. Legacy rows need no migration.
  @Prop({ type: String, required: false })
  pendingCheckoutKey?: string;

  @Prop({ type: Number, default: 0 })
  paymentRevision?: number;

  @Prop({ type: Number, default: 0, min: 0 })
  receivedAmount?: number;

  @Prop({ type: String, enum: Object.values(ReconciliationStatusEnum) })
  lastPaymentStatus?: ReconciliationStatusEnum;

  @Prop({ type: MongooseSchema.Types.Mixed })
  courseSnapshot?: IOrderCourseSnapshot;

  @Prop({ type: MongooseSchema.Types.Mixed })
  bankSnapshot?: IOrderBankSnapshot;

  @Prop({
    type: String,
    enum: Object.values(OrderStatusEnum),
    default: OrderStatusEnum.PENDING,
    index: true,
  })
  status: OrderStatusEnum;
}

export const OrderSchema = SchemaFactory.createForClass(OrderEntity);

OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ userId: 1, courseId: 1, status: 1 });
OrderSchema.index({ pendingCheckoutKey: 1 }, { unique: true, sparse: true, name: 'unique_pending_checkout' });
