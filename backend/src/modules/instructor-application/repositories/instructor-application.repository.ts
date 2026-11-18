import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import {
  IInstructorApplication,
  InstructorApplicationStatusEnum,
  type IAdminInstructorApplicationsStats,
} from 'share-lib';
import { BaseMongoRepository, PaginationResult } from '../../base/index.js';
import {
  InstructorApplicationEntity,
  InstructorApplicationDocument,
} from '../schemas/instructor-application.schema.js';
import {
  QueryInstructorApplicationsDto,
  InstructorApplicationTabEnum,
} from '../dto/query-instructor-applications.dto.js';

@Injectable()
export class InstructorApplicationRepository extends BaseMongoRepository<
  IInstructorApplication,
  InstructorApplicationDocument,
  string
> {
  constructor(
    @InjectModel(InstructorApplicationEntity.name)
    applicationModel: Model<InstructorApplicationDocument>,
  ) {
    super(applicationModel, (doc) => {
      const plain =
        typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
          ? (doc as { toObject: () => Record<string, unknown> }).toObject()
          : (doc as unknown as Record<string, unknown>);

      const rawId = plain._id;
      const id =
        typeof rawId === 'string'
          ? rawId
          : (rawId as { toString?: () => string })?.toString?.() ?? '';

      const rawUserId = plain.userId;
      const userId =
        typeof rawUserId === 'string'
          ? rawUserId
          : (rawUserId as { toString?: () => string })?.toString?.() ?? '';

      const rawReviewedById = plain.reviewedById;
      const reviewedById = rawReviewedById
        ? typeof rawReviewedById === 'string'
          ? rawReviewedById
          : (rawReviewedById as { toString?: () => string })?.toString?.()
        : null;

      return {
        id,
        userId,
        applicantName: (plain.applicantName as string) || '',
        email: (plain.email as string) || '',
        phone: (plain.phone as string) || '',
        avatarUrl: (plain.avatarUrl as string) || undefined,
        expertises: Array.isArray(plain.expertises) ? (plain.expertises as string[]) : [],
        bio: (plain.bio as string) || '',
        experience: (plain.experience as string) || '',
        cvFileName: (plain.cvFileName as string) || undefined,
        cvFileUrl: (plain.cvFileUrl as string) || undefined,
        status: (plain.status as InstructorApplicationStatusEnum) || InstructorApplicationStatusEnum.PENDING,
        rejectionReason: (plain.rejectionReason as string) || null,
        reviewedById: reviewedById || null,
        reviewedByName: (plain.reviewedByName as string) || null,
        reviewedAt: plain.reviewedAt ? new Date(plain.reviewedAt as string | Date).toISOString() : null,
        createdAt: plain.createdAt ? new Date(plain.createdAt as string | Date).toISOString() : undefined,
        updatedAt: plain.updatedAt ? new Date(plain.updatedAt as string | Date).toISOString() : undefined,
      };
    });
  }

  async findApplicationsWithFilter(
    queryDto: QueryInstructorApplicationsDto,
    session?: ClientSession,
  ): Promise<PaginationResult<IInstructorApplication>> {
    const filter: Record<string, unknown> = { deletedAt: null };

    // Filter by Tab
    if (queryDto.tab === InstructorApplicationTabEnum.PENDING) {
      filter.status = InstructorApplicationStatusEnum.PENDING;
    } else if (queryDto.tab === InstructorApplicationTabEnum.HISTORY) {
      if (queryDto.status && queryDto.status !== InstructorApplicationStatusEnum.PENDING) {
        filter.status = queryDto.status;
      } else {
        filter.status = {
          $in: [
            InstructorApplicationStatusEnum.APPROVED,
            InstructorApplicationStatusEnum.REJECTED,
          ],
        };
      }
    } else if (queryDto.status) {
      filter.status = queryDto.status;
    }

    // Filter by Search text (Họ tên, email, phone, expertises)
    if (queryDto.search?.trim()) {
      const searchRegex = new RegExp(queryDto.search.trim(), 'i');
      filter.$or = [
        { applicantName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { expertises: searchRegex },
      ];
    }

    const page = Math.max(1, queryDto.page || 1);
    const limit = Math.max(1, Math.min(100, queryDto.limit || 10));
    const skip = (page - 1) * limit;

    const sortObj = this.buildSortObject(queryDto.sort);

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .session(session ?? null)
        .exec(),
      this.model.countDocuments(filter).session(session ?? null).exec(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((doc) => this.toDomain(doc)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async countPending(session?: ClientSession): Promise<number> {
    return this.model
      .countDocuments({
        status: InstructorApplicationStatusEnum.PENDING,
        deletedAt: null,
      })
      .session(session ?? null)
      .exec();
  }

  async getStats(session?: ClientSession): Promise<IAdminInstructorApplicationsStats> {
    const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
      this.model
        .countDocuments({ status: InstructorApplicationStatusEnum.PENDING, deletedAt: null })
        .session(session ?? null)
        .exec(),
      this.model
        .countDocuments({ status: InstructorApplicationStatusEnum.APPROVED, deletedAt: null })
        .session(session ?? null)
        .exec(),
      this.model
        .countDocuments({ status: InstructorApplicationStatusEnum.REJECTED, deletedAt: null })
        .session(session ?? null)
        .exec(),
    ]);

    return {
      pendingCount,
      approvedCount,
      rejectedCount,
      totalCount: pendingCount + approvedCount + rejectedCount,
    };
  }

  async updateStatus(
    id: string,
    status: InstructorApplicationStatusEnum,
    reviewMeta?: {
      reviewedById?: Types.ObjectId | null;
      reviewedByName?: string | null;
      rejectionReason?: string | null;
      reviewedAt?: Date;
    },
    session?: ClientSession,
  ): Promise<IInstructorApplication | null> {
    const updatePayload: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (reviewMeta) {
      if (reviewMeta.reviewedById !== undefined) updatePayload.reviewedById = reviewMeta.reviewedById;
      if (reviewMeta.reviewedByName !== undefined) updatePayload.reviewedByName = reviewMeta.reviewedByName;
      if (reviewMeta.rejectionReason !== undefined) updatePayload.rejectionReason = reviewMeta.rejectionReason;
      if (reviewMeta.reviewedAt !== undefined) updatePayload.reviewedAt = reviewMeta.reviewedAt;
    }

    const doc = await this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), deletedAt: null },
        { $set: updatePayload },
        { new: true, session: session ?? null },
      )
      .exec();

    return doc ? this.toDomain(doc) : null;
  }
}
