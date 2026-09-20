import { ClientSession } from 'mongoose';
import { PaginationOptions, PaginationResult } from '../dto/pagination-result.dto.js';

export interface BaseRepository<DomainModel, ID = string> {
  create(payload: Partial<DomainModel>, session?: ClientSession): Promise<DomainModel>;

  findById(id: ID, session?: ClientSession): Promise<DomainModel | null>;

  findOne(filter: Record<string, unknown>, session?: ClientSession): Promise<DomainModel | null>;

  findManyWithPagination(
    options: PaginationOptions,
    session?: ClientSession,
  ): Promise<PaginationResult<DomainModel>>;

  update(id: ID, payload: Partial<DomainModel>, session?: ClientSession): Promise<DomainModel | null>;

  softDelete(id: ID, deletedById?: string, session?: ClientSession): Promise<boolean>;

  restore(id: ID, updatedById?: string, session?: ClientSession): Promise<boolean>;

  withTransaction<R>(operation: (session: ClientSession) => Promise<R>): Promise<R>;
}
