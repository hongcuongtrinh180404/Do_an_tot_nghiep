var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseMongoRepository } from '../../base/index.js';
import { InstructorTermEntity, } from '../schemas/instructor-term.schema.js';
let InstructorTermRepository = class InstructorTermRepository extends BaseMongoRepository {
    constructor(termModel) {
        super(termModel, (doc) => {
            const plain = typeof doc.toObject === 'function'
                ? doc.toObject()
                : doc;
            const rawId = plain._id;
            const id = typeof rawId === 'string'
                ? rawId
                : rawId?.toString?.() ?? '';
            return {
                id,
                title: plain.title || '',
                content: plain.content || '',
                isMandatory: plain.isMandatory !== undefined ? Boolean(plain.isMandatory) : true,
                order: typeof plain.order === 'number' ? plain.order : 0,
                createdAt: plain.createdAt ? new Date(plain.createdAt).toISOString() : undefined,
                updatedAt: plain.updatedAt ? new Date(plain.updatedAt).toISOString() : undefined,
            };
        });
    }
    async findAllOrdered(session) {
        const docs = await this.model
            .find({ deletedAt: null })
            .sort({ order: 1, createdAt: 1 })
            .session(session ?? null)
            .exec();
        return docs.map((doc) => this.toDomain(doc));
    }
    async replaceAllTerms(termDtos, session) {
        await this.model
            .updateMany({ deletedAt: null }, { $set: { deletedAt: new Date() } }, { ...(session ? { session } : {}) })
            .exec();
        const docsToInsert = termDtos.map((t, index) => ({
            title: t.title,
            content: t.content,
            isMandatory: t.isMandatory !== undefined ? t.isMandatory : true,
            order: typeof t.order === 'number' ? t.order : index + 1,
            deletedAt: null,
        }));
        if (docsToInsert.length > 0) {
            await this.model.insertMany(docsToInsert, { ...(session ? { session } : {}) });
        }
        return this.findAllOrdered(session);
    }
};
InstructorTermRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(InstructorTermEntity.name)),
    __metadata("design:paramtypes", [Model])
], InstructorTermRepository);
export { InstructorTermRepository };
//# sourceMappingURL=instructor-term.repository.js.map