import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { BaseService } from '../services/base.service.js';
import { BaseRepository } from '../repositories/base.repository.interface.js';

interface TestEntity {
  id?: string;
  name: string;
  createdById?: string | null;
  updatedById?: string | null;
}

class TestService extends BaseService<TestEntity, string> {
  constructor(repository: BaseRepository<TestEntity, string>, cls: ClsService) {
    super(repository, cls, 'TestService');
  }
}

describe('BaseService', () => {
  let service: TestService;
  let mockRepository: Record<keyof BaseRepository<TestEntity, string>, ReturnType<typeof vi.fn>>;
  let mockCls: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findOne: vi.fn(),
      findManyWithPagination: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      restore: vi.fn(),
      withTransaction: vi.fn(),
    };

    mockCls = {
      get: vi.fn().mockReturnValue('USER_999'),
    };

    service = new TestService(
      mockRepository as unknown as BaseRepository<TestEntity, string>,
      mockCls as unknown as ClsService,
    );
  });

  it('should automatically inject createdById and updatedById on create', async () => {
    const payload: Partial<TestEntity> = { name: 'Item Alpha' };
    mockRepository.create.mockImplementation(async (data: Partial<TestEntity>) => ({
      id: '123',
      ...data,
    } as TestEntity));

    const result = await service.create(payload);

    expect(mockCls.get).toHaveBeenCalledWith('userId');
    expect(mockRepository.create).toHaveBeenCalledWith(
      {
        name: 'Item Alpha',
        createdById: 'USER_999',
        updatedById: 'USER_999',
      },
      undefined,
    );
    expect(result.id).toBe('123');
    expect(result.createdById).toBe('USER_999');
  });

  it('should fallback to SYSTEM when context has no userId', async () => {
    mockCls.get.mockReturnValue(null);
    const payload: Partial<TestEntity> = { name: 'System Item' };
    mockRepository.create.mockImplementation(async (data: Partial<TestEntity>) => ({
      id: '124',
      ...data,
    } as TestEntity));

    const result = await service.create(payload);

    expect(mockRepository.create).toHaveBeenCalledWith(
      {
        name: 'System Item',
        createdById: 'SYSTEM',
        updatedById: 'SYSTEM',
      },
      undefined,
    );
    expect(result.createdById).toBe('SYSTEM');
  });

  it('should find entity by ID', async () => {
    const mockItem: TestEntity = { id: '123', name: 'Item Alpha' };
    mockRepository.findById.mockResolvedValue(mockItem);

    const result = await service.findById('123');

    expect(mockRepository.findById).toHaveBeenCalledWith('123', undefined);
    expect(result).toEqual(mockItem);
  });

  it('should throw NotFoundException on findByIdOrFail when entity does not exist', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(service.findByIdOrFail('not-found-id')).rejects.toThrow(NotFoundException);
  });

  it('should automatically inject updatedById on update', async () => {
    mockRepository.update.mockResolvedValue({ id: '123', name: 'Updated Item', updatedById: 'USER_999' });

    const result = await service.update('123', { name: 'Updated Item' });

    expect(mockRepository.update).toHaveBeenCalledWith(
      '123',
      {
        name: 'Updated Item',
        updatedById: 'USER_999',
      },
      undefined,
    );
    expect(result?.updatedById).toBe('USER_999');
  });

  it('should throw NotFoundException on updateOrFail when entity not found', async () => {
    mockRepository.update.mockResolvedValue(null);

    await expect(service.updateOrFail('999', { name: 'New' })).rejects.toThrow(NotFoundException);
  });

  it('should pass current user ID on softDelete', async () => {
    mockRepository.softDelete.mockResolvedValue(true);

    const success = await service.softDelete('123');

    expect(mockRepository.softDelete).toHaveBeenCalledWith('123', 'USER_999', undefined);
    expect(success).toBe(true);
  });

  it('should throw NotFoundException on softDelete when entity not found', async () => {
    mockRepository.softDelete.mockResolvedValue(false);

    await expect(service.softDelete('not-found')).rejects.toThrow(NotFoundException);
  });

  it('should pass current user ID on restore', async () => {
    mockRepository.restore.mockResolvedValue(true);

    const success = await service.restore('123');

    expect(mockRepository.restore).toHaveBeenCalledWith('123', 'USER_999', undefined);
    expect(success).toBe(true);
  });
});
