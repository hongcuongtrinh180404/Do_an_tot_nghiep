import { Model, ClientSession, HydratedDocument, SortOrder } from 'mongoose';
import { BaseAbstractDocument } from '../documents/base.abstract.document.js';
import { BaseRepository } from './base.repository.interface.js';
import { PaginationOptions, PaginationResult, SortOption } from '../dto/pagination-result.dto.js';
export declare abstract class BaseMongoRepository<DomainModel, DocumentType extends BaseAbstractDocument, ID = string> implements BaseRepository<DomainModel, ID> {
    protected readonly model: Model<DocumentType>;
    protected readonly mapper?: ((doc: HydratedDocument<DocumentType> | DocumentType) => DomainModel) | undefined;
    protected constructor(model: Model<DocumentType>, mapper?: ((doc: HydratedDocument<DocumentType> | DocumentType) => DomainModel) | undefined);
    protected toDomain(doc: HydratedDocument<DocumentType> | DocumentType): DomainModel;
    protected buildSortObject(sortOptions?: SortOption[]): Record<string, SortOrder>;
    create(payload: Partial<DomainModel>, session?: ClientSession): Promise<DomainModel>;
    findById(id: ID, session?: ClientSession): Promise<DomainModel | null>;
    findOne(filter: Record<string, unknown>, session?: ClientSession): Promise<DomainModel | null>;
    findManyWithPagination(options: PaginationOptions, session?: ClientSession): Promise<PaginationResult<DomainModel>>;
    update(id: ID, payload: Partial<DomainModel>, session?: ClientSession): Promise<DomainModel | null>;
    softDelete(id: ID, deletedById?: string, session?: ClientSession): Promise<boolean>;
    restore(id: ID, updatedById?: string, session?: ClientSession): Promise<boolean>;
    withTransaction<R>(operation: (session: ClientSession) => Promise<R>): Promise<R>;
}
