import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, type PipelineStage } from 'mongoose';
import {
  IOrder,
  OrderStatusEnum,
  CourseStatusEnum,
  InstructorApplicationStatusEnum,
  ReviewStatusEnum,
  RoleEnum,
  type IDashboardRevenueChartPoint,
  type CategoryRevenueItem,
  type IDashboardPendingTask,
  type IDashboardCoursePerformance,
} from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { OrderEntity } from '../../enrollment/schemas/order.schema.js';

@Injectable()
export class AdminDashboardRepository extends BaseMongoRepository<IOrder, OrderEntity> {
  constructor(@InjectModel(OrderEntity.name) orderModel: Model<OrderEntity>) {
    super(orderModel, (doc) => {
      const plain =
        typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
          ? (doc as { toObject: () => Record<string, unknown> }).toObject()
          : (doc as unknown as Record<string, unknown>);
      return {
        ...plain,
        id: String(plain._id),
        userId: String(plain.userId),
        courseId: String(plain.courseId),
      } as unknown as IOrder;
    });
  }

  async getRevenueKpi(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalRevenue: number;
    platformCommission: number;
    instructorEarnings: number;
    successfulOrders: number;
  }> {
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

    const result = await this.model
      .aggregate<{
        totalRevenue: number;
        platformCommission: number;
        instructorEarnings: number;
        successfulOrders: number;
      }>(pipeline)
      .exec();

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

  async getNewStudentsCount(startDate?: Date, endDate?: Date): Promise<number> {
    const match: Record<string, unknown> = {
      role: RoleEnum.STUDENT,
      deletedAt: null,
    };

    if (startDate && endDate) {
      match.createdAt = { $gte: startDate, $lte: endDate };
    }

    return this.model.db.collection('users').countDocuments(match);
  }

  async getEnrollmentsStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    total: number;
    paid: number;
    free: number;
  }> {
    const match: Record<string, unknown> = {
      deletedAt: null,
    };

    if (startDate && endDate) {
      match.enrolledAt = { $gte: startDate, $lte: endDate };
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          paid: {
            $sum: {
              $cond: [
                {
                  $and: [{ $ne: ['$orderId', null] }, { $ne: ['$orderId', undefined] }],
                },
                1,
                0,
              ],
            },
          },
          free: {
            $sum: {
              $cond: [{ $or: [{ $eq: ['$orderId', null] }, { $not: ['$orderId'] }] }, 1, 0],
            },
          },
        },
      },
    ];

    const [res] = await this.model.db
      .collection('enrollments')
      .aggregate<{ total: number; paid: number; free: number }>(pipeline)
      .toArray();

    return {
      total: res?.total ?? 0,
      paid: res?.paid ?? 0,
      free: res?.free ?? 0,
    };
  }

  async getPendingTasksCounts(): Promise<{
    cur: number;
    courses: number;
    instructors: number;
    reviews: number;
  }> {
    const [courses, instructors, reviews] = await Promise.all([
      this.model.db.collection('courses').countDocuments({
        status: CourseStatusEnum.PENDING_APPROVAL,
        deletedAt: null,
      }),
      this.model.db.collection('instructor_applications').countDocuments({
        status: InstructorApplicationStatusEnum.PENDING,
        deletedAt: null,
      }),
      this.model.db.collection('reviews').countDocuments({
        reportCount: { $gt: 0 },
        status: { $nin: [ReviewStatusEnum.DELETED, ReviewStatusEnum.HIDDEN] },
        deletedAt: null,
      }),
    ]);

    return {
      cur: courses + instructors + reviews,
      courses,
      instructors,
      reviews,
    };
  }

  async getRevenueChartPoints(
    startDate: Date,
    endDate: Date,
    groupBy: 'day' | 'month',
  ): Promise<IDashboardRevenueChartPoint[]> {
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

    const rows = await this.model
      .aggregate<{
        _id: string;
        totalRevenue: number;
        platformCommission: number;
        instructorEarnings: number;
        orderCount: number;
      }>(pipeline)
      .exec();

    const dataMap = new Map<string, (typeof rows)[0]>();
    for (const row of rows) {
      dataMap.set(row._id, row);
    }

    const result: IDashboardRevenueChartPoint[] = [];
    const pad = (n: number) => String(n).padStart(2, '0');

    if (groupBy === 'day') {
      const current = new Date(startDate.getTime());
      while (current.getTime() <= endDate.getTime()) {
        const vnDate = new Date(current.getTime() + 7 * 3600000);
        const y = vnDate.getUTCFullYear();
        const m = vnDate.getUTCMonth() + 1;
        const d = vnDate.getUTCDate();
        const key = `${y}-${pad(m)}-${pad(d)}`;
        const label = `${pad(d)}/${pad(m)}`;
        const existing = dataMap.get(key);

        result.push({
          date: key,
          label,
          grossRevenue: existing?.totalRevenue ?? 0,
          platformRevenue: existing?.platformCommission ?? 0,
          instructorRevenue: existing?.instructorEarnings ?? 0,
          orderCount: existing?.orderCount ?? 0,
        });

        current.setTime(current.getTime() + 86400000);
      }
    } else {
      // groupBy === 'month'
      const startY = startDate.getUTCFullYear();
      const startM = startDate.getUTCMonth() + 1;
      const endY = endDate.getUTCFullYear();
      const endM = endDate.getUTCMonth() + 1;

      let curY = startY;
      let curM = startM;
      while (curY < endY || (curY === endY && curM <= endM)) {
        const key = `${curY}-${pad(curM)}`;
        const label = `T${curM}/${String(curY).slice(2)}`;
        const existing = dataMap.get(key);

        result.push({
          date: key,
          label,
          grossRevenue: existing?.totalRevenue ?? 0,
          platformRevenue: existing?.platformCommission ?? 0,
          instructorRevenue: existing?.instructorEarnings ?? 0,
          orderCount: existing?.orderCount ?? 0,
        });

        curM++;
        if (curM > 12) {
          curM = 1;
          curY++;
        }
      }
    }

    return result;
  }

  async getCategoryRevenue(
    startDate?: Date,
    endDate?: Date,
  ): Promise<CategoryRevenueItem[]> {
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
          from: 'course_categories',
          localField: 'course.categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$category._id', 'uncategorized'] },
          name: { $first: { $ifNull: ['$category.name', 'Khác / Chưa phân loại'] } },
          revenue: { $sum: '$amount' },
        },
      },
      { $sort: { revenue: -1 } },
    ];

    const rows = await this.model
      .aggregate<{ _id: unknown; name: string; revenue: number }>(pipeline)
      .exec();

    return rows.map((r) => ({
      id: String(r._id),
      name: String(r.name),
      revenue: Number(r.revenue) || 0,
    }));
  }

  async getRecentPendingTasks(limit = 10): Promise<IDashboardPendingTask[]> {
    const [pendingCourses, pendingApps, reportedReviews] = await Promise.all([
      this.model.db
        .collection('courses')
        .aggregate([
          {
            $match: {
              status: CourseStatusEnum.PENDING_APPROVAL,
              deletedAt: null,
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: 'instructorId',
              foreignField: '_id',
              as: 'instructor',
            },
          },
          { $unwind: { path: '$instructor', preserveNullAndEmptyArrays: true } },
          { $sort: { approvalRequestedAt: -1, updatedAt: -1, createdAt: -1 } },
          { $limit: limit },
        ])
        .toArray(),

      this.model.db
        .collection('instructor_applications')
        .aggregate([
          {
            $match: {
              status: InstructorApplicationStatusEnum.PENDING,
              deletedAt: null,
            },
          },
          { $sort: { createdAt: -1 } },
          { $limit: limit },
        ])
        .toArray(),

      this.model.db
        .collection('reviews')
        .aggregate([
          {
            $match: {
              reportCount: { $gt: 0 },
              status: { $nin: [ReviewStatusEnum.DELETED, ReviewStatusEnum.HIDDEN] },
              deletedAt: null,
            },
          },
          {
            $lookup: {
              from: 'courses',
              localField: 'courseId',
              foreignField: '_id',
              as: 'course',
            },
          },
          { $unwind: { path: '$course', preserveNullAndEmptyArrays: true } },
          { $sort: { updatedAt: -1, createdAt: -1 } },
          { $limit: limit },
        ])
        .toArray(),
    ]);

    const formatTimeAgo = (date?: Date | string | null): string => {
      if (!date) return 'Vừa xong';
      const d = new Date(date);
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Vừa xong';
      if (diffMins < 60) return `${diffMins} phút trước`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} giờ trước`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} ngày trước`;
    };

    const tasks: (IDashboardPendingTask & { rawDate: number })[] = [];

    for (const c of pendingCourses) {
      const date = c.approvalRequestedAt || c.updatedAt || c.createdAt;
      tasks.push({
        id: String(c._id),
        type: 'course',
        title: String(c.title || 'Khóa học chờ duyệt'),
        actor: String(c.instructor?.fullName || c.instructor?.email || 'Giảng viên'),
        timeAgo: formatTimeAgo(date),
        badgeLabel: 'Khóa học chờ duyệt',
        route: '/admin/courses?status=pending_approval',
        rawDate: date ? new Date(date).getTime() : 0,
      });
    }

    for (const a of pendingApps) {
      const date = a.createdAt;
      tasks.push({
        id: String(a._id),
        type: 'instructor',
        title: `Hồ sơ đăng ký Giảng viên: ${a.fullName || 'Ứng viên'}`,
        actor: String(a.fullName || a.email || 'Ứng viên'),
        timeAgo: formatTimeAgo(date),
        badgeLabel: 'Hồ sơ giảng viên',
        route: '/admin/instructors',
        rawDate: date ? new Date(date).getTime() : 0,
      });
    }

    for (const r of reportedReviews) {
      const date = r.updatedAt || r.createdAt;
      const cTitle = r.course?.title ? ` tại khóa ${r.course.title}` : '';
      tasks.push({
        id: String(r._id),
        type: 'review',
        title: `Báo cáo đánh giá${cTitle}`,
        actor: String(r.userName || 'Người dùng'),
        timeAgo: formatTimeAgo(date),
        badgeLabel: 'Báo cáo đánh giá',
        route: '/admin/reviews?hasReports=true',
        rawDate: date ? new Date(date).getTime() : 0,
      });
    }

    tasks.sort((a, b) => b.rawDate - a.rawDate);

    return tasks.slice(0, limit).map(({ rawDate, ...rest }) => rest);
  }

  async getCoursesPerformance(params: {
    startDate?: Date;
    endDate?: Date;
    categoryId?: string;
    instructorId?: string;
    limit?: number;
  }): Promise<IDashboardCoursePerformance[]> {
    const { startDate, endDate, categoryId, instructorId, limit = 50 } = params;

    const courseMatch: Record<string, unknown> = {
      deletedAt: null,
    };

    if (categoryId && categoryId !== 'all') {
      if (Types.ObjectId.isValid(categoryId)) {
        courseMatch.categoryId = new Types.ObjectId(categoryId);
      }
    }

    if (instructorId && instructorId !== 'all') {
      if (Types.ObjectId.isValid(instructorId)) {
        courseMatch.instructorId = new Types.ObjectId(instructorId);
      }
    }

    const orderDateMatch: Record<string, unknown> = {
      status: OrderStatusEnum.PAID,
      deletedAt: null,
    };

    if (startDate && endDate) {
      orderDateMatch.$or = [
        { paidAt: { $gte: startDate, $lte: endDate } },
        { paidAt: null, createdAt: { $gte: startDate, $lte: endDate } },
      ];
    }

    const enrollmentDateMatch: Record<string, unknown> = {
      deletedAt: null,
    };
    if (startDate && endDate) {
      enrollmentDateMatch.enrolledAt = { $gte: startDate, $lte: endDate };
    }

    const pipeline: PipelineStage[] = [
      { $match: courseMatch },
      {
        $lookup: {
          from: 'users',
          localField: 'instructorId',
          foreignField: '_id',
          as: 'instructor',
        },
      },
      { $unwind: { path: '$instructor', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'course_categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'orders',
          let: { cId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$courseId', '$$cId'] },
                    { $eq: ['$status', OrderStatusEnum.PAID] },
                    { $eq: ['$deletedAt', null] },
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
          ],
          as: 'periodOrders',
        },
      },
      {
        $lookup: {
          from: 'enrollments',
          let: { cId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$courseId', '$$cId'] },
                    { $eq: ['$deletedAt', null] },
                    ...(startDate && endDate
                      ? [
                          { $gte: ['$enrolledAt', startDate] },
                          { $lte: ['$enrolledAt', endDate] },
                        ]
                      : []),
                  ],
                },
              },
            },
          ],
          as: 'periodEnrollments',
        },
      },
      {
        $lookup: {
          from: 'enrollments',
          let: { cId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$courseId', '$$cId'] }, { $eq: ['$deletedAt', null] }],
                },
              },
            },
          ],
          as: 'allTimeEnrollments',
        },
      },
      {
        $lookup: {
          from: 'learning_progress',
          let: { cId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ['$courseId', '$$cId'] }, { $eq: ['$deletedAt', null] }],
                },
              },
            },
          ],
          as: 'progressDocs',
        },
      },
      {
        $project: {
          id: { $toString: '$_id' },
          title: 1,
          price: { $ifNull: ['$price', 0] },
          ratingAvg: { $ifNull: ['$ratingAvg', 0] },
          reviewCount: { $ifNull: ['$reviewCount', 0] },
          instructorName: {
            $ifNull: ['$instructor.fullName', { $ifNull: ['$instructor.email', 'Giảng viên'] }],
          },
          categoryName: { $ifNull: ['$category.name', 'Khác'] },
          salesCount: { $size: '$periodOrders' },
          revenue: { $sum: '$periodOrders.amount' },
          newEnrollments: { $size: '$periodEnrollments' },
          totalOwned: { $size: '$allTimeEnrollments' },
          startedLearners: { $size: '$progressDocs' },
          completedLearners: {
            $size: {
              $filter: {
                input: '$progressDocs',
                as: 'p',
                cond: { $eq: ['$$p.sessionClosed', true] },
              },
            },
          },
        },
      },
      { $limit: limit },
    ];

    const rows = await this.model.db
      .collection('courses')
      .aggregate<Record<string, unknown>>(pipeline)
      .toArray();

    return rows.map((r) => {
      const price = Number(r.price) || 0;
      const started = Number(r.startedLearners) || 0;
      const completed = Number(r.completedLearners) || 0;
      const completionRate =
        started > 0 ? Number(((completed / started) * 100).toFixed(1)) : 0;

      const title = String(r.title || 'Khóa học');
      const words = title.split(' ').filter(Boolean);
      const thumbnailText =
        words.length >= 2
          ? `${words[0].slice(0, 3)}${words[1].slice(0, 3)}`
          : title.slice(0, 6);

      return {
        id: String(r.id || r._id),
        title,
        instructor: String(r.instructorName || 'Giảng viên'),
        category: String(r.categoryName || 'Khác'),
        price,
        isFree: price === 0,
        thumbnailBg: 'bg-primary/10 text-primary',
        thumbnailText,
        salesCount: Number(r.salesCount) || 0,
        revenue: Number(r.revenue) || 0,
        newEnrollments: Number(r.newEnrollments) || 0,
        totalOwned: Number(r.totalOwned) || 0,
        startedLearners: started,
        completedLearners: completed,
        completionRate,
        rating: Number(r.ratingAvg) || 0,
        reviewCount: Number(r.reviewCount) || 0,
      };
    });
  }
}
