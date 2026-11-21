import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Model } from 'mongoose';
import { CourseStatusEnum } from 'share-lib';
import { CourseRepository } from '../repositories/course.repository.js';
import { type CourseEntity } from '../schemas/course.schema.js';

describe('Learner course detail query for admin preview', () => {
  const query = {
    populate: vi.fn().mockReturnThis(),
    session: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(null),
  };
  const model = { findOne: vi.fn().mockReturnValue(query) };
  const repository = new CourseRepository(model as unknown as Model<CourseEntity>);

  beforeEach(() => { vi.clearAllMocks(); });

  it.each(['khoa-hoc-nhap', '607f1f77bcf86cd799439011'])(
    'keeps the published-only default for ID or slug %s',
    async (idOrSlug) => {
      await repository.findPublicCourseDetail(idOrSlug);
      expect(model.findOne).toHaveBeenCalledWith(expect.objectContaining({
        status: CourseStatusEnum.PUBLISHED, deletedAt: null,
      }));
      expect(query.session).toHaveBeenCalledWith(null);
    },
  );

  it.each(['khoa-hoc-nhap', '607f1f77bcf86cd799439011'])(
    'removes only the publication filter for explicit admin preview of %s',
    async (idOrSlug) => {
      await repository.findPublicCourseDetail(idOrSlug, undefined, true);
      const filter = model.findOne.mock.calls[0][0] as Record<string, unknown>;
      expect(filter).not.toHaveProperty('status');
      expect(filter.deletedAt).toBeNull();
      if (/^[a-f0-9]{24}$/.test(idOrSlug)) {
        expect(filter.$or).toEqual([{ _id: idOrSlug }, { slug: idOrSlug }]);
      } else {
        expect(filter.slug).toBe(idOrSlug);
      }
    },
  );
});
