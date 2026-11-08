import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
import { IOrder, OrderStatusEnum } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { OrderEntity } from '../schemas/order.schema.js';

@Injectable()
export class OrderRepository extends BaseMongoRepository<IOrder, OrderEntity> {
  constructor(
    @InjectModel(OrderEntity.name)
    orderModel: Model<OrderEntity>,
  ) {
    super(orderModel, (doc) => {
      const plain =
        typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
          ? (doc as { toObject: () => Record<string, unknown> }).toObject()
          : (doc as unknown as Record<string, unknown>);

      const rawId = plain._id;
      const id = typeof rawId === 'string' ? rawId : (rawId as { toString?: () => string })?.toString?.();
      const rawUserId = plain.userId;
      const userId = typeof rawUserId === 'string' ? rawUserId : (rawUserId as { toString?: () => string })?.toString?.() ?? '';
      const rawCourseId = plain.courseId;
      const courseId = typeof rawCourseId === 'string' ? rawCourseId : (rawCourseId as { toString?: () => string })?.toString?.() ?? '';

      return {
        ...plain,
        id: id as string,
        userId,
        courseId,
      } as unknown as IOrder;
    });
  }

  async findByOrderCode(orderCode: string, session?: ClientSession): Promise<IOrder | null> {
    const doc = await this.model
      .findOne({ orderCode, deletedAt: null })
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async findPendingOrderByUserAndCourse(
    userId: string,
    courseId: string,
    session?: ClientSession,
  ): Promise<IOrder | null> {
    const now = new Date();
    const doc = await this.model
      .findOne({
        userId: new Types.ObjectId(userId),
        courseId: new Types.ObjectId(courseId),
        status: OrderStatusEnum.PENDING,
        expiresAt: { $gt: now },
        deletedAt: null,
      })
      .sort({ createdAt: -1 })
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatusEnum,
    extraFields?: Partial<IOrder>,
    session?: ClientSession,
  ): Promise<IOrder | null> {
    const doc = await this.model
      .findByIdAndUpdate(
        orderId,
        {
          $set: {
            status,
            ...extraFields,
          },
        },
        { new: true, session: session ?? null },
      )
      .exec();

    return doc ? this.toDomain(doc) : null;
  }
}
