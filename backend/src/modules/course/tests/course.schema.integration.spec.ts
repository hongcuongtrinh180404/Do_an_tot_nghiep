import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose, { Model, Types } from 'mongoose';
import { CourseStatusEnum, CourseLevelEnum } from 'share-lib';
import { CourseEntity, CourseSchema } from '../schemas/course.schema.js';

describe('CourseSchema & MongoDB Indexes (Integration Test)', () => {
  let connection: mongoose.Connection;
  let CourseModel: Model<CourseEntity>;
  const TEST_DB_URI = 'mongodb://localhost:27017/thc_datn_course_test';

  beforeAll(async () => {
    connection = await mongoose.createConnection(TEST_DB_URI).asPromise();
    CourseModel = connection.model<CourseEntity>(CourseEntity.name, CourseSchema, 'test_courses');
    // Ensure all indexes (including partial unique indexes) are synchronized in MongoDB
    await CourseModel.syncIndexes();
  });

  afterAll(async () => {
    if (connection) {
      await connection.dropDatabase();
      await connection.close();
    }
  });

  beforeEach(async () => {
    await CourseModel.deleteMany({});
  });

  describe('Field Defaults & Schema Constraints', () => {
    it('should assign default status = "draft", level = "all_levels", price = 0, deletedAt = null', async () => {
      const instructorId = new Types.ObjectId();
      const course = await CourseModel.create({
        title: 'Lập trình NestJS Toàn Diện',
        slug: 'lap-trinh-nestjs-toan-dien',
        instructorId,
      });

      expect(course.title).toBe('Lập trình NestJS Toàn Diện');
      expect(course.slug).toBe('lap-trinh-nestjs-toan-dien');
      expect(course.status).toBe(CourseStatusEnum.DRAFT);
      expect(course.status).toBe('draft');
      expect(course.level).toBe(CourseLevelEnum.ALL_LEVELS);
      expect(course.level).toBe('all_levels');
      expect(course.price).toBe(0);
      expect(course.deletedAt).toBeNull();
      expect(course.createdAt).toBeInstanceOf(Date);
      expect(course.updatedAt).toBeInstanceOf(Date);
      expect(course.instructorId.toString()).toBe(instructorId.toString());
    });

    it('should reject document when required fields are missing', async () => {
      const instructorId = new Types.ObjectId();

      // Missing title
      await expect(
        CourseModel.create({
          slug: 'test-slug',
          instructorId,
        }),
      ).rejects.toThrow();

      // Missing slug
      await expect(
        CourseModel.create({
          title: 'Course Without Slug',
          instructorId,
        }),
      ).rejects.toThrow();

      // Missing instructorId
      await expect(
        CourseModel.create({
          title: 'Course Without Instructor',
          slug: 'course-without-instructor',
        }),
      ).rejects.toThrow();
    });

    it('should automatically lowercase and trim slug', async () => {
      const instructorId = new Types.ObjectId();
      const course = await CourseModel.create({
        title: 'Khóa Học Python',
        slug: '   KHOA-HOC-PYTHON   ',
        instructorId,
      });

      expect(course.slug).toBe('khoa-hoc-python');
    });

    it('should reject course when price is negative (price < 0)', async () => {
      const instructorId = new Types.ObjectId();

      await expect(
        CourseModel.create({
          title: 'Negative Price Course',
          slug: 'negative-price-course',
          instructorId,
          price: -50000,
        }),
      ).rejects.toThrow(/Course price cannot be negative/);
    });

    it('should accept course with valid price (price >= 0)', async () => {
      const instructorId = new Types.ObjectId();

      const freeCourse = await CourseModel.create({
        title: 'Free Course',
        slug: 'free-course',
        instructorId,
        price: 0,
      });
      expect(freeCourse.price).toBe(0);

      const paidCourse = await CourseModel.create({
        title: 'Paid Course',
        slug: 'paid-course',
        instructorId,
        price: 299000,
      });
      expect(paidCourse.price).toBe(299000);
    });
  });

  describe('Partial Unique Index: slug', () => {
    it('should reject duplicate slug among active courses with E11000', async () => {
      const instructorId = new Types.ObjectId();

      await CourseModel.create({
        title: 'Khóa Học Docker 1',
        slug: 'khoa-hoc-docker',
        instructorId,
      });

      await expect(
        CourseModel.create({
          title: 'Khóa Học Docker 2',
          slug: 'khoa-hoc-docker',
          instructorId,
        }),
      ).rejects.toThrow(/E11000 duplicate key error/);
    });

    it('should allow reusing slug if the previous course was soft-deleted', async () => {
      const instructorId = new Types.ObjectId();

      const course1 = await CourseModel.create({
        title: 'Khóa Học Kubernetes',
        slug: 'khoa-hoc-kubernetes',
        instructorId,
      });

      // Soft delete course1
      course1.deletedAt = new Date();
      await course1.save();

      // Now creating a new course with the same slug must succeed
      const course2 = await CourseModel.create({
        title: 'Khóa Học Kubernetes Tái Sinh',
        slug: 'khoa-hoc-kubernetes',
        instructorId,
      });

      expect(course2).toBeDefined();
      expect(course2.id).not.toBe(course1.id);
      expect(course2.slug).toBe('khoa-hoc-kubernetes');
      expect(course2.deletedAt).toBeNull();
    });
  });

  describe('Index Verification', () => {
    it('should have expected indexes registered', async () => {
      const indexes = await CourseModel.collection.indexes();
      const indexNames = indexes.map((idx) => idx.name);

      expect(indexNames).toContain('slug_1');
      expect(indexNames).toContain('instructorId_1_deletedAt_1_createdAt_-1');
      expect(indexNames).toContain('status_1_deletedAt_1_createdAt_-1');
    });
  });
});
