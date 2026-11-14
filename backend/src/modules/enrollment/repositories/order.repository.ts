import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types, type PipelineStage } from 'mongoose';
import {
  IOrder,
  OrderStatusEnum,
  ReconciliationStatusEnum,
  type IRevenueOverviewKpi,
  type IRevenueChartItem,
  type IRevenueTransactionItem,
  type IRevenueTransactionDetail,
  type IInstructorRevenueSummary,
  type IInstructorCourseRevenue,
} from 'share-lib';
import { BaseMongoRepository, PaginationResult } from '../../base/index.js';
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
        instructorId: plain.instructorId ? String(plain.instructorId) : undefined,
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

  async getRevenueOverview(startDate?: Date, endDate?: Date): Promise<IRevenueOverviewKpi> {
    const match: Record<string, unknown> = {
      status: OrderStatusEnum.PAID,
      deletedAt: null,
    };

    if (startDate && endDate) {
      match.$or = [
        { paidAt: { $gte: startDate, $lte: endDate } },
        { paidAt: null, createdAt: { $gte: startDate, $lte: endDate } },
      ];
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $project: {
          amount: 1,
          platformEarnings: {
            $ifNull: [
              '$platformEarnings',
              {
                $round: [
                  {
                    $multiply: [
                      '$amount',
                      { $divide: [{ $ifNull: ['$platformCommissionRate', 30] }, 100] },
                    ],
                  },
                  0,
                ],
              },
            ],
          },
        },
      },
      {
        $project: {
          amount: 1,
          platformEarnings: 1,
          instructorEarnings: { $subtract: ['$amount', '$platformEarnings'] },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          platformCommission: { $sum: '$platformEarnings' },
          instructorEarnings: { $sum: '$instructorEarnings' },
          successfulOrders: { $sum: 1 },
        },
      },
    ];

    const result = await this.model.aggregate<{
      totalRevenue: number;
      platformCommission: number;
      instructorEarnings: number;
      successfulOrders: number;
    }>(pipeline).exec();

    if (!result || result.length === 0) {
      return {
        totalRevenue: 0,
        platformCommission: 0,
        instructorEarnings: 0,
        successfulOrders: 0,
      };
    }

    return {
      totalRevenue: result[0].totalRevenue ?? 0,
      platformCommission: result[0].platformCommission ?? 0,
      instructorEarnings: result[0].instructorEarnings ?? 0,
      successfulOrders: result[0].successfulOrders ?? 0,
    };
  }

  async getRevenueChart(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'month',
  ): Promise<IRevenueChartItem[]> {
    const format = groupBy === 'month' ? '%Y-%m' : '%Y-%m-%d';
    const pipeline: PipelineStage[] = [
      {
        $match: {
          status: OrderStatusEnum.PAID,
          deletedAt: null,
          $or: [
            { paidAt: { $gte: startDate, $lte: endDate } },
            { paidAt: null, createdAt: { $gte: startDate, $lte: endDate } },
          ],
        },
      },
      {
        $project: {
          amount: 1,
          effectiveDate: { $ifNull: ['$paidAt', '$createdAt'] },
          platformEarnings: {
            $ifNull: [
              '$platformEarnings',
              {
                $round: [
                  {
                    $multiply: [
                      '$amount',
                      { $divide: [{ $ifNull: ['$platformCommissionRate', 30] }, 100] },
                    ],
                  },
                  0,
                ],
              },
            ],
          },
        },
      },
      {
        $project: {
          amount: 1,
          platformEarnings: 1,
          instructorEarnings: { $subtract: ['$amount', '$platformEarnings'] },
          dateStr: {
            $dateToString: {
              format,
              date: '$effectiveDate',
              timezone: '+07:00',
            },
          },
        },
      },
      {
        $group: {
          _id: '$dateStr',
          totalRevenue: { $sum: '$amount' },
          platformCommission: { $sum: '$platformEarnings' },
          instructorEarnings: { $sum: '$instructorEarnings' },
          orderCount: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ];

    const rows = await this.model.aggregate<{
      _id: string;
      totalRevenue: number;
      platformCommission: number;
      instructorEarnings: number;
      orderCount: number;
    }>(pipeline).exec();

    return rows.map((r) => ({
      date: r._id,
      label: r._id,
      totalRevenue: r.totalRevenue,
      platformCommission: r.platformCommission,
      instructorEarnings: r.instructorEarnings,
      orderCount: r.orderCount,
    }));
  }

  async findSuccessfulTransactions(params: {
    startDate?: Date;
    endDate?: Date;
    search?: string;
    sort?: string;
    page: number;
    limit: number;
  }): Promise<PaginationResult<IRevenueTransactionItem>> {
    const { startDate, endDate, search, sort = 'newest', page = 1, limit = 10 } = params;

    const match: Record<string, unknown> = {
      status: OrderStatusEnum.PAID,
      deletedAt: null,
    };

    if (startDate && endDate) {
      match.$or = [
        { paidAt: { $gte: startDate, $lte: endDate } },
        { paidAt: null, createdAt: { $gte: startDate, $lte: endDate } },
      ];
    }

    const sortStage: Record<string, 1 | -1> =
      sort === 'oldest'
        ? { paidAt: 1, createdAt: 1, _id: 1 }
        : sort === 'amount_desc'
          ? { amount: -1, paidAt: -1, _id: -1 }
          : sort === 'amount_asc'
            ? { amount: 1, paidAt: -1, _id: 1 }
            : { paidAt: -1, createdAt: -1, _id: -1 };

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'courses',
          localField: 'courseId',
          foreignField: '_id',
          as: 'course',
        },
      },
      { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'instructorId',
          foreignField: '_id',
          as: 'instructorDirect',
        },
      },
      { $unwind: { path: '$instructorDirect', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'course.instructorId',
          foreignField: '_id',
          as: 'instructorFromCourse',
        },
      },
      { $unwind: { path: '$instructorFromCourse', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          instructor: { $ifNull: ['$instructorDirect', '$instructorFromCourse'] },
          courseTitle: {
            $ifNull: ['$courseSnapshot.title', { $ifNull: ['$course.title', 'Khóa học'] }],
          },
          studentName: {
            $ifNull: ['$student.fullName', '$student.email'],
          },
          instructorName: {
            $ifNull: [
              '$courseSnapshot.instructorName',
              { $ifNull: ['$instructor.fullName', '$instructor.email'] },
            ],
          },
        },
      },
    ];

    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      pipeline.push({
        $match: {
          $or: [
            { orderCode: { $regex: regex } },
            { courseTitle: { $regex: regex } },
            { studentName: { $regex: regex } },
            { 'student.email': { $regex: regex } },
            { instructorName: { $regex: regex } },
            { 'instructor.email': { $regex: regex } },
          ],
        },
      });
    }

    const skip = Math.max(0, (page - 1) * limit);

    const facetPipeline: PipelineStage[] = [
      ...pipeline,
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $sort: sortStage },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                id: { $toString: '$_id' },
                orderCode: 1,
                courseTitle: 1,
                studentName: 1,
                instructorName: 1,
                paidAt: {
                  $dateToString: {
                    format: '%Y-%m-%d %H:%M:%S',
                    date: { $ifNull: ['$paidAt', '$createdAt'] },
                    timezone: '+07:00',
                  },
                },
                amount: 1,
                paymentMethod: 1,
              },
            },
          ],
        },
      },
    ];

    const [facetResult] = await this.model.aggregate<{
      metadata: [{ total: number }] | [];
      data: IRevenueTransactionItem[];
    }>(facetPipeline).exec();

    const total = facetResult?.metadata?.[0]?.total ?? 0;
    const items = facetResult?.data ?? [];
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findRevenueTransactionDetail(
    orderCode: string,
  ): Promise<IRevenueTransactionDetail | null> {
    const pipeline: PipelineStage[] = [
      {
        $match: {
          orderCode,
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'courses',
          localField: 'courseId',
          foreignField: '_id',
          as: 'course',
        },
      },
      { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'instructorId',
          foreignField: '_id',
          as: 'instructorDirect',
        },
      },
      { $unwind: { path: '$instructorDirect', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'course.instructorId',
          foreignField: '_id',
          as: 'instructorFromCourse',
        },
      },
      { $unwind: { path: '$instructorFromCourse', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'payments',
          let: { oId: '$_id', oCode: '$orderCode' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$deletedAt', null] },
                    {
                      $or: [
                        { $eq: ['$orderId', '$$oId'] },
                        { $eq: ['$orderCode', '$$oCode'] },
                      ],
                    },
                    {
                      $in: [
                        '$reconciliationStatus',
                        [ReconciliationStatusEnum.MATCHED, ReconciliationStatusEnum.OVERPAID],
                      ],
                    },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
          ],
          as: 'matchedPayment',
        },
      },
      { $unwind: { path: '$matchedPayment', preserveNullAndEmptyArrays: true } },
    ];

    const [doc] = await this.model.aggregate<Record<string, unknown>>(pipeline).exec();
    if (!doc) return null;

    const student = (doc.student as Record<string, unknown>) ?? {};
    const course = (doc.course as Record<string, unknown>) ?? {};
    const courseSnapshot = (doc.courseSnapshot as Record<string, unknown>) ?? {};
    const instructor =
      (doc.instructorDirect as Record<string, unknown>) ??
      (doc.instructorFromCourse as Record<string, unknown>) ??
      {};
    const matchedPayment = (doc.matchedPayment as Record<string, unknown>) ?? {};

    const amount = Number(doc.amount) || 0;
    const platformRate =
      typeof doc.platformCommissionRate === 'number' && Number.isFinite(doc.platformCommissionRate)
        ? doc.platformCommissionRate
        : 30;
    const instructorRate = 100 - platformRate;
    const platformEarnings =
      typeof doc.platformEarnings === 'number' && Number.isFinite(doc.platformEarnings)
        ? doc.platformEarnings
        : Math.round((amount * platformRate) / 100);
    const instructorEarnings =
      typeof doc.instructorEarnings === 'number' && Number.isFinite(doc.instructorEarnings)
        ? doc.instructorEarnings
        : amount - platformEarnings;

    return {
      orderCode: String(doc.orderCode),
      sepayTransactionId: matchedPayment.sepayTransactionId
        ? String(matchedPayment.sepayTransactionId)
        : null,
      createdAt: doc.createdAt ? new Date(doc.createdAt as string).toISOString() : '',
      paidAt: doc.paidAt ? new Date(doc.paidAt as string).toISOString() : null,
      paymentMethod: String(doc.paymentMethod || 'SEPAY_BANK_TRANSFER'),
      status: String(doc.status),

      student: {
        id: String(student._id || doc.userId),
        fullName: String(student.fullName || 'Học viên'),
        email: String(student.email || ''),
        avatarUrl: (student.avatarUrl as string) || null,
      },

      course: {
        id: String(course._id || doc.courseId),
        title: String(courseSnapshot.title || course.title || 'Khóa học'),
        thumbnailUrl: (courseSnapshot.thumbnailUrl as string) || (course.thumbnailUrl as string) || null,
        instructorName: String(
          courseSnapshot.instructorName || instructor.fullName || instructor.email || 'Giảng viên',
        ),
        lockedPrice: amount,
      },

      amountDue: amount,
      amountPaid: Number(doc.receivedAmount) || amount,
      paymentDate: doc.paidAt
        ? new Date(doc.paidAt as string).toISOString()
        : matchedPayment.transactionDate
          ? new Date(matchedPayment.transactionDate as string).toISOString()
          : null,

      platformCommissionRate: platformRate,
      instructorCommissionRate: instructorRate,
      platformEarnings,
      instructorEarnings,
    };
  }

  async getInstructorsRevenueStats(params: {
    startDate?: Date;
    endDate?: Date;
    search?: string;
    sort?: string;
    page: number;
    limit: number;
  }): Promise<PaginationResult<IInstructorRevenueSummary>> {
    const { startDate, endDate, search, sort = 'revenue_desc', page = 1, limit = 10 } = params;

    const userMatch: Record<string, unknown> = {
      role: 'instructor',
      deletedAt: null,
    };

    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      userMatch.$or = [{ fullName: { $regex: regex } }, { email: { $regex: regex } }];
    }

    const orderDateFilter: Record<string, unknown> = {
      status: OrderStatusEnum.PAID,
      deletedAt: null,
    };
    if (startDate && endDate) {
      orderDateFilter.$or = [
        { paidAt: { $gte: startDate, $lte: endDate } },
        { paidAt: null, createdAt: { $gte: startDate, $lte: endDate } },
      ];
    }

    const sortStage: Record<string, 1 | -1> =
      sort === 'revenue_asc'
        ? { totalRevenue: 1, successfulSales: 1, _id: 1 }
        : sort === 'sales_desc'
          ? { successfulSales: -1, totalRevenue: -1, _id: -1 }
          : sort === 'courses_desc'
            ? { totalCourses: -1, totalRevenue: -1, _id: -1 }
            : sort === 'commission_desc'
              ? { commissionRate: -1, totalRevenue: -1, _id: -1 }
              : sort === 'commission_asc'
                ? { commissionRate: 1, totalRevenue: 1, _id: 1 }
                : { totalRevenue: -1, successfulSales: -1, _id: -1 };

    const pipeline: PipelineStage[] = [
      { $match: userMatch },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: 'instructorId',
          pipeline: [{ $match: { deletedAt: null } }],
          as: 'courses',
        },
      },
      {
        $lookup: {
          from: 'orders',
          let: { instId: '$_id', courseIds: '$courses._id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$status', OrderStatusEnum.PAID] },
                    { $eq: ['$deletedAt', null] },
                    {
                      $or: [
                        { $eq: ['$instructorId', '$$instId'] },
                        { $in: ['$courseId', '$$courseIds'] },
                      ],
                    },
                    ...(startDate && endDate
                      ? [
                          {
                            $or: [
                              {
                                $and: [
                                  { $gte: [{ $ifNull: ['$paidAt', '$createdAt'] }, startDate] },
                                  { $lte: [{ $ifNull: ['$paidAt', '$createdAt'] }, endDate] },
                                ],
                              },
                            ],
                          },
                        ]
                      : []),
                  ],
                },
              },
            },
            { $sort: { paidAt: -1, createdAt: -1 } },
          ],
          as: 'paidOrders',
        },
      },
      {
        $project: {
          id: { $toString: '$_id' },
          fullName: { $ifNull: ['$fullName', '$email'] },
          email: 1,
          avatarUrl: { $ifNull: ['$avatarUrl', null] },
          status: { $ifNull: ['$status', 'active'] },
          totalCourses: { $size: '$courses' },
          successfulSales: { $size: '$paidOrders' },
          totalRevenue: { $sum: '$paidOrders.amount' },
          commissionRate: { $ifNull: ['$commissionRate', 30] },
          lastTransactionDate: {
            $let: {
              vars: { firstOrder: { $arrayElemAt: ['$paidOrders', 0] } },
              in: {
                $cond: [
                  { $gt: [{ $size: '$paidOrders' }, 0] },
                  {
                    $dateToString: {
                      format: '%Y-%m-%d %H:%M:%S',
                      date: {
                        $ifNull: ['$$firstOrder.paidAt', '$$firstOrder.createdAt'],
                      },
                      timezone: '+07:00',
                    },
                  },
                  null,
                ],
              },
            },
          },
        },
      },
    ];

    const skip = Math.max(0, (page - 1) * limit);

    const facetPipeline: PipelineStage[] = [
      {
        $facet: {
          usersFacet: [
            ...(pipeline as unknown as PipelineStage.FacetPipelineStage[]),
            { $sort: sortStage },
            { $skip: skip },
            { $limit: limit },
          ],
          totalFacet: [{ $match: userMatch }, { $count: 'total' }],
        },
      },
    ];

    const [facetResult] = await this.model.db
      .collection('users')
      .aggregate<{
        usersFacet: IInstructorRevenueSummary[];
        totalFacet: [{ total: number }] | [];
      }>(facetPipeline)
      .toArray();

    const total = facetResult?.totalFacet?.[0]?.total ?? 0;
    const items = facetResult?.usersFacet ?? [];
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getInstructorRevenueKpi(
    instructorId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalRevenue: number;
    instructorEarnings: number;
    totalCourses: number;
    successfulSales: number;
  }> {
    const instObjectId = new Types.ObjectId(instructorId);
    const courses = await this.model.db
      .collection('courses')
      .find({ instructorId: instObjectId, deletedAt: null }, { projection: { _id: 1 } })
      .toArray();
    const courseIds = courses.map((c) => c._id);

    const match: Record<string, unknown> = {
      status: OrderStatusEnum.PAID,
      deletedAt: null,
      $or: [{ instructorId: instObjectId }, { courseId: { $in: courseIds } }],
    };

    if (startDate && endDate) {
      match.$and = [
        {
          $or: [
            { paidAt: { $gte: startDate, $lte: endDate } },
            { paidAt: null, createdAt: { $gte: startDate, $lte: endDate } },
          ],
        },
      ];
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $project: {
          amount: 1,
          platformEarnings: {
            $ifNull: [
              '$platformEarnings',
              {
                $round: [
                  {
                    $multiply: [
                      '$amount',
                      { $divide: [{ $ifNull: ['$platformCommissionRate', 30] }, 100] },
                    ],
                  },
                  0,
                ],
              },
            ],
          },
        },
      },
      {
        $project: {
          amount: 1,
          instructorEarnings: { $subtract: ['$amount', '$platformEarnings'] },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          instructorEarnings: { $sum: '$instructorEarnings' },
          successfulSales: { $sum: 1 },
        },
      },
    ];

    const result = await this.model.aggregate<{
      totalRevenue: number;
      instructorEarnings: number;
      successfulSales: number;
    }>(pipeline).exec();

    return {
      totalRevenue: result[0]?.totalRevenue ?? 0,
      instructorEarnings: result[0]?.instructorEarnings ?? 0,
      totalCourses: courseIds.length,
      successfulSales: result[0]?.successfulSales ?? 0,
    };
  }

  async getInstructorCoursesRevenue(
    instructorId: string,
    startDate?: Date,
    endDate?: Date,
    page = 1,
    limit = 10,
    search?: string,
    sort = 'revenue_desc',
  ): Promise<PaginationResult<IInstructorCourseRevenue>> {
    const instObjectId = new Types.ObjectId(instructorId);

    const courseMatch: Record<string, unknown> = {
      instructorId: instObjectId,
      deletedAt: null,
    };

    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      courseMatch.title = { $regex: new RegExp(escaped, 'i') };
    }

    let sortStage: Record<string, 1 | -1> = { totalRevenue: -1, instructorEarnings: -1, _id: 1 };
    if (sort === 'earnings_desc') {
      sortStage = { instructorEarnings: -1, totalRevenue: -1, _id: 1 };
    } else if (sort === 'sales_desc') {
      sortStage = { successfulSales: -1, totalRevenue: -1, _id: 1 };
    }

    const pipeline: PipelineStage[] = [
      {
        $match: courseMatch,
      },
      {
        $lookup: {
          from: 'orders',
          let: { cId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$status', OrderStatusEnum.PAID] },
                    { $eq: ['$deletedAt', null] },
                    { $eq: ['$courseId', '$$cId'] },
                    ...(startDate && endDate
                      ? [
                          {
                            $or: [
                              {
                                $and: [
                                  { $gte: [{ $ifNull: ['$paidAt', '$createdAt'] }, startDate] },
                                  { $lte: [{ $ifNull: ['$paidAt', '$createdAt'] }, endDate] },
                                ],
                              },
                            ],
                          },
                        ]
                      : []),
                  ],
                },
              },
            },
            {
              $project: {
                amount: 1,
                instructorEarnings: {
                  $ifNull: [
                    '$instructorEarnings',
                    {
                      $subtract: [
                        '$amount',
                        {
                          $ifNull: [
                            '$platformEarnings',
                            {
                              $round: [
                                {
                                  $multiply: [
                                    '$amount',
                                    { $divide: [{ $ifNull: ['$platformCommissionRate', 30] }, 100] },
                                  ],
                                },
                                0,
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: 'orders',
        },
      },
      {
        $project: {
          id: { $toString: '$_id' },
          title: 1,
          status: 1,
          price: 1,
          thumbnailUrl: 1,
          successfulSales: { $size: '$orders' },
          totalRevenue: { $sum: '$orders.amount' },
          instructorEarnings: { $sum: '$orders.instructorEarnings' },
        },
      },
      { $sort: sortStage },
    ];

    const skip = Math.max(0, (page - 1) * limit);
    const facetPipeline: PipelineStage[] = [
      {
        $facet: {
          coursesFacet: [
            ...(pipeline as unknown as PipelineStage.FacetPipelineStage[]),
            { $skip: skip },
            { $limit: limit },
          ],
          totalFacet: [
            { $match: courseMatch },
            { $count: 'total' },
          ],
        },
      },
    ];

    const [facetResult] = await this.model.db
      .collection('courses')
      .aggregate<{
        coursesFacet: IInstructorCourseRevenue[];
        totalFacet: [{ total: number }] | [];
      }>(facetPipeline)
      .toArray();

    const total = facetResult?.totalFacet?.[0]?.total ?? 0;
    const items = facetResult?.coursesFacet ?? [];
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getInstructorTransactions(
    instructorId: string,
    startDate?: Date,
    endDate?: Date,
    page = 1,
    limit = 10,
  ): Promise<PaginationResult<IRevenueTransactionItem>> {
    const instObjectId = new Types.ObjectId(instructorId);
    const courses = await this.model.db
      .collection('courses')
      .find({ instructorId: instObjectId, deletedAt: null }, { projection: { _id: 1 } })
      .toArray();
    const courseIds = courses.map((c) => c._id);

    const match: Record<string, unknown> = {
      status: OrderStatusEnum.PAID,
      deletedAt: null,
      $or: [{ instructorId: instObjectId }, { courseId: { $in: courseIds } }],
    };

    if (startDate && endDate) {
      match.$and = [
        {
          $or: [
            { paidAt: { $gte: startDate, $lte: endDate } },
            { paidAt: null, createdAt: { $gte: startDate, $lte: endDate } },
          ],
        },
      ];
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'courses',
          localField: 'courseId',
          foreignField: '_id',
          as: 'course',
        },
      },
      { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'instructorId',
          foreignField: '_id',
          as: 'instructorDirect',
        },
      },
      { $unwind: { path: '$instructorDirect', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          courseTitle: {
            $ifNull: ['$courseSnapshot.title', { $ifNull: ['$course.title', 'Khóa học'] }],
          },
          studentName: {
            $ifNull: ['$student.fullName', '$student.email'],
          },
          instructorName: {
            $ifNull: [
              '$courseSnapshot.instructorName',
              { $ifNull: ['$instructorDirect.fullName', '$instructorDirect.email'] },
            ],
          },
        },
      },
      { $sort: { paidAt: -1, createdAt: -1, _id: -1 } },
    ];

    const skip = Math.max(0, (page - 1) * limit);

    const facetPipeline: PipelineStage[] = [
      ...pipeline,
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                id: { $toString: '$_id' },
                orderCode: 1,
                courseTitle: 1,
                studentName: 1,
                instructorName: 1,
                paidAt: {
                  $dateToString: {
                    format: '%Y-%m-%d %H:%M:%S',
                    date: { $ifNull: ['$paidAt', '$createdAt'] },
                    timezone: '+07:00',
                  },
                },
                amount: 1,
                paymentMethod: 1,
              },
            },
          ],
        },
      },
    ];

    const [facetResult] = await this.model.aggregate<{
      metadata: [{ total: number }] | [];
      data: IRevenueTransactionItem[];
    }>(facetPipeline).exec();

    const total = facetResult?.metadata?.[0]?.total ?? 0;
    const items = facetResult?.data ?? [];
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
