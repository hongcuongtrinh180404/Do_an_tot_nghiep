import { Model, ClientSession, HydratedDocument, SortOrder } from 'mongoose';
import { BaseAbstractDocument } from '../documents/base.abstract.document.js';
import { BaseRepository } from './base.repository.interface.js';
import { PaginationOptions, PaginationResult, SortOption } from '../dto/pagination-result.dto.js';

export abstract class BaseMongoRepository<
  DomainModel,
  DocumentType extends BaseAbstractDocument,
  ID = string,
> implements BaseRepository<DomainModel, ID> {
  protected constructor(
    protected readonly model: Model<DocumentType>,
    protected readonly mapper?: (doc: HydratedDocument<DocumentType> | DocumentType) => DomainModel,
  ) {}

  protected toDomain(doc: HydratedDocument<DocumentType> | DocumentType): DomainModel {
    if (this.mapper) {
      return this.mapper(doc);
    }
    const plain = typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
      ? (doc as { toObject: () => Record<string, unknown> }).toObject()
      : (doc as Record<string, unknown>);

    const id = plain._id ? String(plain._id) : undefined;
    return {
      ...plain,
      id,
    } as unknown as DomainModel;
  }

  protected buildSortObject(sortOptions?: SortOption[]): Record<string, SortOrder> {
    if (!sortOptions || sortOptions.length === 0) {
      return { createdAt: -1 };
    }
    const sortObj: Record<string, SortOrder> = {};
    for (const s of sortOptions) {
      sortObj[s.orderBy] = s.order === 'asc' ? 1 : -1;
    }
    return sortObj;
  }

  async create(payload: Partial<DomainModel>, session?: ClientSession): Promise<DomainModel> {
    const createdDoc = new this.model(payload);
    await createdDoc.save({ session });
    return this.toDomain(createdDoc as unknown as HydratedDocument<DocumentType>);
  }

  async findById(id: ID, session?: ClientSession): Promise<DomainModel | null> {
    const doc = await this.model
      .findOne({ _id: id, deletedAt: null } as Record<string, unknown>)
      .session(session ?? null)
      .exec();
    return doc ? this.toDomain(doc as unknown as HydratedDocument<DocumentType>) : null;
  }

  async findOne(filter: Record<string, unknown>, session?: ClientSession): Promise<DomainModel | null> {
    const query = { ...filter, deletedAt: null };
    const doc = await this.model
      .findOne(query)
      .session(session ?? null)
      .exec();
    return doc ? this.toDomain(doc as unknown as HydratedDocument<DocumentType>) : null;
  }

  async findManyWithPagination(
    options: PaginationOptions,
    session?: ClientSession,
  ): Promise<PaginationResult<DomainModel>> {
    const query: Record<string, unknown> = {
      ...(options.filters ?? {}),
      deletedAt: null,
    };

    const sortObj = this.buildSortObject(options.sort);
    const total = await this.model
      .countDocuments(query)
      .session(session ?? null)
      .exec();

    if (options.isPagination === false) {
      const docs = await this.model
        .find(query)
        .sort(sortObj)
        .session(session ?? null)
        .exec();

      return {
        items: docs.map((d) => this.toDomain(d as unknown as HydratedDocument<DocumentType>)),
        total,
        page: 1,
        limit: total || 1,
        totalPages: 1,
      };
    }

    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 10));
    const skip = (page - 1) * limit;

    const docs = await this.model
      .find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .session(session ?? null)
      .exec();

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: docs.map((d) => this.toDomain(d as unknown as HydratedDocument<DocumentType>)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async update(id: ID, payload: Partial<DomainModel>, session?: ClientSession): Promise<DomainModel | null> {
    const updatedDoc = await this.model
      .findOneAndUpdate(
        { _id: id, deletedAt: null } as Record<string, unknown>,
        { $set: payload } as Record<string, unknown>,
        { new: true, ...(session ? { session } : {}) },
      )
      .exec();

    return updatedDoc ? this.toDomain(updatedDoc as unknown as HydratedDocument<DocumentType>) : null;
  }

  async softDelete(id: ID, deletedById?: string, session?: ClientSession): Promise<boolean> {
    const updatePayload: Record<string, unknown> = {
      deletedAt: new Date(),
    };
    if (deletedById) {
      updatePayload.updatedById = deletedById;
    }

    const result = await this.model
      .updateOne(
        { _id: id, deletedAt: null } as Record<string, unknown>,
        { $set: updatePayload },
        session ? { session } : {},
      )
      .exec();

    return result.modifiedCount > 0;
  }

  async restore(id: ID, updatedById?: string, session?: ClientSession): Promise<boolean> {
    const updatePayload: Record<string, unknown> = {
      deletedAt: null,
    };
    if (updatedById) {
      updatePayload.updatedById = updatedById;
    }

    const result = await this.model
      .updateOne(
        { _id: id, deletedAt: { $ne: null } } as Record<string, unknown>,
        { $set: updatePayload },
        session ? { session } : {},
      )
      .exec();

    return result.modifiedCount > 0;
  }

  async withTransaction<R>(operation: (session: ClientSession) => Promise<R>): Promise<R> {
    const session = await this.model.db.startSession();
    try {
      let result: R | undefined;
      await session.withTransaction(async () => {
        result = await operation(session);
      });
      return result as R;
    } finally {
      await session.endSession();
    }
  }
}
