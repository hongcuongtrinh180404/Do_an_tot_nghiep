import { Logger, NotFoundException } from '@nestjs/common';
export class BaseService {
    repository;
    cls;
    logger;
    constructor(repository, cls, serviceName) {
        this.repository = repository;
        this.cls = cls;
        this.logger = new Logger(serviceName ?? this.constructor.name);
    }
    getCurrentUserId() {
        try {
            const userId = this.cls.get('userId');
            return userId || 'SYSTEM';
        }
        catch {
            return 'SYSTEM';
        }
    }
    getCorrelationId() {
        try {
            return this.cls.get('correlationId') || '';
        }
        catch {
            return '';
        }
    }
    async create(payload, session) {
        const currentUserId = this.getCurrentUserId();
        const auditPayload = {
            ...payload,
            createdById: currentUserId,
            updatedById: currentUserId,
        };
        this.logger.debug(`[${this.getCorrelationId()}] Creating entity with audit by user: ${currentUserId}`);
        return this.repository.create(auditPayload, session);
    }
    async findById(id, session) {
        return this.repository.findById(id, session);
    }
    async findByIdOrFail(id, session) {
        const entity = await this.findById(id, session);
        if (!entity) {
            throw new NotFoundException(`Entity with ID ${String(id)} not found`);
        }
        return entity;
    }
    async findOne(filter, session) {
        return this.repository.findOne(filter, session);
    }
    async findManyWithPagination(options, session) {
        return this.repository.findManyWithPagination(options, session);
    }
    async update(id, payload, session) {
        const currentUserId = this.getCurrentUserId();
        const auditPayload = {
            ...payload,
            updatedById: currentUserId,
        };
        this.logger.debug(`[${this.getCorrelationId()}] Updating entity ${String(id)} with audit by user: ${currentUserId}`);
        return this.repository.update(id, auditPayload, session);
    }
    async updateOrFail(id, payload, session) {
        const updated = await this.update(id, payload, session);
        if (!updated) {
            throw new NotFoundException(`Entity with ID ${String(id)} not found for update`);
        }
        return updated;
    }
    async softDelete(id, session) {
        const currentUserId = this.getCurrentUserId();
        this.logger.debug(`[${this.getCorrelationId()}] Soft deleting entity ${String(id)} by user: ${currentUserId}`);
        const deleted = await this.repository.softDelete(id, currentUserId, session);
        if (!deleted) {
            throw new NotFoundException(`Entity with ID ${String(id)} not found for deletion`);
        }
        return deleted;
    }
    async restore(id, session) {
        const currentUserId = this.getCurrentUserId();
        this.logger.debug(`[${this.getCorrelationId()}] Restoring entity ${String(id)} by user: ${currentUserId}`);
        const restored = await this.repository.restore(id, currentUserId, session);
        if (!restored) {
            throw new NotFoundException(`Entity with ID ${String(id)} not found for restoration`);
        }
        return restored;
    }
}
//# sourceMappingURL=base.service.js.map