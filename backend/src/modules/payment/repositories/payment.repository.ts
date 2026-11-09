import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
import { IPayment, IPaymentAuditEntry, ReconciliationStatusEnum } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { PaymentEntity } from '../schemas/payment.schema.js';

@Injectable()
export class PaymentRepository extends BaseMongoRepository<IPayment, PaymentEntity> {
  constructor(@InjectModel(PaymentEntity.name) paymentModel: Model<PaymentEntity>) {
    super(paymentModel, (doc) => {
      const plain = typeof (doc as { toObject?: () => unknown }).toObject === 'function'
        ? (doc as { toObject: () => Record<string, unknown> }).toObject()
        : doc as unknown as Record<string, unknown>;
      return {
        ...plain, id: String(plain._id),
        orderId: plain.orderId instanceof Types.ObjectId ? plain.orderId.toHexString()
          : typeof plain.orderId === 'string' ? plain.orderId : null,
      } as unknown as IPayment;
    });
  }

  async ensureIndexes(): Promise<void> {
    await this.model.createIndexes();
  }

  async runTransaction<R>(operation: (session: ClientSession) => Promise<R>, timeoutMS = 20000): Promise<R> {
    const session = await this.model.db.startSession();
    try {
      return await session.withTransaction(() => operation(session), {
        readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' },
        maxCommitTimeMS: Math.min(10000, timeoutMS), timeoutMS,
      });
    } finally {
      await session.endSession();
    }
  }

  async findBySepayTransactionId(sepayTransactionId: string, session?: ClientSession): Promise<IPayment | null> {
    // Include soft-deleted receipts: a transaction ID must never be spent twice.
    const doc = await this.model.findOne({ sepayTransactionId }).session(session ?? null).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findByOrderCode(orderCode: string, session?: ClientSession): Promise<IPayment[]> {
    const docs = await this.model.find({ orderCode, deletedAt: null }).sort({ createdAt: -1 })
      .session(session ?? null).lean().exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async updateReconciliation(
    paymentId: string, fields: Partial<IPayment>, session: ClientSession, audit?: IPaymentAuditEntry,
  ): Promise<IPayment> {
    const doc = await this.model.findOneAndUpdate({ _id: paymentId, deletedAt: null }, {
      $set: fields, ...(audit ? { $push: { auditHistory: audit } } : {}),
    }, { returnDocument: 'after', session, runValidators: true }).lean().exec();
    if (!doc) throw new Error('Payment no longer exists');
    return this.toDomain(doc);
  }

  async getEligibleReceipts(orderId: string, session: ClientSession): Promise<IPayment[]> {
    const docs = await this.model.find({
      orderId: new Types.ObjectId(orderId), deletedAt: null,
      reconciliationStatus: { $in: [
        ReconciliationStatusEnum.UNDERPAID, ReconciliationStatusEnum.MATCHED, ReconciliationStatusEnum.OVERPAID,
      ] },
    }).session(session).lean().exec();
    return docs.map((doc) => this.toDomain(doc));
  }

  async markReceiptsApplied(paymentIds: string[], appliedAt: Date, session: ClientSession): Promise<void> {
    await this.model.updateMany({ _id: { $in: paymentIds }, deletedAt: null }, {
      $set: { appliedAt, reconciliationStatus: ReconciliationStatusEnum.MATCHED },
    }, { session }).exec();
  }

  async findReconciliationQueue(page: number, limit: number): Promise<{ items: IPayment[]; total: number }> {
    const filter = { deletedAt: null, resolution: null, reconciliationStatus: { $ne: ReconciliationStatusEnum.MATCHED } };
    const [docs, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { items: docs.map((doc) => this.toDomain(doc)), total };
  }
}
