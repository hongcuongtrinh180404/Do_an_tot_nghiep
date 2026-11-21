export class BaseMongoRepository {
    model;
    mapper;
    constructor(model, mapper) {
        this.model = model;
        this.mapper = mapper;
    }
    toDomain(doc) {
        if (this.mapper) {
            return this.mapper(doc);
        }
        const plain = typeof doc.toObject === 'function'
            ? doc.toObject()
            : doc;
        const rawId = plain._id;
        const id = typeof rawId === 'string' ? rawId : rawId?.toString?.();
        return {
            ...plain,
            id,
        };
    }
    buildSortObject(sortOptions) {
        if (!sortOptions || sortOptions.length === 0) {
            return { createdAt: -1 };
        }
        const sortObj = {};
        for (const s of sortOptions) {
            sortObj[s.orderBy] = s.order === 'asc' ? 1 : -1;
        }
        return sortObj;
    }
    async create(payload, session) {
        const createdDoc = new this.model(payload);
        await createdDoc.save({ session });
        return this.toDomain(createdDoc);
    }
    async findById(id, session) {
        const doc = await this.model
            .findOne({ _id: id, deletedAt: null })
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async findOne(filter, session) {
        const query = { ...filter, deletedAt: null };
        const doc = await this.model
            .findOne(query)
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async findManyWithPagination(options, session) {
        const query = {
            ...options.filters,
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
                items: docs.map((d) => this.toDomain(d)),
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
            items: docs.map((d) => this.toDomain(d)),
            total,
            page,
            limit,
            totalPages,
        };
    }
    async update(id, payload, session) {
        const updatedDoc = await this.model
            .findOneAndUpdate({ _id: id, deletedAt: null }, { $set: payload }, { new: true, ...(session ? { session } : {}) })
            .exec();
        return updatedDoc ? this.toDomain(updatedDoc) : null;
    }
    async softDelete(id, deletedById, session) {
        const updatePayload = {
            deletedAt: new Date(),
        };
        if (deletedById) {
            updatePayload.updatedById = deletedById;
        }
        const result = await this.model
            .updateOne({ _id: id, deletedAt: null }, { $set: updatePayload }, session ? { session } : {})
            .exec();
        return result.modifiedCount > 0;
    }
    async restore(id, updatedById, session) {
        const updatePayload = {
            deletedAt: null,
        };
        if (updatedById) {
            updatePayload.updatedById = updatedById;
        }
        const result = await this.model
            .updateOne({ _id: id, deletedAt: { $ne: null } }, { $set: updatePayload }, session ? { session } : {})
            .exec();
        return result.modifiedCount > 0;
    }
    async withTransaction(operation) {
        const session = await this.model.db.startSession();
        try {
            let result;
            await session.withTransaction(async () => {
                result = await operation(session);
            });
            return result;
        }
        finally {
            await session.endSession();
        }
    }
}
//# sourceMappingURL=base.mongo.repository.js.map