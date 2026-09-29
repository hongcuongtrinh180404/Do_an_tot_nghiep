import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose, { Model, Types } from 'mongoose';
import { LessonEntity, LessonSchema } from '../schemas/lesson.schema.js';

describe('LessonSchema & MongoDB Indexes (Integration / Unit Test)', () => {
  let connection: mongoose.Connection;
  let LessonModel: Model<LessonEntity>;
  const TEST_DB_URI = 'mongodb://localhost:27017/thc_datn_lesson_test';

  beforeAll(async () => {
    connection = await mongoose.createConnection(TEST_DB_URI).asPromise();
    LessonModel = connection.model<LessonEntity>(LessonEntity.name, LessonSchema, 'test_lessons');
    await LessonModel.syncIndexes();
  });

  afterAll(async () => {
    if (connection) {
      await connection.dropDatabase();
      await connection.close();
    }
  });

  beforeEach(async () => {
    await LessonModel.deleteMany({});
  });

  describe('Schema Constraints & Field Defaults', () => {
    it('should create lesson with valid fields and inherit BaseAbstractDocument properties', async () => {
      const sectionId = new Types.ObjectId();
      const lesson = await LessonModel.create({
        sectionId,
        title: '  Bài 1: Giới thiệu khóa học  ',
        description: '  Mô tả chi tiết bài 1  ',
        order: 0,
      });

      expect(lesson._id).toBeInstanceOf(Types.ObjectId);
      expect(lesson.sectionId.toString()).toBe(sectionId.toString());
      expect(lesson.title).toBe('Bài 1: Giới thiệu khóa học');
      expect(lesson.description).toBe('Mô tả chi tiết bài 1');
      expect(lesson.order).toBe(0);
      expect(lesson.deletedAt).toBeNull();
      expect(lesson.createdById).toBeNull();
      expect(lesson.updatedById).toBeNull();
      expect(lesson.createdAt).toBeInstanceOf(Date);
      expect(lesson.updatedAt).toBeInstanceOf(Date);
    });

    it('should assign default null to description if omitted', async () => {
      const sectionId = new Types.ObjectId();
      const lesson = await LessonModel.create({
        sectionId,
        title: 'Bài 2: Cài đặt công cụ',
        order: 1,
      });

      expect(lesson.description).toBeNull();
    });

    it('should reject when required fields (title, sectionId, order) are missing', async () => {
      const sectionId = new Types.ObjectId();

      // Missing sectionId
      await expect(
        LessonModel.create({
          title: 'Bài 1',
          order: 0,
        }),
      ).rejects.toThrow();

      // Missing title
      await expect(
        LessonModel.create({
          sectionId,
          order: 0,
        }),
      ).rejects.toThrow();

      // Missing order
      await expect(
        LessonModel.create({
          sectionId,
          title: 'Bài 1',
        }),
      ).rejects.toThrow();
    });

    it('should reject when order is negative', async () => {
      const sectionId = new Types.ObjectId();
      await expect(
        LessonModel.create({
          sectionId,
          title: 'Bài học không hợp lệ',
          order: -1,
        }),
      ).rejects.toThrow(/Lesson order cannot be negative/);
    });
  });

  describe('Index Verification', () => {
    it('should verify sectionId field has index defined on schema', () => {
      const pathType = LessonSchema.path('sectionId');
      expect((pathType as unknown as { _index: boolean })._index).toBeTruthy();
    });

    it('should have compound index { sectionId: 1, deletedAt: 1, order: 1 } configured on schema', () => {
      const indexes = LessonSchema.indexes();
      const compoundIndex = indexes.find(([fields]) => {
        return fields.sectionId === 1 && fields.deletedAt === 1 && fields.order === 1;
      });

      expect(compoundIndex).toBeDefined();
    });

    it('should verify synced indexes on MongoDB collection include sectionId and compound index', async () => {
      const collectionIndexes = await LessonModel.collection.indexes();

      const hasSectionIdIndex = collectionIndexes.some((idx) => {
        return idx.key && idx.key.sectionId === 1 && !idx.key.order && !idx.key.deletedAt;
      });
      const hasCompoundIndex = collectionIndexes.some((idx) => {
        return (
          idx.key &&
          idx.key.sectionId === 1 &&
          idx.key.deletedAt === 1 &&
          idx.key.order === 1
        );
      });

      expect(hasSectionIdIndex).toBe(true);
      expect(hasCompoundIndex).toBe(true);
    });
  });
});
