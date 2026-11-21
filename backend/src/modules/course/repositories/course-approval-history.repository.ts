import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types, PipelineStage } from 'mongoose';
import {
  CourseApprovalActionEnum,
  type IAdminCourseApprovalHistoryStats,
  type ICourseApprovalHistory,
} from 'share-lib';
import { BaseMongoRepository, type PaginationResult } from '../../base/index.js';
import { CourseApprovalHistoryEntity } from '../schemas/course-approval-history.schema.js';
import { QueryCourseApprovalHistoryDto } from '../dto/query-course-approval-history.dto.js';

interface RawApprovalHistoryDocument {
  _id: Types.ObjectId | string;
  courseId: Types.ObjectId | string;
  adminId: Types.ObjectId | string;
  instructorId: Types.ObjectId | string;
  action: CourseApprovalActionEnum;
  reason?: string | null;
  previousStatus: string;
  targetStatus: string;
  createdAt: Date;
  updatedAt: Date;
  courseDoc?: {
    _id: Types.ObjectId | string;
    title: string;
    slug: string;
    thumbnailUrl?: string | null;
    price?: number;
    level?: string;
    categoryDoc?: {
      _id: Types.ObjectId | string;
      name: string;
    };
  };
  adminDoc?: {
    _id: Types.ObjectId | string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  };
  instructorDoc?: {
    _id: Types.ObjectId | string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  };
}

@Injectable()
export class CourseApprovalHistoryRepository extends BaseMongoRepository<
  ICourseApprovalHistory,
  CourseApprovalHistoryEntity
> {
  constructor(
    @InjectModel(CourseApprovalHistoryEntity.name)
    model: Model<CourseApprovalHistoryEntity>,
  ) {
    super(model, (doc) => {
      const plain =
        typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
          ? (doc as { toObject: () => Record<string, unknown> }).toObject()
          : (doc as unknown as Record<string, unknown>);

      const rawId = plain._id;
      const id = typeof rawId === 'string' ? rawId : (rawId as { toString?: () => string })?.toString?.() ?? '';

      return {
        ...plain,
        id,
        courseId: (plain.courseId as { toString?: () => string })?.toString?.() ?? String(plain.courseId),
        adminId: (plain.adminId as { toString?: () => string })?.toString?.() ?? String(plain.adminId),
        instructorId: (plain.instructorId as { toString?: () => string })?.toString?.() ?? String(plain.instructorId),
      } as unknown as ICourseApprovalHistory;
    });
  }

  async createHistory(
    entry: {
      courseId: string | Types.ObjectId;
      adminId: string | Types.ObjectId;
      instructorId: string | Types.ObjectId;
      action: CourseApprovalActionEnum;
      previousStatus: string;
      targetStatus: string;
      reason?: string | null;
    },
    session?: ClientSession,
  ): Promise<ICourseApprovalHistory> {
    const doc = new this.model({
      courseId: new Types.ObjectId(entry.courseId),
      adminId: new Types.ObjectId(entry.adminId),
      instructorId: new Types.ObjectId(entry.instructorId),
      action: entry.action,
      previousStatus: entry.previousStatus,
      targetStatus: entry.targetStatus,
      reason: entry.reason ? entry.reason.trim() : null,
      createdById: new Types.ObjectId(entry.adminId),
      updatedById: new Types.ObjectId(entry.adminId),
    });
    await doc.save({ session });
    return this.toDomain(doc);
  }

  async findAdminHistoriesWithPagination(
    query: QueryCourseApprovalHistoryDto,
    session?: ClientSession,
  ): Promise<PaginationResult<ICourseApprovalHistory>> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const initialMatch: Record<string, unknown> = {
      deletedAt: null,
    };

    if (query.action) {
      initialMatch.action = query.action;
    }

    if (query.courseId && Types.ObjectId.isValid(query.courseId)) {
      initialMatch.courseId = new Types.ObjectId(query.courseId);
    }

    const pipeline: PipelineStage[] = [
      { $match: initialMatch },
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
      {
        $lookup: {
          from: 'course_categories',
          localField: 'courseDoc.categoryId',
          foreignField: '_id',
          as: 'categoryDoc',
        },
      },
      {
        $unwind: {
          path: '$categoryDoc',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'adminId',
          foreignField: '_id',
          as: 'adminDoc',
        },
      },
      {
        $unwind: {
          path: '$adminDoc',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'instructorId',
          foreignField: '_id',
          as: 'instructorDoc',
        },
      },
      {
        $unwind: {
          path: '$instructorDoc',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    if (query.search?.trim()) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      pipeline.push({
        $match: {
          $or: [
            { 'courseDoc.title': searchRegex },
            { 'courseDoc.slug': searchRegex },
            { 'instructorDoc.fullName': searchRegex },
            { 'instructorDoc.email': searchRegex },
            { 'adminDoc.fullName': searchRegex },
            { 'adminDoc.email': searchRegex },
            { reason: searchRegex },
          ],
        },
      });
    }

    pipeline.push({
      $facet: {
        total: [{ $count: 'count' }],
        items: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              courseId: 1,
              adminId: 1,
              instructorId: 1,
              action: 1,
              reason: 1,
              previousStatus: 1,
              targetStatus: 1,
              createdAt: 1,
              updatedAt: 1,
              courseDoc: {
                _id: '$courseDoc._id',
                title: '$courseDoc.title',
                slug: '$courseDoc.slug',
                thumbnailUrl: '$courseDoc.thumbnailUrl',
                price: '$courseDoc.price',
                level: '$courseDoc.level',
                category: {
                  id: { $toString: '$categoryDoc._id' },
                  name: '$categoryDoc.name',
                },
              },
              adminDoc: {
                _id: '$adminDoc._id',
                fullName: '$adminDoc.fullName',
                email: '$adminDoc.email',
                avatarUrl: '$adminDoc.avatarUrl',
              },
              instructorDoc: {
                _id: '$instructorDoc._id',
                fullName: '$instructorDoc.fullName',
                email: '$instructorDoc.email',
                avatarUrl: '$instructorDoc.avatarUrl',
              },
            },
          },
        ],
      },
    });

    const aggregation = this.model.aggregate<{
      total: Array<{ count: number }>;
      items: RawApprovalHistoryDocument[];
    }>(pipeline);

    if (session) {
      aggregation.session(session);
    }

    const [result] = await aggregation.exec();
    const total = result?.total?.[0]?.count ?? 0;
    const itemsRaw = result?.items ?? [];

    const items: ICourseApprovalHistory[] = itemsRaw.map((raw) => ({
      id: raw._id.toString(),
      courseId: raw.courseId.toString(),
      adminId: raw.adminId.toString(),
      instructorId: raw.instructorId.toString(),
      action: raw.action,
      reason: raw.reason ?? null,
      previousStatus: raw.previousStatus as unknown as ICourseApprovalHistory['previousStatus'],
      targetStatus: raw.targetStatus as unknown as ICourseApprovalHistory['targetStatus'],
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      course: raw.courseDoc
        ? {
            id: raw.courseDoc._id.toString(),
            title: raw.courseDoc.title,
            slug: raw.courseDoc.slug,
            thumbnailUrl: raw.courseDoc.thumbnailUrl ?? null,
            price: raw.courseDoc.price ?? 0,
            level: raw.courseDoc.level,
            category: raw.courseDoc.categoryDoc
              ? {
                  id: raw.courseDoc.categoryDoc._id.toString(),
                  name: raw.courseDoc.categoryDoc.name,
                }
              : null,
          }
        : null,
      admin: raw.adminDoc
        ? {
            id: raw.adminDoc._id.toString(),
            fullName: raw.adminDoc.fullName,
            email: raw.adminDoc.email,
            avatarUrl: raw.adminDoc.avatarUrl ?? null,
          }
        : null,
      instructor: raw.instructorDoc
        ? {
            id: raw.instructorDoc._id.toString(),
            fullName: raw.instructorDoc.fullName,
            email: raw.instructorDoc.email,
            avatarUrl: raw.instructorDoc.avatarUrl ?? null,
          }
        : null,
    }));

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getStats(session?: ClientSession): Promise<IAdminCourseApprovalHistoryStats> {
    const pipeline: PipelineStage[] = [
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
        },
      },
    ];

    const aggregation = this.model.aggregate<{ _id: CourseApprovalActionEnum; count: number }>(pipeline);
    if (session) {
      aggregation.session(session);
    }

    const rows = await aggregation.exec();
    let approved = 0;
    let rejected = 0;

    for (const row of rows) {
      if (row._id === CourseApprovalActionEnum.APPROVED) {
        approved = row.count;
      } else if (row._id === CourseApprovalActionEnum.REJECTED) {
        rejected = row.count;
      }
    }

    return {
      total: approved + rejected,
      approved,
      rejected,
    };
  }

  async findByCourseId(
    courseId: string,
    session?: ClientSession,
  ): Promise<ICourseApprovalHistory[]> {
    if (!Types.ObjectId.isValid(courseId)) {
      return [];
    }

    const query = this.model
      .find({
        courseId: new Types.ObjectId(courseId),
        deletedAt: null,
      })
      .sort({ createdAt: -1 })
      .populate({
        path: 'adminId',
        select: 'fullName email avatarUrl',
      })
      .populate({
        path: 'instructorId',
        select: 'fullName email avatarUrl',
      });

    if (session) {
      query.session(session);
    }

    const docs = await query.exec();

    return docs.map((doc) => {
      const plain = doc.toObject() as unknown as {
        _id: Types.ObjectId;
        courseId: Types.ObjectId;
        adminId: { _id: Types.ObjectId; fullName: string; email: string; avatarUrl?: string | null };
        instructorId: { _id: Types.ObjectId; fullName: string; email: string; avatarUrl?: string | null };
        action: CourseApprovalActionEnum;
        reason?: string | null;
        previousStatus: string;
        targetStatus: string;
        createdAt: Date;
        updatedAt: Date;
      };

      return {
        id: plain._id.toString(),
        courseId: plain.courseId.toString(),
        adminId: plain.adminId?._id ? plain.adminId._id.toString() : plain.adminId?.toString() ?? '',
        instructorId: plain.instructorId?._id ? plain.instructorId._id.toString() : plain.instructorId?.toString() ?? '',
        action: plain.action,
        reason: plain.reason ?? null,
        previousStatus: plain.previousStatus as unknown as ICourseApprovalHistory['previousStatus'],
        targetStatus: plain.targetStatus as unknown as ICourseApprovalHistory['targetStatus'],
        createdAt: plain.createdAt,
        updatedAt: plain.updatedAt,
        admin: plain.adminId?._id
          ? {
              id: plain.adminId._id.toString(),
              fullName: plain.adminId.fullName,
              email: plain.adminId.email,
              avatarUrl: plain.adminId.avatarUrl ?? null,
            }
          : null,
        instructor: plain.instructorId?._id
          ? {
              id: plain.instructorId._id.toString(),
              fullName: plain.instructorId.fullName,
              email: plain.instructorId.email,
              avatarUrl: plain.instructorId.avatarUrl ?? null,
            }
          : null,
      };
    });
  }
}
