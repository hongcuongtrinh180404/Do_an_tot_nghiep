import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Model, Types, ClientSession } from 'mongoose';
import { SectionRepository } from '../repositories/section.repository.js';
import { SectionEntity } from '../schemas/section.schema.js';

interface MockDoc {
  _id: Types.ObjectId;
  courseId: Types.ObjectId | string;
  title: string;
  description: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  createdById: string | null;
  updatedById: string | null;
  toObject?: () => Record<string, unknown>;
  save?: (opts?: { session?: ClientSession }) => Promise<unknown>;
}

describe('SectionRepository', () => {
  let repository: SectionRepository;
  let mockModelConstructor: any;

  beforeEach(() => {
    mockModelConstructor = vi.fn();
    mockModelConstructor.findOne = vi.fn();
    mockModelConstructor.find = vi.fn();
    mockModelConstructor.countDocuments = vi.fn();
    mockModelConstructor.findOneAndUpdate = vi.fn();
    mockModelConstructor.updateOne = vi.fn();
    mockModelConstructor.bulkWrite = vi.fn();

    repository = new SectionRepository(mockModelConstructor as unknown as Model<SectionEntity>);
  });

  describe('Mapper (toDomain)', () => {
    it('1. should correctly map Mongo _id (ObjectId) to id (string) and courseId (ObjectId) to courseId (string)', () => {
      const mockMongoId = new Types.ObjectId('507f1f77bcf86cd799439011');
      const mockCourseObjectId = new Types.ObjectId('607f1f77bcf86cd799439022');
      const now = new Date();

      const doc: MockDoc = {
        _id: mockMongoId,
        courseId: mockCourseObjectId,
        title: 'Chương 1: Mở đầu',
        description: 'Mô tả chi tiết',
        order: 0,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdById: 'user_creator_1',
        updatedById: 'user_updater_1',
        toObject() {
          return {
            _id: this._id,
            courseId: this.courseId,
            title: this.title,
            description: this.description,
            order: this.order,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            deletedAt: this.deletedAt,
            createdById: this.createdById,
            updatedById: this.updatedById,
          };
        },
      };

      // Access protected toDomain for explicit mapper verification
      const domain = (repository as any).toDomain(doc);

      expect(domain.id).toBe(mockMongoId.toString());
      expect(typeof domain.id).toBe('string');
      expect(domain.courseId).toBe(mockCourseObjectId.toString());
      expect(typeof domain.courseId).toBe('string');
      expect(domain.title).toBe('Chương 1: Mở đầu');
      expect(domain.description).toBe('Mô tả chi tiết');
      expect(domain.order).toBe(0);
      expect(domain.createdAt).toBe(now);
      expect(domain.updatedAt).toBe(now);
      expect(domain.deletedAt).toBeNull();
      expect(domain.createdById).toBe('user_creator_1');
      expect(domain.updatedById).toBe('user_updater_1');
    });

    it('2. should handle plain object without toObject method', () => {
      const mockMongoId = new Types.ObjectId('507f1f77bcf86cd799439033');
      const mockCourseObjectId = new Types.ObjectId('607f1f77bcf86cd799439044');

      const plainDoc = {
        _id: mockMongoId,
        courseId: mockCourseObjectId,
        title: 'Chương 2: Cài đặt môi trường',
        description: null,
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        createdById: 'instructor_1',
        updatedById: 'instructor_1',
      };

      const domain = (repository as any).toDomain(plainDoc);

      expect(domain.id).toBe(mockMongoId.toString());
      expect(domain.courseId).toBe(mockCourseObjectId.toString());
      expect(domain.title).toBe('Chương 2: Cài đặt môi trường');
      expect(domain.description).toBeNull();
      expect(domain.order).toBe(1);
    });

    it('3. should handle string courseId and string _id gracefully', () => {
      const doc = {
        _id: 'string_id_123',
        courseId: 'string_course_456',
        title: 'Chương 3',
        order: 2,
      };

      const domain = (repository as any).toDomain(doc);

      expect(domain.id).toBe('string_id_123');
      expect(domain.courseId).toBe('string_course_456');
    });
  });

  describe('create', () => {
    it('should instantiate model, save with session, and return mapped ISection', async () => {
      const mockMongoId = new Types.ObjectId('507f1f77bcf86cd799439099');
      const mockCourseObjectId = new Types.ObjectId('607f1f77bcf86cd799439088');
      const mockSession = {} as ClientSession;
      const saveFn = vi.fn().mockResolvedValue(true);

      const mockInstance = {
        _id: mockMongoId,
        courseId: mockCourseObjectId,
        title: 'Chương 1',
        description: 'Mô tả',
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        createdById: 'user_1',
        updatedById: 'user_1',
        save: saveFn,
        toObject() {
          return {
            _id: this._id,
            courseId: this.courseId,
            title: this.title,
            description: this.description,
            order: this.order,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            deletedAt: this.deletedAt,
            createdById: this.createdById,
            updatedById: this.updatedById,
          };
        },
      };

      mockModelConstructor.mockImplementation(function (payload: Record<string, unknown>) {
        return {
          ...mockInstance,
          ...payload,
        };
      });

      const payload = {
        courseId: mockCourseObjectId.toString(),
        title: 'Chương 1',
        description: 'Mô tả',
        order: 0,
        createdById: 'user_1',
        updatedById: 'user_1',
      };

      const created = await repository.create(payload, mockSession);

      expect(mockModelConstructor).toHaveBeenCalledWith(payload);
      expect(saveFn).toHaveBeenCalledWith({ session: mockSession });
      expect(created.id).toBe(mockMongoId.toString());
      expect(created.courseId).toBe(mockCourseObjectId.toString());
      expect(created.title).toBe('Chương 1');
      expect(created.createdById).toBe('user_1');
      expect(created.updatedById).toBe('user_1');
    });
  });

  describe('findByCourseId', () => {
    let execMock: ReturnType<typeof vi.fn>;
    let sessionMock: ReturnType<typeof vi.fn>;
    let sortMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      execMock = vi.fn();
      sessionMock = vi.fn().mockReturnValue({ exec: execMock });
      sortMock = vi.fn().mockReturnValue({ session: sessionMock });
      mockModelConstructor.find = vi.fn().mockReturnValue({ sort: sortMock });
    });

    it('1. should find sections by courseId with deletedAt: null and sort by order ascending then _id ascending', async () => {
      const courseId = 'courseA';
      const mockDocB = {
        _id: 'b_id',
        courseId: 'courseA',
        title: 'Section B',
        order: 0,
      };
      const mockDocC = {
        _id: 'c_id',
        courseId: 'courseA',
        title: 'Section C',
        order: 1,
      };
      const mockDocA = {
        _id: 'a_id',
        courseId: 'courseA',
        title: 'Section A',
        order: 2,
      };

      // Mock database returning already sorted matching sections
      execMock.mockResolvedValue([mockDocB, mockDocC, mockDocA]);

      const results = await repository.findByCourseId(courseId);

      expect(mockModelConstructor.find).toHaveBeenCalledWith({
        courseId,
        deletedAt: null,
      });
      expect(sortMock).toHaveBeenCalledWith({
        order: 1,
        _id: 1,
      });
      expect(sessionMock).toHaveBeenCalledWith(null);
      expect(results).toHaveLength(3);
      expect(results[0].title).toBe('Section B');
      expect(results[0].order).toBe(0);
      expect(results[1].title).toBe('Section C');
      expect(results[1].order).toBe(1);
      expect(results[2].title).toBe('Section A');
      expect(results[2].order).toBe(2);
    });

    it('2. should enforce deletedAt: null in query to exclude soft-deleted sections', async () => {
      const courseId = 'courseA';
      execMock.mockResolvedValue([]);

      await repository.findByCourseId(courseId);

      expect(mockModelConstructor.find).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId,
          deletedAt: null,
        }),
      );
    });

    it('3. should return empty array [] when course has no sections', async () => {
      const courseId = 'course_empty';
      execMock.mockResolvedValue([]);

      const results = await repository.findByCourseId(courseId);

      expect(results).toEqual([]);
      expect(results).toHaveLength(0);
    });

    it('4. should pass session down to query when provided, or null when absent', async () => {
      const courseId = 'courseA';
      const mockSession = {} as ClientSession;
      execMock.mockResolvedValue([]);

      // With session
      await repository.findByCourseId(courseId, mockSession);
      expect(sessionMock).toHaveBeenCalledWith(mockSession);

      // Without session
      await repository.findByCourseId(courseId);
      expect(sessionMock).toHaveBeenCalledWith(null);
    });
  });

  describe('reorderSections', () => {
    it('1. should execute bulkWrite with correct updateOne operations and return reordered sections', async () => {
      const courseId = new Types.ObjectId().toString();
      const secId1 = new Types.ObjectId().toString();
      const secId2 = new Types.ObjectId().toString();
      const sectionIds = [secId2, secId1];
      const userId = 'user_instructor_1';

      mockModelConstructor.bulkWrite.mockResolvedValue({ ok: 1 });

      const sortMock = vi.fn().mockReturnThis();
      const sessionMock = vi.fn().mockReturnThis();
      const execMock = vi.fn().mockResolvedValue([
        { _id: secId2, courseId, title: 'Sec 2', order: 0 },
        { _id: secId1, courseId, title: 'Sec 1', order: 1 },
      ]);

      mockModelConstructor.find.mockReturnValue({
        sort: sortMock,
        session: sessionMock,
        exec: execMock,
      });

      const results = await repository.reorderSections(courseId, sectionIds, userId);

      expect(mockModelConstructor.bulkWrite).toHaveBeenCalledTimes(1);
      const [ops, options] = mockModelConstructor.bulkWrite.mock.calls[0];
      expect(ops).toHaveLength(2);
      expect(ops[0].updateOne.update.$set.order).toBe(0);
      expect(ops[0].updateOne.update.$set.updatedById).toBe(userId);
      expect(ops[1].updateOne.update.$set.order).toBe(1);
      expect(ops[1].updateOne.update.$set.updatedById).toBe(userId);
      expect(options).toEqual({ session: undefined });

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe(secId2);
      expect(results[0].order).toBe(0);
      expect(results[1].id).toBe(secId1);
      expect(results[1].order).toBe(1);
    });

    it('2. should pass session down to bulkWrite when provided', async () => {
      const courseId = new Types.ObjectId().toString();
      const secId1 = new Types.ObjectId().toString();
      const mockSession = {} as ClientSession;

      mockModelConstructor.bulkWrite.mockResolvedValue({ ok: 1 });

      const sortMock = vi.fn().mockReturnThis();
      const sessionMock = vi.fn().mockReturnThis();
      const execMock = vi.fn().mockResolvedValue([]);
      mockModelConstructor.find.mockReturnValue({
        sort: sortMock,
        session: sessionMock,
        exec: execMock,
      });

      await repository.reorderSections(courseId, [secId1], undefined, mockSession);

      expect(mockModelConstructor.bulkWrite).toHaveBeenCalledWith(
        expect.any(Array),
        { session: mockSession },
      );
    });

    it('3. should skip bulkWrite if sectionIds array is empty', async () => {
      const courseId = new Types.ObjectId().toString();
      const sortMock = vi.fn().mockReturnThis();
      const sessionMock = vi.fn().mockReturnThis();
      const execMock = vi.fn().mockResolvedValue([]);
      mockModelConstructor.find.mockReturnValue({
        sort: sortMock,
        session: sessionMock,
        exec: execMock,
      });

      const results = await repository.reorderSections(courseId, []);

      expect(mockModelConstructor.bulkWrite).not.toHaveBeenCalled();
      expect(results).toEqual([]);
    });
  });
});
