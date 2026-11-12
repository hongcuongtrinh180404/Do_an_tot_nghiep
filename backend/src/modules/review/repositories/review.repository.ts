import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types, type PipelineStage } from 'mongoose';
import {
  IReview,
  ICourseReviewStats,
  IReviewDistributionItem,
  ReviewStatusEnum,
  IAdminReviewStats,
  IReviewModerationEntry,
  IReviewReportEntry,
} from 'share-lib';
import { BaseMongoRepository, PaginationResult } from '../../base/index.js';
import { ReviewEntity, ReviewDocument } from '../schemas/review.schema.js';
import { AdminQueryReviewsDto } from '../dto/admin-query-reviews.dto.js';

const USER_POPULATE = {
  path: 'userId',
  select: 'fullName email avatarUrl',
};

const COURSE_POPULATE = {
  path: 'courseId',
  select: 'title slug thumbnail',
};

@Injectable()
export class ReviewRepository extends BaseMongoRepository<IReview, ReviewDocument, string> {
  constructor(
    @InjectModel(ReviewEntity.name) reviewModel: Model<ReviewDocument>,
  ) {
    super(reviewModel, (doc) => {
      const plain =
        typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
          ? (doc as { toObject: () => Record<string, unknown> }).toObject()
          : (doc as unknown as Record<string, unknown>);

      const rawId = plain._id;
      const id = typeof rawId === 'string' ? rawId : (rawId as { toString?: () => string })?.toString?.() ?? '';

      const rawUserId = plain.userId as unknown;
      let userId = '';
      let user = null;

      if (rawUserId && typeof rawUserId === 'object' && 'fullName' in rawUserId) {
        const popUser = rawUserId as {
          _id?: unknown;
          fullName?: string;
          email?: string;
          avatarUrl?: string | null;
        };
        const popId = popUser._id;
        userId = typeof popId === 'string' ? popId : (popId as { toString?: () => string })?.toString?.() ?? '';
        user = {
          id: userId,
          fullName: popUser.fullName ?? '',
          email: popUser.email ?? '',
          avatarUrl: popUser.avatarUrl ?? null,
        };
      } else if (rawUserId) {
        userId = typeof rawUserId === 'string' ? rawUserId : (rawUserId as { toString?: () => string })?.toString?.() ?? '';
      }

      const rawCourseId = plain.courseId as unknown;
      let courseId = '';
      let course = null;

      if (rawCourseId && typeof rawCourseId === 'object' && 'title' in rawCourseId) {
        const popCourse = rawCourseId as {
          _id?: unknown;
          title?: string;
          slug?: string;
          thumbnail?: string | null;
        };
        const popCId = popCourse._id;
        courseId = typeof popCId === 'string' ? popCId : (popCId as { toString?: () => string })?.toString?.() ?? '';
        course = {
          id: courseId,
          title: popCourse.title ?? '',
          slug: popCourse.slug,
          thumbnail: popCourse.thumbnail ?? null,
        };
      } else if (rawCourseId) {
        courseId = typeof rawCourseId === 'string' ? rawCourseId : (rawCourseId as { toString?: () => string })?.toString?.() ?? '';
      }

      const moderationHistory = Array.isArray(plain.moderationHistory)
        ? (plain.moderationHistory as IReviewModerationEntry[]).map((entry) => ({
            action: entry.action,
            adminId: entry.adminId ? entry.adminId.toString() : '',
            adminName: entry.adminName ?? undefined,
            reason: entry.reason ?? undefined,
            createdAt: entry.createdAt || new Date(),
          }))
        : [];

      const reports = Array.isArray(plain.reports)
        ? (plain.reports as IReviewReportEntry[]).map((rep) => ({
            userId: rep.userId ? rep.userId.toString() : '',
            userName: rep.userName ?? undefined,
            reason: rep.reason,
            createdAt: rep.createdAt || new Date(),
          }))
        : [];

      const status = (plain.status as ReviewStatusEnum) || ReviewStatusEnum.VISIBLE;

      return {
        id,
        userId,
        courseId,
        rating: Number(plain.rating),
        comment: (plain.comment as string | undefined) ?? null,
        status,
        hideReason: (plain.hideReason as string | undefined) ?? null,
        moderationHistory,
        reports,
        reportCount: Number(plain.reportCount || 0),
        user,
        course,
        createdAt: (plain.createdAt as Date) || new Date(),
        updatedAt: (plain.updatedAt as Date) || new Date(),
        deletedAt: (plain.deletedAt as Date | undefined) ?? null,
        createdById: (plain.createdById as string | undefined) ?? null,
        updatedById: (plain.updatedById as string | undefined) ?? null,
      } as IReview;
    });
  }

  async findByUserAndCourse(
    userId: string,
    courseId: string,
    session?: ClientSession,
  ): Promise<IReview | null> {
    const doc = await this.model
      .findOne({
        userId: new Types.ObjectId(userId),
        courseId: new Types.ObjectId(courseId),
        deletedAt: null,
      })
      .populate([USER_POPULATE, COURSE_POPULATE])
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async findCourseReviews(
    courseId: string,
    page: number = 1,
    limit: number = 10,
    session?: ClientSession,
  ): Promise<PaginationResult<IReview>> {
    const filterQuery = {
      courseId: new Types.ObjectId(courseId),
      deletedAt: null,
      status: ReviewStatusEnum.VISIBLE,
    };

    const skip = (page - 1) * limit;

    const [total, docs] = await Promise.all([
      this.model.countDocuments(filterQuery).session(session ?? null).exec(),
      this.model
        .find(filterQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(USER_POPULATE)
        .session(session ?? null)
        .exec(),
    ]);

    const items = docs.map((doc) => this.toDomain(doc));
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async calculateCourseReviewStats(
    courseId: string,
    session?: ClientSession,
  ): Promise<ICourseReviewStats> {
    const matchStage = {
      $match: {
        courseId: new Types.ObjectId(courseId),
        deletedAt: null,
        status: ReviewStatusEnum.VISIBLE,
      },
    };

    const groupStage = {
      $group: {
        _id: '$rating',
        count: { $sum: 1 },
      },
    };

    const aggregation = this.model.aggregate<{ _id: number; count: number }>([
      matchStage,
      groupStage,
    ]);

    if (session) {
      aggregation.session(session);
    }

    const ratingCounts = await aggregation.exec();

    const countMap = new Map<number, number>();
    let totalReviews = 0;
    let totalScore = 0;

    for (const item of ratingCounts) {
      const star = Number(item._id);
      const count = Number(item.count);
      countMap.set(star, count);
      totalReviews += count;
      totalScore += star * count;
    }

    const averageRating =
      totalReviews > 0 ? Math.round((totalScore / totalReviews) * 10) / 10 : 0;

    const distribution: IReviewDistributionItem[] = [5, 4, 3, 2, 1].map((stars) => {
      const count = countMap.get(stars) || 0;
      const percentage =
        totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
      return {
        stars,
        count,
        percentage,
      };
    });

    return {
      averageRating,
      totalReviews,
      distribution,
    };
  }

  async findReviewByIdWithDetails(
    id: string,
    session?: ClientSession,
  ): Promise<IReview | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    const doc = await this.model
      .findById(new Types.ObjectId(id))
      .populate(USER_POPULATE)
      .populate(COURSE_POPULATE)
      .session(session ?? null)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async findAdminReviews(
    dto: AdminQueryReviewsDto,
    session?: ClientSession,
  ): Promise<PaginationResult<IReview>> {
    const page = dto.page || 1;
    const limit = dto.limit || 10;
    const skip = (page - 1) * limit;

    const matchConditions: Record<string, unknown>[] = [];

    // 1. Status Filter
    if (dto.status === ReviewStatusEnum.DELETED) {
      matchConditions.push({
        $or: [{ status: ReviewStatusEnum.DELETED }, { deletedAt: { $ne: null } }],
      });
    } else if (dto.status === ReviewStatusEnum.HIDDEN) {
      matchConditions.push({
        status: ReviewStatusEnum.HIDDEN,
        deletedAt: null,
      });
    } else if (dto.status === ReviewStatusEnum.VISIBLE) {
      matchConditions.push({
        status: ReviewStatusEnum.VISIBLE,
        deletedAt: null,
      });
    } else if (dto.status === 'reported') {
      matchConditions.push({
        reportCount: { $gt: 0 },
        deletedAt: null,
      });
    } else {
      // Default / 'all': exclude soft deleted unless explicitly requested
      matchConditions.push({ deletedAt: null });
    }

    // 2. Rating Filter
    if (dto.rating) {
      matchConditions.push({ rating: Number(dto.rating) });
    }

    // 3. Course Filter
    if (dto.courseId && Types.ObjectId.isValid(dto.courseId)) {
      matchConditions.push({ courseId: new Types.ObjectId(dto.courseId) });
    }

    // 4. Has Reports Filter
    if (dto.hasReports === true) {
      matchConditions.push({ reportCount: { $gt: 0 } });
    }

    // 5. Date Range Filter
    if (dto.startDate || dto.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (dto.startDate) {
        dateFilter.$gte = new Date(dto.startDate);
      }
      if (dto.endDate) {
        const end = new Date(dto.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      matchConditions.push({ createdAt: dateFilter });
    }

    // 6. Search Pipeline: Lookup User & Course to allow searching by User fullName or Course title or Comment
    const searchPipeline: PipelineStage[] = [
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userDoc',
        },
      },
      {
        $unwind: {
          path: '$userDoc',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'courses',
          localField: 'courseId',
          foreignField: '_id',
          as: 'courseDoc',
        },
      },
      {
        $unwind: {
          path: '$courseDoc',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    if (dto.search && dto.search.trim().length > 0) {
      const escapedSearch = dto.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');
      matchConditions.push({
        $or: [
          { comment: { $regex: searchRegex } },
          { 'userDoc.fullName': { $regex: searchRegex } },
          { 'userDoc.email': { $regex: searchRegex } },
          { 'courseDoc.title': { $regex: searchRegex } },
        ],
      });
    }

    const finalMatch: PipelineStage.Match =
      matchConditions.length > 0 ? { $match: { $and: matchConditions } } : { $match: {} };

    // Sorting
    const sortField = dto.sort?.[0]?.orderBy || 'createdAt';
    const sortOrder = dto.sort?.[0]?.order === 'asc' ? 1 : -1;
    const sortStage: PipelineStage.Sort = { $sort: { [sortField]: sortOrder } };

    const pipeline: PipelineStage[] = [
      ...searchPipeline,
      finalMatch,
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [
            sortStage,
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                userId: {
                  _id: '$userDoc._id',
                  fullName: '$userDoc.fullName',
                  email: '$userDoc.email',
                  avatarUrl: '$userDoc.avatarUrl',
                },
                courseId: {
                  _id: '$courseDoc._id',
                  title: '$courseDoc.title',
                  slug: '$courseDoc.slug',
                  thumbnail: '$courseDoc.thumbnail',
                },
                rating: 1,
                comment: 1,
                status: 1,
                hideReason: 1,
                moderationHistory: 1,
                reports: 1,
                reportCount: 1,
                createdAt: 1,
                updatedAt: 1,
                deletedAt: 1,
                createdById: 1,
                updatedById: 1,
              },
            },
          ],
        },
      },
    ];

    const aggregation = this.model.aggregate<{
      metadata: { total: number }[];
      data: Record<string, unknown>[];
    }>(pipeline);

    if (session) {
      aggregation.session(session);
    }

    const [result] = await aggregation.exec();
    const total = result?.metadata?.[0]?.total || 0;
    const rawItems = result?.data || [];
    const items = rawItems.map((item) => this.toDomain(item as unknown as ReviewDocument));
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getAdminStats(session?: ClientSession): Promise<IAdminReviewStats> {
    const pipeline = [
      {
        $facet: {
          total: [{ $count: 'count' }],
          visible: [
            { $match: { status: ReviewStatusEnum.VISIBLE, deletedAt: null } },
            { $count: 'count' },
          ],
          hidden: [
            { $match: { status: ReviewStatusEnum.HIDDEN, deletedAt: null } },
            { $count: 'count' },
          ],
          reported: [
            { $match: { reportCount: { $gt: 0 }, deletedAt: null } },
            { $count: 'count' },
          ],
          deleted: [
            { $match: { $or: [{ status: ReviewStatusEnum.DELETED }, { deletedAt: { $ne: null } }] } },
            { $count: 'count' },
          ],
          visibleStats: [
            { $match: { status: ReviewStatusEnum.VISIBLE, deletedAt: null } },
            {
              $group: {
                _id: null,
                avg: { $avg: '$rating' },
              },
            },
          ],
        },
      },
    ];

    const aggregation = this.model.aggregate<{
      total: { count: number }[];
      visible: { count: number }[];
      hidden: { count: number }[];
      reported: { count: number }[];
      deleted: { count: number }[];
      visibleStats: { avg: number }[];
    }>(pipeline);

    if (session) {
      aggregation.session(session);
    }

    const [res] = await aggregation.exec();

    const total = res?.total?.[0]?.count ?? 0;
    const visibleCount = res?.visible?.[0]?.count ?? 0;
    const hiddenCount = res?.hidden?.[0]?.count ?? 0;
    const reportedCount = res?.reported?.[0]?.count ?? 0;
    const deletedCount = res?.deleted?.[0]?.count ?? 0;
    const rawAvg = res?.visibleStats?.[0]?.avg ?? 0;
    const averageRating = Math.round(rawAvg * 10) / 10;

    return {
      total,
      visibleCount,
      hiddenCount,
      reportedCount,
      deletedCount,
      averageRating,
    };
  }

  async addModerationEntry(
    reviewId: string,
    entry: IReviewModerationEntry,
    updateFields: Partial<ReviewEntity>,
    session?: ClientSession,
  ): Promise<IReview | null> {
    const doc = await this.model
      .findByIdAndUpdate(
        new Types.ObjectId(reviewId),
        {
          ...updateFields,
          $push: {
            moderationHistory: {
              action: entry.action,
              adminId: new Types.ObjectId(entry.adminId),
              adminName: entry.adminName ?? null,
              reason: entry.reason ?? null,
              createdAt: new Date(),
            },
          },
        },
        { new: true, session: session ?? null },
      )
      .populate(USER_POPULATE)
      .populate(COURSE_POPULATE)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async addReportEntry(
    reviewId: string,
    report: IReviewReportEntry,
    session?: ClientSession,
  ): Promise<IReview | null> {
    const doc = await this.model
      .findByIdAndUpdate(
        new Types.ObjectId(reviewId),
        {
          $inc: { reportCount: 1 },
          $push: {
            reports: {
              userId: new Types.ObjectId(report.userId),
              userName: report.userName ?? null,
              reason: report.reason,
              createdAt: new Date(),
            },
          },
        },
        { new: true, session: session ?? null },
      )
      .populate(USER_POPULATE)
      .populate(COURSE_POPULATE)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }

  async dismissReports(
    reviewId: string,
    session?: ClientSession,
  ): Promise<IReview | null> {
    const doc = await this.model
      .findByIdAndUpdate(
        new Types.ObjectId(reviewId),
        {
          $set: {
            reports: [],
            reportCount: 0,
          },
        },
        { new: true, session: session ?? null },
      )
      .populate(USER_POPULATE)
      .populate(COURSE_POPULATE)
      .exec();

    return doc ? this.toDomain(doc) : null;
  }
}
