import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose, { Model, Types } from 'mongoose';
import { CourseMindmapEntity, CourseMindmapSchema } from '../schemas/course-mindmap.schema.js';

describe('CourseMindmapSchema & MongoDB Indexes (Integration / Unit Test)', () => {
  let connection: mongoose.Connection;
  let MindmapModel: Model<CourseMindmapEntity>;
  const TEST_DB_URI = 'mongodb://localhost:27017/thc_datn_mindmap_test';

  beforeAll(async () => {
    connection = await mongoose.createConnection(TEST_DB_URI).asPromise();
    MindmapModel = connection.model<CourseMindmapEntity>(
      CourseMindmapEntity.name,
      CourseMindmapSchema,
      'test_course_mindmaps',
    );
    await MindmapModel.syncIndexes();
  });

  afterAll(async () => {
    if (connection) {
      if (connection.name !== 'thc_datn') {
        await connection.dropDatabase();
      }
      await connection.close();
    }
  });

  beforeEach(async () => {
    await MindmapModel.deleteMany({});
  });

  describe('Schema Constraints & Field Defaults', () => {
    it('1. should create mindmap document with valid fields and BaseAbstractDocument defaults', async () => {
      const courseId = new Types.ObjectId();
      const mindmapData = {
        id: 'root',
        title: 'Khóa học Microservices',
        children: [],
      };

      const doc = await MindmapModel.create({
        courseId,
        mindmapData,
      });

      expect(doc._id).toBeInstanceOf(Types.ObjectId);
      expect(doc.courseId.toString()).toBe(courseId.toString());
      expect(doc.mindmapData).toEqual(mindmapData);
      expect(doc.deletedAt).toBeNull();
      expect(doc.createdById).toBeNull();
      expect(doc.updatedById).toBeNull();
      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.updatedAt).toBeInstanceOf(Date);
    });

    it('2. should fail validation if courseId is missing', async () => {
      await expect(
        MindmapModel.create({
          mindmapData: { test: true },
        }),
      ).rejects.toThrow();
    });

    it('3. should fail validation if mindmapData is missing', async () => {
      const courseId = new Types.ObjectId();
      await expect(
        MindmapModel.create({
          courseId,
        }),
      ).rejects.toThrow();
    });
  });

  describe('Index Constraints (Partial Unique on courseId)', () => {
    it('1. should prevent duplicate active mindmap documents for same courseId', async () => {
      const courseId = new Types.ObjectId();
      await MindmapModel.create({
        courseId,
        mindmapData: { version: 1 },
      });

      await expect(
        MindmapModel.create({
          courseId,
          mindmapData: { version: 2 },
        }),
      ).rejects.toThrow();
    });

    it('2. should allow creating mindmap with same courseId if previous document was soft deleted', async () => {
      const courseId = new Types.ObjectId();
      await MindmapModel.create({
        courseId,
        mindmapData: { version: 1 },
        deletedAt: new Date(),
      });

      const activeDoc = await MindmapModel.create({
        courseId,
        mindmapData: { version: 2 },
      });

      expect(activeDoc._id).toBeDefined();
      expect(activeDoc.deletedAt).toBeNull();
    });
  });
});
