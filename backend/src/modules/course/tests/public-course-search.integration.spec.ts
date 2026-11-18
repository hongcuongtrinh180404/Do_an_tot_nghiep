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

// Opt-in, synthetic fixtures in a unique loopback-only DB, never the application DB.
describe.skipIf(process.env.CHATBOT_SEARCH_DB_TESTS !== 'true')(
  'Public course search — MongoDB integration',
  () => {
    const dbName = `chatbot_search_test_${randomUUID().replaceAll('-', '')}`;
    let connection: Connection | undefined;
    let service: PublicCourseSearchService;

    async function search(filters: Record<string, unknown>) {
      return service.search(
        parseSearchCoursesArguments(JSON.stringify(filters)),
      );
    }

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
      const programming = new Types.ObjectId();
      const design = new Types.ObjectId();
      const inactive = new Types.ObjectId();
      const deleted = new Types.ObjectId();
      await categories.insertMany([
        {
          _id: programming,
          name: 'Lập trình',
          slug: 'lap-trinh',
          isActive: true,
        },
        { _id: design, name: 'Thiết kế', slug: 'thiet-ke', isActive: true },
        {
          _id: inactive,
          name: 'Thiết kế ẩn',
          slug: 'thiet-ke-an',
          isActive: false,
        },
        {
          _id: deleted,
          name: 'Thiết kế đã xóa',
          slug: 'thiet-ke-da-xoa',
          isActive: true,
          deletedAt: new Date(),
        },
      ]);
      const instructorId = new Types.ObjectId();
      const base = {
        instructorId,
        level: CourseLevelEnum.BEGINNER,
        status: CourseStatusEnum.PUBLISHED,
        deletedAt: null,
        categoryId: programming,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        description: 'PRIVATE_CONTENT_NOT_FOR_TOOL',
        reviewedById: new Types.ObjectId(),
      };
      const fixtures = [
        ...[0, 200000, 499999, 500000, 500001].map((price) => ({
          title: `React ${price}`,
          price,
          slug: `react-${price}`,
          originalPrice: price === 499999 ? 900000 : null,
        })),
        { title: 'Python cơ bản', slug: 'python-beginner', price: 100000 },
        {
          title: 'Python nâng cao',
          slug: 'python-advanced',
          price: 0,
          level: CourseLevelEnum.ADVANCED,
        },
        {
          title: 'Figma cơ bản',
          slug: 'figma',
          price: 300000,
          categoryId: design,
        },
        {
          title: 'Photoshop',
          slug: 'photoshop',
          price: 600000,
          categoryId: design,
        },
        { title: 'Học màu', slug: 'mau', price: 100000, categoryId: inactive },
        { title: 'Vector', slug: 'vector', price: 100000, categoryId: deleted },
        ...[
          CourseStatusEnum.DRAFT,
          CourseStatusEnum.PENDING_APPROVAL,
          CourseStatusEnum.ARCHIVED,
        ].map((status) => ({
          title: `React private ${status}`,
          slug: `react-${status}`,
          price: 123456,
          status,
        })),
        {
          title: 'React deleted',
          slug: 'react-deleted',
          price: 123456,
          deletedAt: new Date(),
        },
      ];
      await courses.insertMany(
        fixtures.map((fixture) => ({ ...base, ...fixture })),
      );
      service = new PublicCourseSearchService(
        new PublicCourseSearchRepository(courses, categories),
      );
    });

    afterAll(async () => {
      if (!connection) return;
      try {
        // Only remove the exact random DB this test created.
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

    it('finds React case-insensitively and never exposes drafts, pending, archived or deleted courses', async () => {
      const result = await search({ keyword: 'rEaCt', limit: 10 });
      expect(result.total).toBe(5);
      expect(result.items.map((item) => item.title).sort()).toEqual(
        [0, 200000, 499999, 500000, 500001]
          .map((price) => `React ${price}`)
          .sort(),
      );
    });

    it('applies the strict "dưới 500k" boundary, using sale price rather than original price', async () => {
      const result = await search({
        keyword: 'React',
        maxPrice: 500000,
        maxPriceExclusive: true,
        limit: 10,
      });
      expect(
        result.items.map((item) => item.price).sort((a, b) => a - b),
      ).toEqual([0, 200000, 499999]);
    });

    it('includes both endpoints for "từ 200k đến 500k"', async () => {
      const result = await search({
        keyword: 'React',
        minPrice: 200000,
        maxPrice: 500000,
        limit: 10,
      });
      expect(
        result.items.map((item) => item.price).sort((a, b) => a - b),
      ).toEqual([200000, 499999, 500000]);
    });

    it('finds Python for beginners using an exact level filter', async () => {
      const result = await search({ keyword: 'Python', level: 'beginner' });
      expect(result.items.map((item) => item.title)).toEqual(['Python cơ bản']);
    });

    it('finds free courses only when isFree=true', async () => {
      const result = await search({ isFree: true });
      expect(result.total).toBe(2);
      expect(result.items.every((item) => item.price === 0)).toBe(true);
    });

    it('supports category keywords and excludes hidden/deleted category matches', async () => {
      const result = await search({
        keyword: 'thiết kế',
        minPrice: 200000,
        maxPrice: 500000,
      });
      expect(result.items.map((item) => item.title)).toEqual(['Figma cơ bản']);
      expect(result.items[0].categoryName).toBe('Thiết kế');
      const allDesign = await search({ keyword: 'thiết kế' });
      expect(allDesign.total).toBe(2);
    });

    it('supports paid-only combined with other constraints', async () => {
      const result = await search({
        keyword: 'React',
        isFree: false,
        maxPrice: 500000,
      });
      expect(result.total).toBe(3);
      expect(
        result.items.every((item) => item.price > 0 && item.price <= 500000),
      ).toBe(true);
    });

    it('treats regex syntax literally and returns no unrelated matches', async () => {
      expect((await search({ keyword: '.*' })).total).toBe(0);
      expect(
        (await search({ keyword: 'nonexistent-course-topic' })).items,
      ).toEqual([]);
    });

    it('keeps a deterministic order, correct total and pagination without duplicate results', async () => {
      const first = await search({ keyword: 'React', page: 1, limit: 2 });
      const second = await search({ keyword: 'React', page: 2, limit: 2 });
      const third = await search({ keyword: 'React', page: 3, limit: 2 });
      const allIds = [...first.items, ...second.items, ...third.items].map(
        (item) => item.id,
      );
      expect(first.total).toBe(5);
      expect(first.hasMore).toBe(true);
      expect(third.hasMore).toBe(false);
      expect(new Set(allIds).size).toBe(5);
      expect(
        (await search({ keyword: 'React', limit: 10 })).items.map(
          (item) => item.id,
        ),
      ).toEqual(allIds);
    });

    it('returns only public summary fields and valid server-generated links', async () => {
      const result = await search({});
      for (const item of result.items) {
        expect(Object.keys(item).sort()).toEqual(
          ['id', 'title', 'price', 'level', 'categoryName', 'url'].sort(),
        );
        expect(item.url).toBe(`/courses/${item.id}`);
      }
      expect(JSON.stringify(result)).not.toContain(
        'PRIVATE_CONTENT_NOT_FOR_TOOL',
      );
    });
  },
);
