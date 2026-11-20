import { randomUUID } from 'node:crypto';
import mongoose, { Types, type Connection } from 'mongoose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CourseLevelEnum, CourseStatusEnum } from 'share-lib';
import { parseSearchCoursesArguments } from '../../chatbot/tools/search-courses.contract.js';
import { CourseEntity, CourseSchema } from '../schemas/course.schema.js';
import {
  CourseCategoryEntity,
  CourseCategorySchema,
} from '../schemas/course-category.schema.js';
import { PublicCourseSearchRepository } from '../repositories/public-course-search.repository.js';
import { PublicCourseSearchService } from '../services/public-course-search.service.js';

// Writes ONLY synthetic fixtures in this exact random test DB, never application data.
describe.skipIf(process.env.CHATBOT_SEARCH_DB_TESTS !== 'true')(
  'AI-expanded public course search — MongoDB integration',
  () => {
    const dbName = `chatbot_search_test_${randomUUID().replaceAll('-', '')}`;
    let connection: Connection | undefined;
    let service: PublicCourseSearchService;
    const backendTerms = ['Node.js', 'NestJS', 'Express', 'REST API'];
    const search = (filters: Record<string, unknown>) =>
      service.search(
        parseSearchCoursesArguments(JSON.stringify({ limit: 10, ...filters })),
      );
    const titles = (result: Awaited<ReturnType<typeof search>>) =>
      result.items.map((item) => item.title);

    beforeAll(async () => {
      connection = await mongoose
        .createConnection('mongodb://127.0.0.1:27017', {
          dbName,
          autoIndex: false,
          autoCreate: false,
          serverSelectionTimeoutMS: 3000,
        })
        .asPromise();
      const categories = connection.model(
        CourseCategoryEntity.name,
        CourseCategorySchema,
      );
      const courses = connection.model(CourseEntity.name, CourseSchema);
      const it = new Types.ObjectId();
      const node = new Types.ObjectId();
      const hidden = new Types.ObjectId();
      const deleted = new Types.ObjectId();
      await categories.insertMany([
        { _id: it, name: 'Công nghệ thông tin', slug: 'it', isActive: true },
        { _id: node, name: 'Node.js', slug: 'node', isActive: true },
        { _id: hidden, name: 'NestJS ẩn', slug: 'hidden', isActive: false },
        {
          _id: deleted,
          name: 'Node.js đã xóa',
          slug: 'deleted',
          isActive: true,
          deletedAt: new Date(),
        },
      ]);
      const fixtures = [
        { title: 'Backend thực hành', price: 15000 },
        {
          title: 'Lộ trình phần mềm',
          description: '<p>Backend căn bản</p>',
          price: 10000,
        },
        { title: 'Thiết kế API với NestJS', price: 4000 },
        { title: 'Dịch vụ HTTP', tags: ['NestJS'], price: 15000 },
        { title: 'Kết nối dữ liệu', categoryId: node, price: 12000 },
        {
          title: 'Dịch vụ ứng dụng',
          description: '<p>Xây dựng <b>REST</b>&nbsp;API</p>',
          price: 1000,
        },
        { title: 'NestJS miễn phí', price: 0 },
        { title: 'NestJS đúng 20k', price: 20000 },
        { title: 'NestJS đúng 200k', price: 200000 },
        { title: 'NestJS giá cao', price: 250000 },
        { title: 'React cho giao diện', price: 3000 },
        { title: 'HTML & CSS từ đầu', price: 2000 },
        { title: 'Python nhập môn', price: 0 },
        { title: 'Thiết kế Figma', price: 1000 },
        { title: 'Sử dụng máy tính', price: 1000 },
        {
          title: 'Chỉ có metadata',
          description:
            '<p class="NestJS" title="backend">Không có chủ đề đó</p>' +
            '<!-- Express --><script>Node.js</script><style>.backend{}</style><head>REST API</head>',
        },
        { title: 'Học mục bị ẩn', categoryId: hidden },
        { title: 'Học mục đã xóa', categoryId: deleted },
        { title: 'capital markets' },
        { title: 'C++ thực hành' },
        { title: 'Chuỗi .* nguyên bản' },
        ...[
          CourseStatusEnum.DRAFT,
          CourseStatusEnum.PENDING_APPROVAL,
          CourseStatusEnum.ARCHIVED,
        ].map((status) => ({ title: `NestJS ${status}`, status })),
        { title: 'NestJS đã xóa', deletedAt: new Date() },
        { title: 'NestJS nâng cao', level: CourseLevelEnum.ADVANCED },
      ];
      await courses.insertMany(
        fixtures.map((fixture, index) => ({
          instructorId: new Types.ObjectId(),
          categoryId: it,
          status: CourseStatusEnum.PUBLISHED,
          deletedAt: null,
          level: CourseLevelEnum.BEGINNER,
          price: 5000,
          description: 'PUBLIC_DESCRIPTION_NOT_FOR_RESPONSE',
          createdAt: new Date(Date.UTC(2026, 0, index + 1)),
          slug: `fixture-${index}`,
          ...fixture,
        })),
      );
      service = new PublicCourseSearchService(
        new PublicCourseSearchRepository(courses, categories),
      );
    });

    afterAll(async () => {
      if (!connection) return;
      try {
        if (
          connection.name === dbName &&
          /^chatbot_search_test_[a-f0-9]{32}$/.test(dbName)
        ) {
          await connection.dropDatabase();
        }
      } finally {
        await connection.close();
      }
    });

    it('finds programming below 20k through real related technologies, not the entire IT category', async () => {
      const result = await search({
        keyword: 'lập trình',
        relatedKeywords: ['Python', 'HTML', 'CSS', 'React', 'NestJS'],
        maxPrice: 20000,
        maxPriceExclusive: true,
      });
      expect(titles(result)).toEqual(
        expect.arrayContaining([
          'Python nhập môn',
          'HTML & CSS từ đầu',
          'React cho giao diện',
          'Thiết kế API với NestJS',
        ]),
      );
      expect(titles(result)).not.toContain('Thiết kế Figma');
      expect(titles(result)).not.toContain('Sử dụng máy tính');
      expect(result.items.every((item) => item.price < 20000)).toBe(true);
    });

    it('finds website technologies without admitting backend-only or unrelated courses', async () => {
      const result = await search({
        keyword: 'làm website',
        relatedKeywords: [
          'HTML',
          'CSS',
          'JavaScript',
          'React',
          'Next.js',
          'frontend',
        ],
        maxPrice: 200000,
        maxPriceExclusive: true,
      });
      expect(titles(result).sort()).toEqual(
        ['HTML & CSS từ đầu', 'React cho giao diện'].sort(),
      );
    });

    it('matches backend titles, tags, active categories and public description text', async () => {
      const result = await search({
        keyword: 'backend',
        relatedKeywords: backendTerms,
        maxPrice: 200000,
        maxPriceExclusive: true,
      });
      expect(titles(result)).toEqual(
        expect.arrayContaining([
          'Backend thực hành',
          'Thiết kế API với NestJS',
          'Dịch vụ HTTP',
          'Kết nối dữ liệu',
          'Dịch vụ ứng dụng',
        ]),
      );
      expect(titles(result)).not.toContain('React cho giao diện');
      expect(titles(result)).not.toContain('NestJS đúng 200k');
      expect(titles(result)).not.toContain('NestJS giá cao');
      expect(titles(result)).not.toContain('capital markets');
      expect(titles(result)).not.toContain('Chỉ có metadata');
      expect(titles(result)).not.toContain('Học mục bị ẩn');
      expect(titles(result)).not.toContain('Học mục đã xóa');
      expect(result.items.every((item) => item.price < 200000)).toBe(true);
    });

    it('ranks original topic above expansion, and title > tags > category > description', async () => {
      const result = await search({
        keyword: 'backend',
        relatedKeywords: backendTerms,
        maxPrice: 20000,
        maxPriceExclusive: true,
        isFree: false,
        level: 'beginner',
      });
      expect(titles(result)).toEqual([
        'Backend thực hành',
        'Lộ trình phần mềm',
        'Thiết kế API với NestJS',
        'Dịch vụ HTTP',
        'Kết nối dữ liệu',
        'Dịch vụ ứng dụng',
      ]);
    });

    it('keeps exact price boundaries, free/paid and level as AND conditions', async () => {
      const base = {
        keyword: 'backend',
        relatedKeywords: backendTerms,
        maxPrice: 20000,
        level: 'beginner',
      };
      const inclusive = await search(base);
      const exclusive = await search({ ...base, maxPriceExclusive: true });
      expect(titles(inclusive)).toContain('NestJS đúng 20k');
      expect(titles(exclusive)).not.toContain('NestJS đúng 20k');
      expect(titles(inclusive)).not.toContain('NestJS nâng cao');
      expect(titles(await search({ ...base, isFree: true }))).toEqual([
        'NestJS miễn phí',
      ]);
      expect(
        (await search({ ...base, isFree: false })).items.every(
          (item) => item.price > 0,
        ),
      ).toBe(true);
    });

    it('retains exact React queries and treats regex punctuation literally', async () => {
      expect(titles(await search({ keyword: 'React' }))).toEqual([
        'React cho giao diện',
      ]);
      expect(titles(await search({ keyword: 'C++' }))).toEqual([
        'C++ thực hành',
      ]);
      expect(titles(await search({ keyword: '.*' }))).toEqual([
        'Chuỗi .* nguyên bản',
      ]);
      expect((await search({ keyword: 'zz_unknown_topic' })).total).toBe(0);
    });

    it('counts and ranks the whole match set before paginating, with stable ties', async () => {
      const filters = { keyword: 'backend', relatedKeywords: backendTerms };
      const whole = await search(filters);
      const first = await search({ ...filters, limit: 2 });
      const second = await search({ ...filters, page: 2, limit: 2 });
      expect(first.total).toBe(whole.total);
      expect(first.hasMore).toBe(true);
      expect([...first.items, ...second.items]).toEqual(
        whole.items.slice(0, 4),
      );
      expect((await search({ ...filters, page: 100 })).items).toEqual([]);
      expect((await search({ ...filters, page: 100 })).total).toBe(whole.total);
    });

    it('does not serialize descriptions/tags/scores or private/non-public rows', async () => {
      const result = await search({
        keyword: 'backend',
        relatedKeywords: backendTerms,
      });
      for (const item of result.items) {
        expect(Object.keys(item).sort()).toEqual(
          ['id', 'title', 'price', 'level', 'categoryName', 'url'].sort(),
        );
        expect(item.url).toBe(`/courses/${item.id}`);
        expect(item.title).not.toMatch(
          /draft|pending_approval|archived|đã xóa/,
        );
      }
      expect(JSON.stringify(result)).not.toContain(
        'PUBLIC_DESCRIPTION_NOT_FOR_RESPONSE',
      );
      expect(JSON.stringify(result)).not.toContain('_searchScore');
    });
  },
);
