import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { IPayment } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { PaymentEntity } from '../schemas/payment.schema.js';

@Injectable()
export class PaymentRepository extends BaseMongoRepository<IPayment, PaymentEntity> {
  constructor(
    @InjectModel(PaymentEntity.name)
    paymentModel: Model<PaymentEntity>,
  ) {
    super(paymentModel, (doc) => {
      const plain =
        typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
          ? (doc as { toObject: () => Record<string, unknown> }).toObject()
          : (doc as unknown as Record<string, unknown>);

      const rawId = plain._id;
      const id = typeof rawId === 'string' ? rawId : (rawId as { toString?: () => string })?.toString?.();
      const rawOrderId = plain.orderId;
      const orderId =
        rawOrderId === null || rawOrderId === undefined
          ? null
          : typeof rawOrderId === 'string'
            ? rawOrderId
            : (rawOrderId as { toString?: () => string })?.toString?.() ?? null;

      return {
        ...plain,
        id: id as string,
        orderId,
      } as unknown as IPayment;
    });
  }

  async findBySepayTransactionId(
    sepayTransactionId: string,
    session?: ClientSession,
  ): Promise<IPayment | null> {
    const doc = await this.model
      .findOne({ sepayTransactionId, deletedAt: null })
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async findByOrderCode(orderCode: string, session?: ClientSession): Promise<IPayment[]> {
    const docs = await this.model
      .find({ orderCode, deletedAt: null })
      .sort({ createdAt: -1 })
      .session(session ?? null)
      .exec();

    return docs.map((doc) => this.toDomain(doc));
  }
}

