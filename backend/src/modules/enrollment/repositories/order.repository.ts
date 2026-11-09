import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
import { IOrder, OrderStatusEnum, ReconciliationStatusEnum } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { OrderEntity } from '../schemas/order.schema.js';

export type OrderStatusRecord = Pick<IOrder,
  'id' | 'orderCode' | 'userId' | 'courseId' | 'amount' | 'status' | 'expiresAt' |
  'paidAt' | 'receivedAmount' | 'lastPaymentStatus'
>;

@Injectable()
export class OrderRepository extends BaseMongoRepository<IOrder, OrderEntity> {
  constructor(@InjectModel(OrderEntity.name) orderModel: Model<OrderEntity>) {
    super(orderModel, (doc) => {
      const plain = typeof (doc as { toObject?: () => unknown }).toObject === 'function'
        ? (doc as { toObject: () => Record<string, unknown> }).toObject()
        : doc as unknown as Record<string, unknown>;
      return {
        ...plain,
        id: String(plain._id),
        userId: String(plain.userId),
        courseId: String(plain.courseId),
      } as unknown as IOrder;
    });
  }

  async ensureIndexes(): Promise<void> {
    await this.model.createIndexes();
  }

  async findByOrderCode(orderCode: string, session?: ClientSession): Promise<IOrder | null> {
    const doc = await this.model.findOne({ orderCode, deletedAt: null })
      .session(session ?? null).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findStatusByOrderCode(orderCode: string): Promise<OrderStatusRecord | null> {
    const doc = await this.model.findOne({ orderCode, deletedAt: null })
      .select('orderCode userId courseId amount status expiresAt paidAt receivedAmount lastPaymentStatus')
      .lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async findPendingOrderByUserAndCourse(userId: string, courseId: string): Promise<IOrder | null> {
    const doc = await this.model.findOne({
      userId, courseId, status: OrderStatusEnum.PENDING,
      expiresAt: { $gt: new Date() }, deletedAt: null,
    }).sort({ createdAt: -1 }).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async expirePendingOrders(userId: string, courseId: string): Promise<void> {
    await this.model.updateMany({
      userId, courseId, status: OrderStatusEnum.PENDING,
      expiresAt: { $lte: new Date() }, deletedAt: null,
    }, { $set: { status: OrderStatusEnum.EXPIRED }, $unset: { pendingCheckoutKey: 1 } }).exec();
  }

  async expirePendingOrder(orderId: string, now: Date): Promise<OrderStatusRecord | null> {
    const doc = await this.model.findOneAndUpdate({
      _id: orderId, status: OrderStatusEnum.PENDING, expiresAt: { $lte: now }, deletedAt: null,
    }, {
      $set: { status: OrderStatusEnum.EXPIRED }, $unset: { pendingCheckoutKey: 1 },
    }, { returnDocument: 'after' })
      .select('orderCode userId courseId amount status expiresAt paidAt receivedAmount lastPaymentStatus')
      .lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  /** Serializes receipts for one order, including concurrent partial payments. */
  async lockForPaymentProcessing(orderId: string, session: ClientSession): Promise<IOrder | null> {
    const doc = await this.model.findOneAndUpdate(
      { _id: orderId, deletedAt: null },
      { $inc: { paymentRevision: 1 } },
      { returnDocument: 'after', session },
    ).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async recordReceipt(
    orderId: string,
    status: ReconciliationStatusEnum,
    session: ClientSession,
    receivedAmount?: number,
  ): Promise<void> {
    await this.model.updateOne({ _id: orderId, deletedAt: null }, {
      $set: { lastPaymentStatus: status, ...(receivedAmount === undefined ? {} : { receivedAmount }) },
    }, { session }).exec();
  }

  async markPaid(
    orderId: string, paidAt: Date, receivedAmount: number,
    reconciliationStatus: ReconciliationStatusEnum, session: ClientSession,
  ): Promise<IOrder | null> {
    const doc = await this.model.findOneAndUpdate({
      _id: orderId, deletedAt: null,
      status: { $in: [OrderStatusEnum.PENDING, OrderStatusEnum.EXPIRED] },
    }, {
      $set: { status: OrderStatusEnum.PAID, paidAt, receivedAmount, lastPaymentStatus: reconciliationStatus },
      $unset: { pendingCheckoutKey: 1 },
    }, { returnDocument: 'after', session }).lean().exec();
    return doc ? this.toDomain(doc) : null;
  }

  async cancelOtherPendingOrders(order: IOrder, session: ClientSession): Promise<void> {
    await this.model.updateMany({
      _id: { $ne: new Types.ObjectId(order.id) }, userId: order.userId, courseId: order.courseId,
      status: OrderStatusEnum.PENDING, deletedAt: null,
    }, { $set: { status: OrderStatusEnum.CANCELLED }, $unset: { pendingCheckoutKey: 1 } }, { session }).exec();
  }
}
