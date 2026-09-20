import { Logger, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import { BaseRepository } from '../repositories/base.repository.interface.js';
import { PaginationOptions, PaginationResult } from '../dto/pagination-result.dto.js';

export abstract class BaseService<DomainModel, ID = string> {
  protected readonly logger: Logger;

  protected constructor(
    protected readonly repository: BaseRepository<DomainModel, ID>,
    protected readonly cls: ClsService,
    serviceName?: string,
  ) {
    this.logger = new Logger(serviceName ?? this.constructor.name);
  }

  protected getCurrentUserId(): string {
    try {
      const userId = this.cls.get<string>('userId');
      return userId || 'SYSTEM';
    } catch {
      return 'SYSTEM';
    }
  }

  protected getCorrelationId(): string {
    try {
      return this.cls.get<string>('correlationId') || '';
    } catch {
      return '';
    }
  }

  async create(payload: Partial<DomainModel>, session?: ClientSession): Promise<DomainModel> {
    const currentUserId = this.getCurrentUserId();
    const auditPayload: Partial<DomainModel> = {
      ...payload,
      createdById: currentUserId,
      updatedById: currentUserId,
    } as unknown as Partial<DomainModel>;

    this.logger.debug(
      `[${this.getCorrelationId()}] Creating entity with audit by user: ${currentUserId}`,
    );
    return this.repository.create(auditPayload, session);
  }

  async findById(id: ID, session?: ClientSession): Promise<DomainModel | null> {
    return this.repository.findById(id, session);
  }

  async findByIdOrFail(id: ID, session?: ClientSession): Promise<DomainModel> {
    const entity = await this.findById(id, session);
    if (!entity) {
      throw new NotFoundException(`Entity with ID ${String(id)} not found`);
    }
    return entity;
  }

  async findOne(
    filter: Record<string, unknown>,
    session?: ClientSession,
  ): Promise<DomainModel | null> {
    return this.repository.findOne(filter, session);
  }

  async findManyWithPagination(
    options: PaginationOptions,
    session?: ClientSession,
  ): Promise<PaginationResult<DomainModel>> {
    return this.repository.findManyWithPagination(options, session);
  }

  async update(
    id: ID,
    payload: Partial<DomainModel>,
    session?: ClientSession,
  ): Promise<DomainModel | null> {
    const currentUserId = this.getCurrentUserId();
    const auditPayload: Partial<DomainModel> = {
      ...payload,
      updatedById: currentUserId,
    } as unknown as Partial<DomainModel>;

    this.logger.debug(
      `[${this.getCorrelationId()}] Updating entity ${String(id)} with audit by user: ${currentUserId}`,
    );
    return this.repository.update(id, auditPayload, session);
  }

  async updateOrFail(
    id: ID,
    payload: Partial<DomainModel>,
    session?: ClientSession,
  ): Promise<DomainModel> {
    const updated = await this.update(id, payload, session);
    if (!updated) {
      throw new NotFoundException(`Entity with ID ${String(id)} not found for update`);
    }
    return updated;
  }

  async softDelete(id: ID, session?: ClientSession): Promise<boolean> {
    const currentUserId = this.getCurrentUserId();
    this.logger.debug(
      `[${this.getCorrelationId()}] Soft deleting entity ${String(id)} by user: ${currentUserId}`,
    );
    const deleted = await this.repository.softDelete(id, currentUserId, session);
    if (!deleted) {
      throw new NotFoundException(`Entity with ID ${String(id)} not found for deletion`);
    }
    return deleted;
  }

  async restore(id: ID, session?: ClientSession): Promise<boolean> {
    const currentUserId = this.getCurrentUserId();
    this.logger.debug(
      `[${this.getCorrelationId()}] Restoring entity ${String(id)} by user: ${currentUserId}`,
    );
    const restored = await this.repository.restore(id, currentUserId, session);
    if (!restored) {
      throw new NotFoundException(`Entity with ID ${String(id)} not found for restoration`);
    }
    return restored;
  }
}
