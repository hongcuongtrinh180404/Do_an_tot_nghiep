import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrderStatusEnum, ReviewStatusEnum, type IAdminUserEnrolledCourse, type IAdminUserTeachingCourse } from 'share-lib';
import { CourseEntity } from '../../course/schemas/course.schema.js';
import { EnrollmentEntity } from '../../enrollment/schemas/enrollment.schema.js';
import { OrderEntity } from '../../enrollment/schemas/order.schema.js';
import {
  assertRevenueTotals,
  instructorMoneyStages,
  instructorOrderOwnershipStages,
  instructorPaidDateStages,
  instructorRevenueGroup,
  storedMoneyIsValid,
} from '../../payment/utils/instructor-revenue.pipeline.js';

const QUERY_TIMEOUT_MS = 5000;

export type AdminEnrollmentRow = Omit<IAdminUserEnrolledCourse,
  'totalLessons' | 'completedLessons' | 'progressPercent' | 'status'>;
export type AdminTeachingRow = Omit<IAdminUserTeachingCourse,
  'studentCount' | 'revenue' | 'rating' | 'reviewCount'>;

export interface AdminCourseRevenue {
  _id: Types.ObjectId;
  totalRevenue: number;
  instructorEarnings: number;
  platformCommission: number;
  successfulSales: number;
  reconstructedOrders: number;
  invalidMoney: number;
}

export interface AdminCourseReviewStats {
  courseId: string;
  totalScore: number;
  totalReviews: number;
}

@Injectable()
export class AdminUserCoursesRepository {
  constructor(
    @InjectModel(CourseEntity.name) private readonly courses: Model<CourseEntity>,
    @InjectModel(EnrollmentEntity.name) private readonly enrollments: Model<EnrollmentEntity>,
    @InjectModel(OrderEntity.name) private readonly orders: Model<OrderEntity>,
  ) {}

  async findEnrolledCourses(userId: string): Promise<AdminEnrollmentRow[]> {
    return this.enrollments.aggregate<AdminEnrollmentRow>([
      { $match: { userId: new Types.ObjectId(userId), deletedAt: null } },
      { $sort: { enrolledAt: -1, _id: -1 } },
      { $lookup: { from: this.courses.collection.name, localField: 'courseId', foreignField: '_id', as: 'course' } },
      { $unwind: '$course' },
      // Archived courses remain visible to admins and their enrolled learners.
      { $match: { 'course.deletedAt': null } },
      {
        $lookup: {
          from: this.orders.collection.name,
          let: { orderId: '$orderId', userId: '$userId', courseId: '$courseId' },
          pipeline: [
            { $match: { deletedAt: null, $expr: { $and: [
              { $eq: ['$_id', '$$orderId'] },
              { $eq: ['$userId', '$$userId'] },
              { $eq: ['$courseId', '$$courseId'] },
            ] } } },
            ...instructorPaidDateStages(),
            { $project: {
              _id: 0, status: 1,
              amount: { $cond: [storedMoneyIsValid('$amount'), '$amount', null] },
              paidAt: { $cond: [{ $eq: ['$status', OrderStatusEnum.PAID] }, '$_revenuePaidAt', null] },
            } },
          ],
          as: 'purchase',
        },
      },
      { $set: { purchase: { $arrayElemAt: ['$purchase', 0] } } },
      { $project: {
        _id: 0,
        id: { $toString: '$_id' },
        courseId: { $toString: '$courseId' },
        title: '$course.title',
        thumbnailUrl: { $ifNull: ['$course.thumbnailUrl', null] },
        enrolledAt: { $ifNull: ['$enrolledAt', '$createdAt'] },
        paidAt: { $ifNull: ['$purchase.paidAt', null] },
        // The free-registration flow explicitly stores orderId=null. A missing legacy
        // field is unknown evidence, not a reason to invent a free purchase.
        price: { $cond: [
          { $eq: [{ $type: '$orderId' }, 'null'] }, 0,
          { $ifNull: ['$purchase.amount', null] },
        ] },
        isFree: { $or: [
          { $eq: [{ $type: '$orderId' }, 'null'] },
          { $eq: ['$purchase.amount', 0] },
        ] },
        paymentStatus: { $ifNull: ['$purchase.status', null] },
      } },
    ]).option({ maxTimeMS: QUERY_TIMEOUT_MS }).exec();
  }

  async findTeachingCourses(userId: string): Promise<AdminTeachingRow[]> {
    return this.courses.aggregate<AdminTeachingRow>([
      { $match: { instructorId: new Types.ObjectId(userId), deletedAt: null } },
      { $sort: { updatedAt: -1, _id: -1 } },
      { $project: {
        _id: 0, id: { $toString: '$_id' }, title: 1, price: 1, level: 1, status: 1,
        thumbnailUrl: { $ifNull: ['$thumbnailUrl', null] },
        updatedAt: 1,
      } },
    ]).option({ maxTimeMS: QUERY_TIMEOUT_MS }).exec();
  }

  async getTeachingRevenue(userId: string): Promise<AdminCourseRevenue[]> {
    // Use the same transaction ownership and stored-commission rules as the revenue reports.
    // No current course-price, account-commission or 30% default is used here.
    const rows = await this.orders.aggregate<AdminCourseRevenue>([
      ...instructorOrderOwnershipStages(userId),
      ...instructorMoneyStages(),
      { $group: { ...instructorRevenueGroup, _id: '$courseId' } },
    ]).option({ maxTimeMS: QUERY_TIMEOUT_MS }).exec();
    for (const row of rows) assertRevenueTotals(row);
    return rows;
  }

  async getStudentCounts(courseIds: string[]): Promise<{ total: number; byCourse: Map<string, number> }> {
    if (!courseIds.length) return { total: 0, byCourse: new Map() };
    const [result] = await this.enrollments.aggregate<{
      total: Array<{ count: number }>;
      courses: Array<{ _id: Types.ObjectId; count: number }>;
    }>([
      { $match: { courseId: { $in: courseIds.map((id) => new Types.ObjectId(id)) }, deletedAt: null } },
      { $facet: {
        total: [{ $group: { _id: '$userId' } }, { $count: 'count' }],
        courses: [
          { $group: { _id: { courseId: '$courseId', userId: '$userId' } } },
          { $group: { _id: '$_id.courseId', count: { $sum: 1 } } },
        ],
      } },
    ]).option({ maxTimeMS: QUERY_TIMEOUT_MS }).exec();
    return {
      total: result?.total[0]?.count ?? 0,
      byCourse: new Map((result?.courses ?? []).map((row) => [row._id.toHexString(), row.count])),
    };
  }

  async getReviewStats(courseIds: string[]): Promise<AdminCourseReviewStats[]> {
    if (!courseIds.length) return [];
    return this.courses.db.collection('reviews').aggregate<AdminCourseReviewStats>([
      { $match: {
        courseId: { $in: courseIds.map((id) => new Types.ObjectId(id)) },
        deletedAt: null, status: ReviewStatusEnum.VISIBLE,
      } },
      { $group: { _id: '$courseId', totalScore: { $sum: '$rating' }, totalReviews: { $sum: 1 } } },
      { $project: { _id: 0, courseId: { $toString: '$_id' }, totalScore: 1, totalReviews: 1 } },
    ], { maxTimeMS: QUERY_TIMEOUT_MS }).toArray();
  }
}
