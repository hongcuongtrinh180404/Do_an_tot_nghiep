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

  @Prop({ type: String, enum: ['SEPAY', 'INTERNAL_SEED'], default: 'SEPAY' })
  source: 'SEPAY' | 'INTERNAL_SEED';

  @Prop({
    type: String, trim: true,
    required: function (this: PaymentEntity) { return this.source !== 'INTERNAL_SEED'; },
  })
  sepayTransactionId?: string;

  @Prop({
    type: String, trim: true,
    required: function (this: PaymentEntity) { return this.source === 'INTERNAL_SEED'; },
  })
  internalReference?: string;

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

// Legacy receipts have no source field. Their real SePay IDs remain globally unique,
// including soft-deleted receipts. Internal imports MUST NOT invent a bank ID.
PaymentSchema.index({ sepayTransactionId: 1 }, {
  unique: true, partialFilterExpression: { sepayTransactionId: { $type: 'string' } },
  name: 'unique_sepay_transaction',
});
PaymentSchema.index({ internalReference: 1 }, {
  unique: true, partialFilterExpression: { internalReference: { $type: 'string' } },
  name: 'unique_internal_payment_reference',
});
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ orderCode: 1, reconciliationStatus: 1 });

PaymentSchema.pre('validate', function () {
  if (this.source !== 'INTERNAL_SEED') {
    if (this.internalReference) this.invalidate('internalReference', 'Bank receipts cannot use an internal seed reference');
    return;
  }
  if (!this.seedBatch) this.invalidate('seedBatch', 'Internal payments require seed provenance');
  if (!this.orderId) this.invalidate('orderId', 'Internal payments require an order');
  if (!this.orderCode) this.invalidate('orderCode', 'Internal payments require an order code');
  if (!(this.amountIn > 0)) this.invalidate('amountIn', 'Free enrollment must not create a payment');
  if (!this.appliedAt || !this.transactionDate) this.invalidate('appliedAt', 'Internal payments require historical dates');
  if (this.sepayTransactionId || this.verifiedAt || this.payloadHash || this.accountNumber || this.bankBrandName) {
    this.invalidate('source', 'Internal payments cannot contain bank identifiers or verification evidence');
  }
});
