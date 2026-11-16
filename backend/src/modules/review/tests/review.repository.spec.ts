import { describe, expect, it, vi } from 'vitest';
import { Model, Types, type PipelineStage } from 'mongoose';
import { ReviewStatusEnum } from 'share-lib';
import { ReviewRepository } from '../repositories/review.repository.js';
import { ReviewDocument } from '../schemas/review.schema.js';

describe('ReviewRepository', () => {
  const userId = new Types.ObjectId().toString();
  const courseId = new Types.ObjectId().toString();

  it('1. should find review by user and course excluding soft-deleted records', async () => {
    const mockDoc = {
      _id: new Types.ObjectId(),
      userId: {
        _id: new Types.ObjectId(userId),
        fullName: 'Nguyễn Văn A',
        email: 'vana@example.com',
        avatarUrl: null,
      },
      courseId: new Types.ObjectId(courseId),
      rating: 5,
      comment: 'Khóa học tuyệt vời!',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    const exec = vi.fn().mockResolvedValue(mockDoc);
    const sessionFn = vi.fn().mockReturnValue({ exec });
    const populate = vi.fn().mockReturnValue({ session: sessionFn });
    const findOne = vi.fn().mockReturnValue({ populate });

    const repository = new ReviewRepository({ findOne } as unknown as Model<ReviewDocument>);

    const result = await repository.findByUserAndCourse(userId, courseId);

    expect(findOne).toHaveBeenCalledWith({
      userId: new Types.ObjectId(userId),
      courseId: new Types.ObjectId(courseId),
      deletedAt: null,
    });
    expect(result).not.toBeNull();
    expect(result?.rating).toBe(5);
    expect(result?.comment).toBe('Khóa học tuyệt vời!');
    expect(result?.user?.fullName).toBe('Nguyễn Văn A');
  });

  it('2. should find course reviews with pagination and sort by newest', async () => {
    const mockDoc = {
      _id: new Types.ObjectId(),
      userId: {
        _id: new Types.ObjectId(userId),
        fullName: 'Trần Văn B',
        email: 'vanb@example.com',
      },
      courseId: new Types.ObjectId(courseId),
      rating: 4,
      comment: 'Rất bổ ích',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    };

    const countExec = vi.fn().mockResolvedValue(15);
    const countSession = vi.fn().mockReturnValue({ exec: countExec });
    const countDocuments = vi.fn().mockReturnValue({ session: countSession });

    const findExec = vi.fn().mockResolvedValue([mockDoc]);
    const findSession = vi.fn().mockReturnValue({ exec: findExec });
    const populate = vi.fn().mockReturnValue({ session: findSession });
    const limit = vi.fn().mockReturnValue({ populate });
    const skip = vi.fn().mockReturnValue({ limit });
    const sort = vi.fn().mockReturnValue({ skip });
    const find = vi.fn().mockReturnValue({ sort });

    const repository = new ReviewRepository({
      countDocuments,
      find,
    } as unknown as Model<ReviewDocument>);

    const result = await repository.findCourseReviews(courseId, 2, 5);

    expect(countDocuments).toHaveBeenCalledWith({
      courseId: new Types.ObjectId(courseId),
      deletedAt: null,
      status: ReviewStatusEnum.VISIBLE,
    });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(skip).toHaveBeenCalledWith(5);
    expect(limit).toHaveBeenCalledWith(5);
    expect(result.total).toBe(15);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(5);
    expect(result.totalPages).toBe(3);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].rating).toBe(4);
  });

  it('3. should calculate course review stats with correct average and distribution', async () => {
    const mockAggregationResult = [
      { _id: 5, count: 8 },
      { _id: 4, count: 2 },
    ];

    const exec = vi.fn().mockResolvedValue(mockAggregationResult);
    const aggregate = vi.fn().mockReturnValue({ exec });

    const repository = new ReviewRepository({ aggregate } as unknown as Model<ReviewDocument>);

    const stats = await repository.calculateCourseReviewStats(courseId);

    // 8*5 + 2*4 = 40 + 8 = 48 / 10 = 4.8
    expect(stats.totalReviews).toBe(10);
    expect(stats.averageRating).toBe(4.8);
    expect(stats.distribution).toEqual([
      { stars: 5, count: 8, percentage: 80 },
      { stars: 4, count: 2, percentage: 20 },
      { stars: 3, count: 0, percentage: 0 },
      { stars: 2, count: 0, percentage: 0 },
      { stars: 1, count: 0, percentage: 0 },
    ]);
  });

  it('4. should return 0 average and 0 total reviews when course has no reviews', async () => {
    const exec = vi.fn().mockResolvedValue([]);
    const aggregate = vi.fn().mockReturnValue({ exec });

    const repository = new ReviewRepository({ aggregate } as unknown as Model<ReviewDocument>);

    const stats = await repository.calculateCourseReviewStats(courseId);

    expect(stats.totalReviews).toBe(0);
    expect(stats.averageRating).toBe(0);
    expect(stats.distribution.every((d) => d.count === 0 && d.percentage === 0)).toBe(true);
  });

  it('returns paginated admin reviews with student and course information from aggregation', async () => {
    const reviewId = new Types.ObjectId();
    const aggregate = vi.fn().mockReturnValue({
      exec: vi.fn().mockResolvedValue([{
        metadata: [{ total: 13 }],
        data: [{
          _id: reviewId,
          userId: { _id: new Types.ObjectId(userId), fullName: 'Học viên', email: 'student@example.com' },
          courseId: { _id: new Types.ObjectId(courseId), title: 'Khóa học', slug: 'khoa-hoc' },
          rating: 4,
          comment: 'Nhận xét từ database',
          status: ReviewStatusEnum.VISIBLE,
          reportCount: 2,
        }],
      }]),
    });
    const repository = new ReviewRepository({ aggregate } as unknown as Model<ReviewDocument>);

    const result = await repository.findAdminReviews({ page: 2, limit: 10, isPagination: true });

    expect(result).toMatchObject({ total: 13, page: 2, limit: 10, totalPages: 2 });
    expect(result.items[0]).toMatchObject({
      id: reviewId.toString(),
      userId,
      courseId,
      user: { fullName: 'Học viên', email: 'student@example.com' },
      course: { title: 'Khóa học', slug: 'khoa-hoc' },
      rating: 4,
      comment: 'Nhận xét từ database',
      reportCount: 2,
    });
    const pipeline = aggregate.mock.calls[0][0] as PipelineStage[];
    expect(pipeline).toContainEqual({ $match: { $and: [{ deletedAt: null }] } });
    const facet = pipeline.find((stage): stage is PipelineStage.Facet => '$facet' in stage);
    expect(facet?.$facet.data).toEqual(expect.arrayContaining([{ $sort: { createdAt: -1 } }, { $skip: 10 }, { $limit: 10 }]));
  });

  it.each([
    [ReviewStatusEnum.VISIBLE, { status: ReviewStatusEnum.VISIBLE, deletedAt: null }],
    [ReviewStatusEnum.HIDDEN, { status: ReviewStatusEnum.HIDDEN, deletedAt: null }],
    ['reported', { reportCount: { $gt: 0 }, deletedAt: null }],
    [ReviewStatusEnum.DELETED, { $or: [{ status: ReviewStatusEnum.DELETED }, { deletedAt: { $ne: null } }] }],
  ])('applies the admin status filter %s in the database query', async (status, condition) => {
    const aggregate = vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue([]) });
    const repository = new ReviewRepository({ aggregate } as unknown as Model<ReviewDocument>);

    const result = await repository.findAdminReviews({ page: 1, limit: 10, isPagination: true, status });

    expect(aggregate.mock.calls[0][0]).toContainEqual({ $match: { $and: [condition] } });
    expect(result).toEqual({ items: [], total: 0, page: 1, limit: 10, totalPages: 1 });
  });

  it('treats regex metacharacters in a search as literal text', async () => {
    const aggregate = vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue([]) });
    const repository = new ReviewRepository({ aggregate } as unknown as Model<ReviewDocument>);

    await repository.findAdminReviews({ page: 1, limit: 10, isPagination: true, search: '[React] (A+B).*' });

    const regex = /\[React\] \(A\+B\)\.\*/i;
    expect(aggregate.mock.calls[0][0]).toContainEqual({ $match: { $and: [
      { deletedAt: null },
      { $or: [
        { comment: { $regex: regex } },
        { 'userDoc.fullName': { $regex: regex } },
        { 'userDoc.email': { $regex: regex } },
        { 'courseDoc.title': { $regex: regex } },
      ] },
    ] } });
  });

  it('calculates admin statistics from database results and rounds the visible rating average', async () => {
    const aggregate = vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue([{
      total: [{ count: 14 }],
      visible: [{ count: 11 }],
      hidden: [{ count: 2 }],
      reported: [{ count: 2 }],
      deleted: [{ count: 1 }],
      visibleStats: [{ avg: 4.2727272727 }],
    }]) });
    const repository = new ReviewRepository({ aggregate } as unknown as Model<ReviewDocument>);

    expect(await repository.getAdminStats()).toEqual({
      total: 14,
      visibleCount: 11,
      hiddenCount: 2,
      reportedCount: 2,
      deletedCount: 1,
      averageRating: 4.3,
    });
  });

  it('returns zero admin statistics when the database has no reviews', async () => {
    const aggregate = vi.fn().mockReturnValue({ exec: vi.fn().mockResolvedValue([]) });
    const repository = new ReviewRepository({ aggregate } as unknown as Model<ReviewDocument>);

    expect(await repository.getAdminStats()).toEqual({
      total: 0,
      visibleCount: 0,
      hiddenCount: 0,
      reportedCount: 0,
      deletedCount: 0,
      averageRating: 0,
    });
  });

  it('saves and maps a reply without changing student content, rating or edit timestamps', async () => {
    const reviewId = new Types.ObjectId();
    const instructorId = new Types.ObjectId();
    const repliedAt = new Date('2026-11-16T10:00:00Z');
    const reply = {
      content: 'Cảm ơn bạn đã chia sẻ',
      instructorId: instructorId.toString(),
      instructorName: 'Giảng viên',
      repliedAt,
      updatedAt: null,
    };
    const query = {
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue({
        _id: reviewId,
        userId: new Types.ObjectId(userId),
        courseId: new Types.ObjectId(courseId),
        rating: 4,
        comment: 'Nhận xét gốc',
        instructorReply: { ...reply, instructorId },
      }),
    };
    const findOneAndUpdate = vi.fn().mockReturnValue(query);
    const repository = new ReviewRepository({ findOneAndUpdate } as unknown as Model<ReviewDocument>);

    const result = await repository.setInstructorReply(reviewId.toString(), reply);

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { _id: reviewId, deletedAt: null, status: ReviewStatusEnum.VISIBLE },
      { $set: { instructorReply: { ...reply, instructorId } } },
      { returnDocument: 'after', runValidators: true, timestamps: false, session: null },
    );
    expect(result).toMatchObject({
      rating: 4,
      comment: 'Nhận xét gốc',
      instructorReply: reply,
    });
  });

  it('clears only an existing reply on a still-visible, non-deleted review', async () => {
    const reviewId = new Types.ObjectId();
    const query = {
      populate: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(null),
    };
    const findOneAndUpdate = vi.fn().mockReturnValue(query);
    const repository = new ReviewRepository({ findOneAndUpdate } as unknown as Model<ReviewDocument>);

    expect(await repository.clearInstructorReply(reviewId.toString())).toBeNull();
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: reviewId,
        deletedAt: null,
        status: ReviewStatusEnum.VISIBLE,
        instructorReply: { $ne: null },
      },
      { $set: { instructorReply: null } },
      { returnDocument: 'after', runValidators: true, timestamps: false, session: null },
    );
  });
});
