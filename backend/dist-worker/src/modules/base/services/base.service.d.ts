import { Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import { BaseRepository } from '../repositories/base.repository.interface.js';
import { PaginationOptions, PaginationResult } from '../dto/pagination-result.dto.js';
export declare abstract class BaseService<DomainModel, ID = string> {
    protected readonly repository: BaseRepository<DomainModel, ID>;
    protected readonly cls: ClsService;
    protected readonly logger: Logger;
    protected constructor(repository: BaseRepository<DomainModel, ID>, cls: ClsService, serviceName?: string);
    protected getCurrentUserId(): string;
    protected getCorrelationId(): string;
    create(payload: Partial<DomainModel>, session?: ClientSession): Promise<DomainModel>;
    findById(id: ID, session?: ClientSession): Promise<DomainModel | null>;
    findByIdOrFail(id: ID, session?: ClientSession): Promise<DomainModel>;
    findOne(filter: Record<string, unknown>, session?: ClientSession): Promise<DomainModel | null>;
    findManyWithPagination(options: PaginationOptions, session?: ClientSession): Promise<PaginationResult<DomainModel>>;
    update(id: ID, payload: Partial<DomainModel>, session?: ClientSession): Promise<DomainModel | null>;
    updateOrFail(id: ID, payload: Partial<DomainModel>, session?: ClientSession): Promise<DomainModel>;
    softDelete(id: ID, session?: ClientSession): Promise<boolean>;
    restore(id: ID, session?: ClientSession): Promise<boolean>;
}
