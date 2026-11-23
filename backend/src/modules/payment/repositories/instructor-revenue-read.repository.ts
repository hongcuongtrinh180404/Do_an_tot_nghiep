import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, type PipelineStage } from 'mongoose';
import { RoleEnum, UserStatusEnum } from 'share-lib';
import { OrderEntity } from '../../enrollment/schemas/order.schema.js';
import {
  assertRevenueTotals, InstructorRevenueDataError, instructorMoneyStages, instructorOrderOwnershipStages,
  instructorPaidDateStages, instructorRevenueGroup,
} from '../utils/instructor-revenue.pipeline.js';

export const INSTRUCTOR_REVENUE_QUERY_MS = 1500;
export interface InstructorRevenueTotals {
  totalRevenue: number;
  platformCommission: number;
  instructorEarnings: number;
  successfulSales: number;
  reconstructedOrders: number;
}
export interface InstructorRevenueCourse {
  id: string;
  title: string;
}
export type InstructorCourseSales = InstructorRevenueCourse & InstructorRevenueTotals & { rank: number };
const emptyTotals = (): InstructorRevenueTotals => ({
  totalRevenue: 0, platformCommission: 0, instructorEarnings: 0, successfulSales: 0, reconstructedOrders: 0,
});
const literal = (text: string) => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
const title = { $ifNull: ['$courseSnapshot.title', { $ifNull: [{ $arrayElemAt: ['$_revenueCourse.title', 0] }, 'Khóa học đã xóa'] }] };
type TotalsRow = InstructorRevenueTotals & { invalidMoney: number };
function totalsFrom(row?: TotalsRow): InstructorRevenueTotals {
  if (!row) return emptyTotals();
  assertRevenueTotals(row);
  return { totalRevenue: row.totalRevenue, platformCommission: row.platformCommission,
    instructorEarnings: row.instructorEarnings, successfulSales: row.successfulSales,
    reconstructedOrders: row.reconstructedOrders };
}
const inPeriod = (start: Date, endExclusive: Date): PipelineStage.Match =>
  ({ $match: { _revenuePaidAt: { $gte: start, $lt: endExclusive } } });

@Injectable()
export class InstructorRevenueReadRepository {
  constructor(@InjectModel(OrderEntity.name) private readonly orders: Model<OrderEntity>) {}

  async canRead(userId: string): Promise<boolean> {
    return Boolean(await this.orders.db.collection('users').findOne({
      _id: new Types.ObjectId(userId), deletedAt: null, status: UserStatusEnum.ACTIVE,
      role: { $in: [RoleEnum.INSTRUCTOR, RoleEnum.ADMIN] },
    }, { projection: { _id: 1 }, maxTimeMS: INSTRUCTOR_REVENUE_QUERY_MS }));
  }

  /** Includes historical sales of hidden/deleted/transferred courses without leaking current author data. */
  async courses(userId: string, options: { keyword?: string; courseId?: string; page: number; limit: number }) {
    const id = options.courseId ? new Types.ObjectId(options.courseId) : undefined;
    const pipeline: PipelineStage[] = [
      { $match: { instructorId: new Types.ObjectId(userId), ...(id ? { _id: id } : {}) } },
      { $project: { _id: 1, title: 1, _priority: { $literal: 0 } } },
      { $unionWith: { coll: 'orders', pipeline: [
        ...instructorOrderOwnershipStages(userId, options.courseId),
        { $match: { courseId: { $type: 'objectId' } } },
        { $sort: { paidAt: -1, _id: -1 } },
        { $project: { _id: '$courseId', title, _priority: { $literal: 1 } } },
      ] } },
      { $sort: { _priority: 1 } },
      { $group: { _id: '$_id', title: { $first: '$title' } } },
      ...(options.keyword ? [{ $match: { title: literal(options.keyword) } }] : []),
      { $sort: { title: 1, _id: 1 } },
      { $facet: {
        metadata: [{ $count: 'total' }],
        items: [
          { $skip: (options.page - 1) * options.limit }, { $limit: options.limit },
          { $project: { _id: 0, id: { $toString: '$_id' }, title: 1 } },
        ],
      } },
    ];
    const [result] = await this.orders.db.collection('courses').aggregate<{
      metadata: { total: number }[]; items: InstructorRevenueCourse[];
    }>(pipeline, { maxTimeMS: INSTRUCTOR_REVENUE_QUERY_MS }).toArray();
    return { items: result?.items ?? [], total: result?.metadata[0]?.total ?? 0 };
  }

  async summary(userId: string, start?: Date, endExclusive?: Date, courseId?: string): Promise<InstructorRevenueTotals> {
    return (await this.periodTotals(userId, [{ start, endExclusive }], courseId))[0];
  }

  compare(userId: string, current: { start: Date; endExclusive: Date },
    previous: { start: Date; endExclusive: Date }, courseId?: string): Promise<InstructorRevenueTotals[]> {
    return this.periodTotals(userId, [current, previous], courseId);
  }

  private async periodTotals(userId: string, periods: Array<{ start?: Date; endExclusive?: Date }>, courseId?: string) {
    const facets: Record<string, PipelineStage.FacetPipelineStage[]> = {
      missingDate: [{ $match: { _revenuePaidAt: null } }, { $count: 'total' }],
    };
    for (const [index, period] of periods.entries()) {
      facets[`period${index}`] = [
        ...(period.start && period.endExclusive ? [inPeriod(period.start, period.endExclusive)] : []),
        { $group: instructorRevenueGroup },
      ];
    }
    const [facet] = await this.orders.aggregate<Record<string, unknown>>([
      ...instructorOrderOwnershipStages(userId, courseId),
      ...instructorPaidDateStages(),
      ...instructorMoneyStages(),
      { $facet: facets },
    ]).option({ maxTimeMS: INSTRUCTOR_REVENUE_QUERY_MS }).exec();
    const missing = facet?.missingDate as { total: number }[] | undefined;
    if (periods.some((p) => p.start && p.endExclusive) && missing?.[0]?.total) throw new InstructorRevenueDataError('missing_payment_date');
    return periods.map((_period, index) => totalsFrom((facet?.[`period${index}`] as TotalsRow[] | undefined)?.[0]));
  }

  async topCourses(userId: string, start: Date, endExclusive: Date, page: number, limit: number) {
    const [facet] = await this.orders.aggregate<{
      items: InstructorCourseSales[]; metadata: { total: number }[]; summary: TotalsRow[]; missingDate: { total: number }[];
      leaders: { courses: number }[];
    }>([
      ...instructorOrderOwnershipStages(userId),
      ...instructorPaidDateStages(),
      ...instructorMoneyStages(),
      { $facet: {
        missingDate: [{ $match: { _revenuePaidAt: null } }, { $count: 'total' }],
        summary: [inPeriod(start, endExclusive), { $group: instructorRevenueGroup }],
        metadata: [inPeriod(start, endExclusive), { $group: { _id: '$courseId' } }, { $count: 'total' }],
        leaders: [inPeriod(start, endExclusive), { $group: { _id: '$courseId', sales: { $sum: 1 } } },
          { $group: { _id: '$sales', courses: { $sum: 1 } } }, { $sort: { _id: -1 } }, { $limit: 1 }],
        items: [
          inPeriod(start, endExclusive),
          { $sort: { _revenuePaidAt: -1, _id: -1 } },
          { $group: { ...instructorRevenueGroup, _id: '$courseId', title: { $first: title } } },
          { $setWindowFields: { sortBy: { successfulSales: -1 }, output: { rank: { $rank: {} } } } },
          { $sort: { successfulSales: -1, instructorEarnings: -1, _id: 1 } },
          { $skip: (page - 1) * limit }, { $limit: limit },
          { $project: { _id: 0, id: { $toString: '$_id' }, title: 1, rank: 1,
            totalRevenue: 1, platformCommission: 1, instructorEarnings: 1, successfulSales: 1, reconstructedOrders: 1 } },
        ],
      } },
    ]).option({ maxTimeMS: INSTRUCTOR_REVENUE_QUERY_MS }).exec();
    if (facet?.missingDate[0]?.total) throw new InstructorRevenueDataError('missing_payment_date');
    // Summary, ranks and rows share one database read. Incomplete rows outside the
    // displayed page still invalidate the whole result instead of hiding in totals.
    const totals = totalsFrom(facet?.summary[0]);
    return { totals, items: facet?.items ?? [], total: facet?.metadata[0]?.total ?? 0,
      topTiedCount: facet?.leaders[0]?.courses ?? 0 };
  }
}
