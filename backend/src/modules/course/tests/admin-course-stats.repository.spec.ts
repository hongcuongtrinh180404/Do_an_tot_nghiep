import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientSession, Model } from 'mongoose';
import { CourseStatusEnum } from 'share-lib';
import { CourseRepository } from '../repositories/course.repository.js';
import type { CourseEntity } from '../schemas/course.schema.js';

describe('Admin course statistics repository', () => {
  const aggregateQuery = {
    session: vi.fn().mockReturnThis(),
    exec: vi.fn(),
  };
  const model = { aggregate: vi.fn(() => aggregateQuery) };
  const repository = new CourseRepository(model as unknown as Model<CourseEntity>);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('counts all four statuses with one unpaginated aggregation excluding soft-deleted courses', async () => {
    aggregateQuery.exec.mockResolvedValue([
      { _id: CourseStatusEnum.DRAFT, count: 3 },
      { _id: CourseStatusEnum.ARCHIVED, count: 2 },
      { _id: CourseStatusEnum.PUBLISHED, count: 15 },
      { _id: CourseStatusEnum.PENDING_APPROVAL, count: 4 },
    ]);

    const stats = await repository.getAdminCourseStats();

    expect(model.aggregate).toHaveBeenCalledExactlyOnceWith([
      { $match: { deletedAt: null } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    expect(aggregateQuery.session).toHaveBeenCalledWith(null);
    expect(stats).toEqual({ total: 24, published: 15, draft: 3, archived: 2, pendingApproval: 4 });
    expect(stats.total).toBe(stats.published + stats.draft + stats.archived + stats.pendingApproval);
  });

  it('returns real zeros for an empty database', async () => {
    aggregateQuery.exec.mockResolvedValue([]);
    expect(await repository.getAdminCourseStats()).toEqual({
      total: 0, published: 0, draft: 0, archived: 0, pendingApproval: 0,
    });
  });

  it('fills missing status groups with zero and forwards an optional session', async () => {
    const session = {} as ClientSession;
    aggregateQuery.exec.mockResolvedValue([{ _id: CourseStatusEnum.PUBLISHED, count: 12 }]);

    expect(await repository.getAdminCourseStats(session)).toEqual({
      total: 12, published: 12, draft: 0, archived: 0, pendingApproval: 0,
    });
    expect(aggregateQuery.session).toHaveBeenCalledWith(session);
  });

  it('propagates database errors instead of inventing zero counts', async () => {
    aggregateQuery.exec.mockRejectedValue(new Error('Database unavailable'));
    await expect(repository.getAdminCourseStats()).rejects.toThrow('Database unavailable');
  });
});
