import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
import { IReview, ICourseReviewStats, IReviewDistributionItem } from 'share-lib';
import { BaseMongoRepository, PaginationResult } from '../../base/index.js';
import { ReviewEntity, ReviewDocument } from '../schemas/review.schema.js';

const USER_POPULATE = {
  path: 'userId',
  select: 'fullName email avatarUrl',
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

      const rawCourseId = plain.courseId;
      const courseId =
        typeof rawCourseId === 'string'
          ? rawCourseId
          : (rawCourseId as { toString?: () => string })?.toString?.() ?? '';

      return {
        id,
        userId,
        courseId,
        rating: Number(plain.rating),
        comment: (plain.comment as string | undefined) ?? null,
        user,
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
      .populate(USER_POPULATE)
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
}

