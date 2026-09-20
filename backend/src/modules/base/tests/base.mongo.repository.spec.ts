import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Model, HydratedDocument, Types } from 'mongoose';
import { BaseAbstractDocument } from '../documents/base.abstract.document.js';
import { BaseMongoRepository } from '../repositories/base.mongo.repository.js';

interface SampleDomain {
  id?: string;
  name: string;
  createdById?: string | null;
  updatedById?: string | null;
}

class SampleDoc extends BaseAbstractDocument {
  name: string;
}

class TestMongoRepository extends BaseMongoRepository<SampleDomain, SampleDoc> {
  constructor(model: Model<SampleDoc>) {
    super(model);
  }
}

interface MockModelInterface {
  (data: Record<string, unknown>): {
    save: () => Promise<boolean>;
    toObject: () => Record<string, unknown>;
    _id: Types.ObjectId;
  };
  findOne: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  countDocuments: ReturnType<typeof vi.fn>;
  findOneAndUpdate: ReturnType<typeof vi.fn>;
  updateOne: ReturnType<typeof vi.fn>;
  db: {
    startSession: ReturnType<typeof vi.fn>;
  };
}

describe('BaseMongoRepository', () => {
  let repository: TestMongoRepository;
  let mockModel: MockModelInterface;

  beforeEach(() => {
    const modelFn = function (data: Record<string, unknown>) {
      return {
        ...data,
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        save: vi.fn().mockResolvedValue(true),
        toObject: () => ({
          _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
          ...data,
        }),
      };
    };

    modelFn.findOne = vi.fn();
    modelFn.find = vi.fn();
    modelFn.countDocuments = vi.fn();
    modelFn.findOneAndUpdate = vi.fn();
    modelFn.updateOne = vi.fn();
    modelFn.db = {
      startSession: vi.fn().mockResolvedValue({
        withTransaction: vi.fn().mockImplementation(async (cb: () => Promise<void>) => {
          await cb();
        }),
        endSession: vi.fn().mockResolvedValue(undefined),
      }),
    };

    mockModel = modelFn as unknown as MockModelInterface;
    repository = new TestMongoRepository(mockModel as unknown as Model<SampleDoc>);
  });

  it('should create an entity and return domain model', async () => {
    const payload = { name: 'Item 1' };
    const created = await repository.create(payload);

    expect(created).toBeDefined();
    expect(created.name).toBe('Item 1');
    expect(created.id).toBe('507f1f77bcf86cd799439011');
  });

  it('should find an active entity by ID (filtering deletedAt: null)', async () => {
    const fakeDoc = {
      _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
      name: 'Active Item',
      toObject: () => ({
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        name: 'Active Item',
      }),
    };

    const mockExec = vi.fn().mockResolvedValue(fakeDoc);
    mockModel.findOne.mockReturnValue({
      session: vi.fn().mockReturnValue({
        exec: mockExec,
      }),
    });

    const result = await repository.findById('507f1f77bcf86cd799439011');

    expect(mockModel.findOne).toHaveBeenCalledWith({
      _id: '507f1f77bcf86cd799439011',
      deletedAt: null,
    });
    expect(result).toBeDefined();
    expect(result?.name).toBe('Active Item');
  });

  it('should return null when entity not found', async () => {
    const mockExec = vi.fn().mockResolvedValue(null);
    mockModel.findOne.mockReturnValue({
      session: vi.fn().mockReturnValue({
        exec: mockExec,
      }),
    });

    const result = await repository.findById('non-existent');
    expect(result).toBeNull();
  });

  it('should soft delete an entity by setting deletedAt and updatedById', async () => {
    const mockExec = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    mockModel.updateOne.mockReturnValue({
      exec: mockExec,
    });

    const success = await repository.softDelete('507f1f77bcf86cd799439011', 'USER_123');

    expect(mockModel.updateOne).toHaveBeenCalledWith(
      { _id: '507f1f77bcf86cd799439011', deletedAt: null },
      {
        $set: {
          deletedAt: expect.any(Date),
          updatedById: 'USER_123',
        },
      },
      {},
    );
    expect(success).toBe(true);
  });

  it('should restore a soft-deleted entity', async () => {
    const mockExec = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    mockModel.updateOne.mockReturnValue({
      exec: mockExec,
    });

    const success = await repository.restore('507f1f77bcf86cd799439011', 'USER_123');

    expect(mockModel.updateOne).toHaveBeenCalledWith(
      { _id: '507f1f77bcf86cd799439011', deletedAt: { $ne: null } },
      {
        $set: {
          deletedAt: null,
          updatedById: 'USER_123',
        },
      },
      expect.any(Object),
    );
    expect(success).toBe(true);
  });

  it('should paginate results properly with total and totalPages', async () => {
    const countExec = vi.fn().mockResolvedValue(25);
    mockModel.countDocuments.mockReturnValue({
      session: vi.fn().mockReturnValue({
        exec: countExec,
      }),
    });

    const fakeItems = [
      { _id: new Types.ObjectId(), name: 'Item A', toObject: () => ({ name: 'Item A' }) },
      { _id: new Types.ObjectId(), name: 'Item B', toObject: () => ({ name: 'Item B' }) },
    ];
    const findExec = vi.fn().mockResolvedValue(fakeItems);
    mockModel.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            session: vi.fn().mockReturnValue({
              exec: findExec,
            }),
          }),
        }),
      }),
    });

    const result = await repository.findManyWithPagination({ page: 2, limit: 10 });

    expect(result.total).toBe(25);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.totalPages).toBe(3);
    expect(result.items.length).toBe(2);
  });

  it('should execute operation inside a MongoDB transaction session', async () => {
    const result = await repository.withTransaction(async (session) => {
      expect(session).toBeDefined();
      return 'transaction_success';
    });

    expect(result).toBe('transaction_success');
    expect(mockModel.db.startSession).toHaveBeenCalledTimes(1);
  });
});
