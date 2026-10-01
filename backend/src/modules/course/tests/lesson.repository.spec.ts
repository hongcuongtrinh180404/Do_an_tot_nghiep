import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Model, Types, ClientSession } from 'mongoose';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { LessonEntity } from '../schemas/lesson.schema.js';

interface MockDoc {
  _id: Types.ObjectId;
  sectionId: Types.ObjectId | string;
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

describe('LessonRepository', () => {
  let repository: LessonRepository;
  let mockModelConstructor: any;

  beforeEach(() => {
    mockModelConstructor = vi.fn();
    mockModelConstructor.findOne = vi.fn();
    mockModelConstructor.find = vi.fn();
    mockModelConstructor.countDocuments = vi.fn();
    mockModelConstructor.findOneAndUpdate = vi.fn();
    mockModelConstructor.updateOne = vi.fn();

    repository = new LessonRepository(mockModelConstructor as unknown as Model<LessonEntity>);
  });

  describe('Mapper (toDomain)', () => {
    it('1. should correctly map Mongo _id (ObjectId) to id (string) and sectionId (ObjectId) to sectionId (string)', () => {
      const mockMongoId = new Types.ObjectId('507f1f77bcf86cd799439011');
      const mockSectionObjectId = new Types.ObjectId('607f1f77bcf86cd799439022');
      const now = new Date();

      const doc: MockDoc = {
        _id: mockMongoId,
        sectionId: mockSectionObjectId,
        title: 'Bài 1: Giới thiệu khóa học',
        description: 'Mô tả bài 1',
        order: 0,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        createdById: 'user_creator_1',
        updatedById: 'user_updater_1',
        toObject() {
          return {
            _id: this._id,
            sectionId: this.sectionId,
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

      const domain = (repository as any).toDomain(doc);

      expect(domain.id).toBe(mockMongoId.toString());
      expect(typeof domain.id).toBe('string');
      expect(domain.sectionId).toBe(mockSectionObjectId.toString());
      expect(typeof domain.sectionId).toBe('string');
      expect(domain.title).toBe('Bài 1: Giới thiệu khóa học');
      expect(domain.description).toBe('Mô tả bài 1');
      expect(domain.order).toBe(0);
      expect(domain.createdAt).toBe(now);
      expect(domain.updatedAt).toBe(now);
      expect(domain.deletedAt).toBeNull();
      expect(domain.createdById).toBe('user_creator_1');
      expect(domain.updatedById).toBe('user_updater_1');
    });

    it('2. should handle plain object without toObject method', () => {
      const mockMongoId = new Types.ObjectId('507f1f77bcf86cd799439033');
      const mockSectionObjectId = new Types.ObjectId('607f1f77bcf86cd799439044');

      const plainDoc = {
        _id: mockMongoId,
        sectionId: mockSectionObjectId,
        title: 'Bài 2: Cài đặt môi trường',
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
      expect(domain.sectionId).toBe(mockSectionObjectId.toString());
      expect(domain.title).toBe('Bài 2: Cài đặt môi trường');
      expect(domain.description).toBeNull();
      expect(domain.order).toBe(1);
    });

    it('3. should handle string sectionId and string _id gracefully', () => {
      const doc = {
        _id: 'string_id_123',
        sectionId: 'string_section_456',
        title: 'Bài 3',
        order: 2,
      };

      const domain = (repository as any).toDomain(doc);

      expect(domain.id).toBe('string_id_123');
      expect(domain.sectionId).toBe('string_section_456');
    });
  });

  describe('create', () => {
    it('should instantiate model, save with session, and return mapped ILesson', async () => {
      const mockMongoId = new Types.ObjectId('507f1f77bcf86cd799439099');
      const mockSectionObjectId = new Types.ObjectId('607f1f77bcf86cd799439088');
      const mockSession = {} as ClientSession;
      const saveFn = vi.fn().mockResolvedValue(true);

      const mockInstance = {
        _id: mockMongoId,
        sectionId: mockSectionObjectId,
        title: 'Bài 1: Khởi động dự án',
        description: 'Mô tả bài 1',
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
            sectionId: this.sectionId,
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
        sectionId: mockSectionObjectId.toString(),
        title: 'Bài 1: Khởi động dự án',
        description: 'Mô tả bài 1',
        order: 0,
        createdById: 'user_1',
        updatedById: 'user_1',
      };

      const created = await repository.create(payload, mockSession);

      expect(mockModelConstructor).toHaveBeenCalledWith(payload);
      expect(saveFn).toHaveBeenCalledWith({ session: mockSession });
      expect(created.id).toBe(mockMongoId.toString());
      expect(created.sectionId).toBe(mockSectionObjectId.toString());
      expect(created.title).toBe('Bài 1: Khởi động dự án');
      expect(created.createdById).toBe('user_1');
      expect(created.updatedById).toBe('user_1');
    });
  });

  describe('findBySectionId', () => {
    let execMock: ReturnType<typeof vi.fn>;
    let sessionMock: ReturnType<typeof vi.fn>;
    let sortMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      execMock = vi.fn();
      sessionMock = vi.fn().mockReturnValue({ exec: execMock });
      sortMock = vi.fn().mockReturnValue({ session: sessionMock });
      mockModelConstructor.find = vi.fn().mockReturnValue({ sort: sortMock });
    });

    it('1. should find lessons by sectionId with deletedAt: null and sort by order ascending then _id ascending', async () => {
      const sectionId = '507f1f77bcf86cd799439001';
      const mockDocB = {
        _id: 'b_id',
        sectionId,
        title: 'Lesson B',
        order: 0,
      };
      const mockDocC = {
        _id: 'c_id',
        sectionId,
        title: 'Lesson C',
        order: 1,
      };
      const mockDocA = {
        _id: 'a_id',
        sectionId,
        title: 'Lesson A',
        order: 2,
      };

      // Mock database returning already sorted matching lessons
      execMock.mockResolvedValue([mockDocB, mockDocC, mockDocA]);

      const results = await repository.findBySectionId(sectionId);

      expect(mockModelConstructor.find).toHaveBeenCalledWith({
        sectionId: new Types.ObjectId(sectionId),
        deletedAt: null,
      });
      expect(sortMock).toHaveBeenCalledWith({
        order: 1,
        _id: 1,
      });
      expect(sessionMock).toHaveBeenCalledWith(null);
      expect(results).toHaveLength(3);
      expect(results[0].title).toBe('Lesson B');
      expect(results[0].order).toBe(0);
      expect(results[1].title).toBe('Lesson C');
      expect(results[1].order).toBe(1);
      expect(results[2].title).toBe('Lesson A');
      expect(results[2].order).toBe(2);
    });

    it('2. should only query lessons belonging to the requested sectionId', async () => {
      const targetSectionId = new Types.ObjectId();
      execMock.mockResolvedValue([]);

      await repository.findBySectionId(targetSectionId.toString());

      expect(mockModelConstructor.find).toHaveBeenCalledWith(
        expect.objectContaining({
          sectionId: targetSectionId,
        }),
      );
    });

    it('3. should enforce deletedAt: null in query to exclude soft-deleted lessons', async () => {
      const sectionId = '507f1f77bcf86cd799439001';
      execMock.mockResolvedValue([]);

      await repository.findBySectionId(sectionId);

      expect(mockModelConstructor.find).toHaveBeenCalledWith(
        expect.objectContaining({
          deletedAt: null,
        }),
      );
    });

    it('4. should return empty array [] when section has no lessons', async () => {
      const sectionId = '507f1f77bcf86cd799439001';
      execMock.mockResolvedValue([]);

      const results = await repository.findBySectionId(sectionId);

      expect(results).toEqual([]);
      expect(results).toHaveLength(0);
    });

    it('5. should pass session down to query when provided, or null when absent', async () => {
      const sectionId = '507f1f77bcf86cd799439001';
      const mockSession = {} as ClientSession;
      execMock.mockResolvedValue([]);

      // With session
      await repository.findBySectionId(sectionId, mockSession);
      expect(sessionMock).toHaveBeenCalledWith(mockSession);

      // Without session
      await repository.findBySectionId(sectionId);
      expect(sessionMock).toHaveBeenCalledWith(null);
    });
  });
});
