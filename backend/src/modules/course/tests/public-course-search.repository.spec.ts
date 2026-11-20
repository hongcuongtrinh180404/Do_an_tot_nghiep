import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type Model, type PipelineStage, Types } from 'mongoose';
import { CourseLevelEnum } from 'share-lib';
import type { CourseEntity } from '../schemas/course.schema.js';
import type { CourseCategoryEntity } from '../schemas/course-category.schema.js';
import {
  PublicCourseSearchRepository,
  PUBLIC_COURSE_SEARCH_TIMEOUT_MS,
} from '../repositories/public-course-search.repository.js';
import type { PublicCourseSearchFilters } from '../interfaces/public-course-search.interface.js';
import {
  courseTopicPattern,
  publicCourseDescriptionText,
} from '../utils/public-course-search.pipeline.js';

describe('PublicCourseSearchRepository', () => {
  let repository: PublicCourseSearchRepository;
  const aggregation = { option: vi.fn(), exec: vi.fn() };
  const courses = { aggregate: vi.fn() };
  const defaults: PublicCourseSearchFilters = {
    page: 1,
    limit: 5,
    maxPriceExclusive: false,
  };
  const pipeline = () =>
    courses.aggregate.mock.calls.at(-1)![0] as PipelineStage[];

  beforeEach(() => {
    courses.aggregate.mockReset().mockReturnValue(aggregation);
    aggregation.option.mockReset().mockReturnValue(aggregation);
    aggregation.exec
      .mockReset()
      .mockResolvedValue([{ metadata: [], items: [] }]);
    repository = new PublicCourseSearchRepository(
      courses as unknown as Model<CourseEntity>,
      {
        collection: { name: 'course_categories' },
      } as Model<CourseCategoryEntity>,
    );
  });

  it('hard-filters public courses before any lookup/scoring and uses one bounded read-only aggregate', async () => {
    await repository.search(defaults);
    expect(pipeline()[0]).toEqual({
      $match: { status: 'published', deletedAt: null, price: { $gte: 0 } },
    });
    expect(courses.aggregate).toHaveBeenCalledOnce();
    expect(aggregation.option).toHaveBeenCalledWith({
      maxTimeMS: PUBLIC_COURSE_SEARCH_TIMEOUT_MS,
      allowDiskUse: false,
    });
    expect(JSON.stringify(pipeline())).not.toMatch(
      /\$(?:out|merge|function|where)"/,
    );
    expect(pipeline()[1]).not.toHaveProperty('$project.description');
    expect(pipeline().at(-1)).toMatchObject({
      $facet: {
        metadata: [{ $count: 'total' }],
        items: [
          { $sort: { createdAt: -1, _id: -1 } },
          { $skip: 0 },
          { $limit: 5 },
          { $project: { title: 1, price: 1, level: 1, categoryName: 1 } },
        ],
      },
    });
  });

  it('looks up only active non-deleted category names', async () => {
    await repository.search({ ...defaults, keyword: 'React.js (C++)' });
    expect(pipeline()).toContainEqual({
      $lookup: {
        from: 'course_categories',
        localField: 'categoryId',
        foreignField: '_id',
        pipeline: [
          { $match: { isActive: true, deletedAt: null } },
          { $project: { _id: 0, name: 1 } },
        ],
        as: '_searchCategory',
      },
    });
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
      expect(pipeline()[0]).toHaveProperty('$match.price', expected);
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
    expect(pipeline()[0]).toEqual({
      $match: {
        status: 'published',
        deletedAt: null,
        level: 'beginner',
        price: { $gte: 0, $lte: 500000 },
      },
    });
    expect(pipeline()).toContainEqual({ $match: { _searchScore: { $gt: 0 } } });
    expect(pipeline().at(-1)).toMatchObject({
      $facet: {
        items: [
          { $sort: { _searchScore: -1, createdAt: -1, _id: -1 } },
          { $skip: 20 },
          { $limit: 10 },
          expect.any(Object),
        ],
      },
    });
  });

  it('scores title/tags/category/public description for the original topic OR alternatives', async () => {
    await repository.search({
      ...defaults,
      keyword: 'backend',
      relatedKeywords: ['NestJS', 'REST API'],
    });
    const text = JSON.stringify(pipeline());
    for (const field of [
      '$title',
      '$_searchTags',
      '$categoryName',
      '$_searchDescription',
    ]) {
      expect(text).toContain(field);
    }
    expect(text).toContain('backend');
    expect(text).toContain('NestJS|REST');
    expect(text).toContain('$regexFindAll');
  });

  it('constructs a narrow public result and server-owned link, stripping private fields', async () => {
    const id = new Types.ObjectId();
    aggregation.exec.mockResolvedValue([
      {
        metadata: [{ total: 1 }],
        items: [
          {
            _id: id,
            title: 'Python — Cơ bản',
            price: 200000,
            level: CourseLevelEnum.BEGINNER,
            categoryName: 'Lập trình',
            description: 'private-description',
            instructor: { email: 'private@example.com' },
            reviewedById: 'private-reviewer',
            url: 'https://malicious.example',
            _searchScore: 12345,
            tags: ['private-extra-tag'],
          },
        ],
      },
    ]);
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
    aggregation.exec.mockResolvedValue([
      {
        metadata: [{ total: 1 }],
        items: [
          {
            _id: new Types.ObjectId(),
            title: 'React',
            price: 0,
            level: CourseLevelEnum.ALL_LEVELS,
            categoryName: null,
          },
        ],
      },
    ]);
    expect(
      (await repository.search(defaults)).items[0].categoryName,
    ).toBeNull();
  });

  it('distinguishes no matches from an empty out-of-range page', async () => {
    expect(await repository.search(defaults)).toEqual({ items: [], total: 0 });
    aggregation.exec.mockResolvedValue([
      { items: [], metadata: [{ total: 11 }] },
    ]);
    expect(await repository.search({ ...defaults, page: 5 })).toEqual({
      items: [],
      total: 11,
    });
  });
});

describe('Public search literal text helpers', () => {
  it('escapes regex/operator syntax without matching arbitrary courses', () => {
    const pattern = new RegExp(
      courseTopicPattern(['React.js (C++)', '.*', '$title']),
      'iu',
    );
    expect(pattern.test('Học React.js (C++)')).toBe(true);
    expect(pattern.test('Học ReactXjs C')).toBe(false);
    expect(pattern.test('Anything')).toBe(false);
    expect(pattern.test('literal .* topic')).toBe(true);
    expect(pattern.test('literal $title topic')).toBe(true);
  });

  it('uses Unicode boundaries, avoiding accidental short-term/substring matches', () => {
    const pattern = new RegExp(
      courseTopicPattern(['API', 'Java', 'lập trình']),
      'iu',
    );
    expect(pattern.test('REST API với NestJS')).toBe(true);
    expect(pattern.test('capital markets')).toBe(false);
    expect(pattern.test('JavaScript')).toBe(false);
    expect(pattern.test('Học lập trình')).toBe(true);
    expect(pattern.test('áAPIá')).toBe(false);
    expect(
      new RegExp(courseTopicPattern(['REST API']), 'iu').test('REST \n API'),
    ).toBe(true);
  });

  it('extracts description text, not HTML attributes/comments/scripts/styles', () => {
    const html =
      '<!-- NestJS --><style>.backend{}</style><script>React()</script>' +
      '<p title="Django" class="frontend">HTML&nbsp;&amp; CSS</p><p>REST API</p>';
    const text = publicCourseDescriptionText(html);
    expect(text).toContain('HTML & CSS');
    expect(text).toContain('REST API');
    expect(text).not.toMatch(/NestJS|backend|React|Django|frontend/);
  });
});
