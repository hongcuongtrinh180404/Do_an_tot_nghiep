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
import { CourseCategoryEntity } from '../schemas/course-category.schema.js';
let CourseCategoryRepository = class CourseCategoryRepository extends BaseMongoRepository {
    constructor(courseCategoryModel) {
        super(courseCategoryModel, (doc) => {
            const plain = typeof doc.toObject === 'function'
                ? doc.toObject()
                : doc;
            const rawId = plain._id;
            const id = typeof rawId === 'string' ? rawId : rawId?.toString?.();
            return {
                ...plain,
                id: id,
            };
        });
    }
    async findBySlug(slug, session) {
        const doc = await this.model
            .findOne({
            slug: slug.toLowerCase().trim(),
            deletedAt: null,
        })
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async findBySlugIncludingDeleted(slug, session) {
        const doc = await this.model
            .findOne({ slug: slug.toLowerCase().trim() })
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async findAllSorted(session) {
        const docs = await this.model
            .find({ deletedAt: null })
            .sort({ order: 1, name: 1 })
            .session(session ?? null)
            .exec();
        return docs.map((doc) => this.toDomain(doc));
    }
};
CourseCategoryRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(CourseCategoryEntity.name)),
    __metadata("design:paramtypes", [Model])
], CourseCategoryRepository);
export { CourseCategoryRepository };
//# sourceMappingURL=course-category.repository.js.map