import { describe, expect, it, vi } from 'vitest';
import { Model, Types } from 'mongoose';
import { ReviewRepository } from '../repositories/review.repository.js';
import { ReviewEntity, ReviewDocument } from '../schemas/review.schema.js';

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
});

