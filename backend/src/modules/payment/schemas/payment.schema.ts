import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { ReconciliationStatusEnum, IPaymentAuditEntry, IPayment } from 'share-lib';
import { BaseAbstractDocument } from '../../base/index.js';
import { OrderEntity } from '../../enrollment/schemas/order.schema.js';

export type PaymentDocument = HydratedDocument<PaymentEntity>;

@Schema({ timestamps: true, collection: 'payments' })
export class PaymentEntity extends BaseAbstractDocument {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: OrderEntity.name,
    default: null,
    index: true,
  })
  orderId?: Types.ObjectId | null;

  @Prop({ type: String, default: null, trim: true, index: true })
  orderCode?: string | null;

  @Prop({ type: String, required: true, unique: true, trim: true, index: true })
  sepayTransactionId: string;

  @Prop({ type: Number, required: true, min: [0, 'Received amount cannot be negative'] })
  amountIn: number;

  @Prop({ type: String, default: '', trim: true })
  bankBrandName: string;

  @Prop({ type: String, default: '', trim: true })
  accountNumber: string;

  @Prop({ type: Date, default: null })
  transactionDate: Date | null;

  @Prop({ type: String, default: '', trim: true })
  content: string;

  @Prop({
    type: String,
    enum: Object.values(ReconciliationStatusEnum),
    default: ReconciliationStatusEnum.MATCHED,
    index: true,
  })
  reconciliationStatus: ReconciliationStatusEnum;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  rawPayload?: Record<string, unknown>;

  @Prop({ type: Date, default: null })
  appliedAt?: Date | null;

  @Prop({ type: Date })
  verifiedAt?: Date;

  @Prop({ type: String })
  payloadHash?: string;

  @Prop({ type: Number, default: 0, min: 0 })
  excessAmount?: number;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  resolution?: IPayment['resolution'];

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  auditHistory?: IPaymentAuditEntry[];
}

export const PaymentSchema = SchemaFactory.createForClass(PaymentEntity);

PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ orderCode: 1, reconciliationStatus: 1 });
