import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose, { Model, Types } from 'mongoose';
import { SectionEntity, SectionSchema } from '../schemas/section.schema.js';

describe('SectionSchema & MongoDB Indexes (Integration / Unit Test)', () => {
  let connection: mongoose.Connection;
  let SectionModel: Model<SectionEntity>;
  const TEST_DB_URI = 'mongodb://localhost:27017/thc_datn_section_test';

  beforeAll(async () => {
    connection = await mongoose.createConnection(TEST_DB_URI).asPromise();
    SectionModel = connection.model<SectionEntity>(SectionEntity.name, SectionSchema, 'test_sections');
    await SectionModel.syncIndexes();
  });

  afterAll(async () => {
    if (connection) {
      await connection.dropDatabase();
      await connection.close();
    }
  });

  beforeEach(async () => {
    await SectionModel.deleteMany({});
  });

  describe('Schema Constraints & Field Defaults', () => {
    it('should create section with valid fields and inherit BaseAbstractDocument properties', async () => {
      const courseId = new Types.ObjectId();
      const section = await SectionModel.create({
        courseId,
        title: '  Chương 1: Tổng quan khóa học  ',
        description: '  Mô tả chi tiết chương 1  ',
        order: 0,
      });

      expect(section._id).toBeInstanceOf(Types.ObjectId);
      expect(section.courseId.toString()).toBe(courseId.toString());
      expect(section.title).toBe('Chương 1: Tổng quan khóa học');
      expect(section.description).toBe('Mô tả chi tiết chương 1');
      expect(section.order).toBe(0);
      expect(section.deletedAt).toBeNull();
      expect(section.createdById).toBeNull();
      expect(section.updatedById).toBeNull();
      expect(section.createdAt).toBeInstanceOf(Date);
      expect(section.updatedAt).toBeInstanceOf(Date);
    });

    it('should assign default null to description if omitted', async () => {
      const courseId = new Types.ObjectId();
      const section = await SectionModel.create({
        courseId,
        title: 'Chương 2: Thiết lập môi trường',
        order: 1,
      });

      expect(section.description).toBeNull();
    });

    it('should reject when required fields (title, courseId, order) are missing', async () => {
      const courseId = new Types.ObjectId();

      // Missing courseId
      await expect(
        SectionModel.create({
          title: 'Chương 1',
          order: 0,
        }),
      ).rejects.toThrow();

      // Missing title
      await expect(
        SectionModel.create({
          courseId,
          order: 0,
        }),
      ).rejects.toThrow();

      // Missing order
      await expect(
        SectionModel.create({
          courseId,
          title: 'Chương 1',
        }),
      ).rejects.toThrow();
    });

    it('should reject when order is negative', async () => {
      const courseId = new Types.ObjectId();
      await expect(
        SectionModel.create({
          courseId,
          title: 'Chương không hợp lệ',
          order: -1,
        }),
      ).rejects.toThrow(/Section order cannot be negative/);
    });
  });

  describe('Compound Index Verification', () => {
    it('should have compound index { courseId: 1, deletedAt: 1, order: 1 } configured on schema', () => {
      const indexes = SectionSchema.indexes();
      const compoundIndex = indexes.find(([fields]) => {
        return fields.courseId === 1 && fields.deletedAt === 1 && fields.order === 1;
      });

      expect(compoundIndex).toBeDefined();
    });
  });
});
