import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Model, Types } from 'mongoose';
import { CourseLevelEnum } from 'share-lib';
import type { CourseEntity } from '../schemas/course.schema.js';
import type { CourseCategoryEntity } from '../schemas/course-category.schema.js';
import {
  PublicCourseSearchRepository,
  PUBLIC_COURSE_SEARCH_TIMEOUT_MS,
} from '../repositories/public-course-search.repository.js';
import type { PublicCourseSearchFilters } from '../interfaces/public-course-search.interface.js';

function queryChain(value: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    populate: vi.fn().mockReturnThis(),
    maxTimeMS: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue(value),
  };
}

describe('PublicCourseSearchRepository', () => {
  let repository: PublicCourseSearchRepository;
  let list: ReturnType<typeof queryChain>;
  let count: ReturnType<typeof queryChain>;
  let categoryList: ReturnType<typeof queryChain>;
  let courses: {
    find: ReturnType<typeof vi.fn>;
    countDocuments: ReturnType<typeof vi.fn>;
  };
  let categories: { find: ReturnType<typeof vi.fn> };
  const defaults: PublicCourseSearchFilters = {
    page: 1,
    limit: 5,
    maxPriceExclusive: false,
  };

  beforeEach(() => {
    list = queryChain([]);
    count = queryChain(0);
    categoryList = queryChain([]);
    courses = {
      find: vi.fn().mockReturnValue(list),
      countDocuments: vi.fn().mockReturnValue(count),
    };
    categories = { find: vi.fn().mockReturnValue(categoryList) };
    repository = new PublicCourseSearchRepository(
      courses as unknown as Model<CourseEntity>,
      categories as unknown as Model<CourseCategoryEntity>,
    );
  });

  it('always requires published and non-deleted courses for both rows and total', async () => {
    await repository.search(defaults);
    const query = { status: 'published', deletedAt: null, price: { $gte: 0 } };
    expect(courses.find).toHaveBeenCalledWith(query);
    expect(courses.countDocuments).toHaveBeenCalledWith(query);
    expect(categories.find).not.toHaveBeenCalled();
    expect(list.select).toHaveBeenCalledWith(
      '_id title price level categoryId',
    );
    expect(list.sort).toHaveBeenCalledWith({ createdAt: -1, _id: -1 });
    expect(list.skip).toHaveBeenCalledWith(0);
    expect(list.limit).toHaveBeenCalledWith(5);
    expect(list.maxTimeMS).toHaveBeenCalledWith(
      PUBLIC_COURSE_SEARCH_TIMEOUT_MS,
    );
    expect(count.maxTimeMS).toHaveBeenCalledWith(
      PUBLIC_COURSE_SEARCH_TIMEOUT_MS,
    );
  });

  it('matches escaped literal keyword in title OR active category name', async () => {
    const categoryId = new Types.ObjectId();
    categoryList.exec.mockResolvedValue([{ _id: categoryId }]);
    await repository.search({ ...defaults, keyword: 'React.js (C++)' });
    const regex = { $regex: 'React\\.js \\(C\\+\\+\\)', $options: 'i' };
    expect(categories.find).toHaveBeenCalledWith({
      name: regex,
      isActive: true,
      deletedAt: null,
    });
    expect(categoryList.select).toHaveBeenCalledWith('_id');
    expect(courses.find).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: [{ title: regex }, { categoryId: { $in: [categoryId] } }],
        status: 'published',
        deletedAt: null,
      }),
    );
    expect(list.populate).toHaveBeenCalledWith(
      expect.objectContaining({
        path: 'categoryId',
        select: 'name',
        match: { isActive: true, deletedAt: null },
      }),
    );
  });

  it.each([
    [
      { minPrice: 200000, maxPrice: 500000 },
      { $gte: 200000, $lte: 500000 },
    ],
    [
      { maxPrice: 500000, maxPriceExclusive: true },
      { $gte: 0, $lt: 500000 },
    ],
    [{ isFree: true }, 0],
    [{ isFree: false }, { $gte: 0, $gt: 0 }],
    [
      { isFree: false, minPrice: 200000, maxPrice: 500000 },
      { $gte: 200000, $gt: 0, $lte: 500000 },
    ],
  ])(
    'applies the precise current-price predicates (%j)',
    async (filters, expected) => {
      await repository.search({ ...defaults, ...filters });
      expect(courses.find).toHaveBeenCalledWith(
        expect.objectContaining({ price: expected }),
      );
    },
  );

  it('combines keyword, price and exact level before applying pagination', async () => {
    await repository.search({
      ...defaults,
      keyword: 'Python',
      level: CourseLevelEnum.BEGINNER,
      maxPrice: 500000,
      page: 3,
      limit: 10,
    });
    expect(courses.find).toHaveBeenCalledWith({
      status: 'published',
      deletedAt: null,
      $or: [
        { title: { $regex: 'Python', $options: 'i' } },
        { categoryId: { $in: [] } },
      ],
      level: 'beginner',
      price: { $gte: 0, $lte: 500000 },
    });
    expect(list.skip).toHaveBeenCalledWith(20);
    expect(list.limit).toHaveBeenCalledWith(10);
  });

  it('constructs a narrow public result and server-owned link, stripping private fields', async () => {
    const id = new Types.ObjectId();
    list.exec.mockResolvedValue([
      {
        _id: id,
        title: 'Python — Cơ bản',
        price: 200000,
        level: CourseLevelEnum.BEGINNER,
        categoryId: { name: 'Lập trình', secret: 'category-secret' },
        description: 'private-description',
        instructor: { email: 'private@example.com' },
        reviewedById: 'private-reviewer',
        url: 'https://malicious.example',
      },
    ]);
    count.exec.mockResolvedValue(1);
    expect(await repository.search(defaults)).toEqual({
      total: 1,
      items: [
        {
          id: id.toString(),
          title: 'Python — Cơ bản',
          price: 200000,
          level: 'beginner',
          categoryName: 'Lập trình',
          url: `/courses/${id.toString()}`,
        },
      ],
    });
  });

  it('represents a hidden/missing category as null without excluding public title matches', async () => {
    list.exec.mockResolvedValue([
      {
        _id: new Types.ObjectId(),
        title: 'React',
        price: 0,
        level: CourseLevelEnum.ALL_LEVELS,
        categoryId: null,
      },
    ]);
    expect(
      (await repository.search(defaults)).items[0].categoryName,
    ).toBeNull();
  });
});
