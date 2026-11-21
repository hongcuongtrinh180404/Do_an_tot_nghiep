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
import { Model, Types } from 'mongoose';
import { LessonContentTypeEnum } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { LessonEntity } from '../schemas/lesson.schema.js';
let LessonRepository = class LessonRepository extends BaseMongoRepository {
    constructor(lessonModel) {
        super(lessonModel, (doc) => {
            const plain = typeof doc.toObject === 'function'
                ? doc.toObject()
                : doc;
            const rawId = plain._id;
            const id = typeof rawId === 'string' ? rawId : rawId?.toString?.();
            const rawSectionId = plain.sectionId;
            const sectionId = typeof rawSectionId === 'string'
                ? rawSectionId
                : rawSectionId?.toString?.();
            const rawMaterials = Array.isArray(plain.materials) ? plain.materials : [];
            const materials = rawMaterials.map((mat) => {
                const matId = typeof mat._id === 'string'
                    ? mat._id
                    : mat._id?.toString?.() || mat.id || '';
                return {
                    id: matId,
                    title: mat.title || '',
                    url: mat.url || '',
                    fileName: mat.fileName || '',
                    fileSize: typeof mat.fileSize === 'number' ? mat.fileSize : null,
                    mimeType: mat.mimeType || null,
                    publicId: mat.publicId || null,
                    createdAt: mat.createdAt || new Date(),
                };
            });
            const lesson = { ...plain };
            delete lesson.description;
            return {
                ...lesson,
                id: id,
                sectionId: (sectionId ?? ''),
                content: (plain.content ?? null),
                materials,
                isPreview: Boolean(plain.isPreview),
            };
        });
    }
    async findBySectionId(sectionId, session) {
        const sectionObjectId = Types.ObjectId.isValid(sectionId)
            ? new Types.ObjectId(sectionId)
            : sectionId;
        const docs = await this.model
            .find({
            sectionId: sectionObjectId,
            deletedAt: null,
        })
            .sort({
            order: 1,
            _id: 1,
        })
            .session(session ?? null)
            .exec();
        return docs.map((doc) => this.toDomain(doc));
    }
    async findBySectionIds(sectionIds) {
        if (sectionIds.length === 0)
            return [];
        const docs = await this.model.find({
            sectionId: { $in: sectionIds.map((id) => new Types.ObjectId(id)) },
            deletedAt: null,
        }).sort({ order: 1, _id: 1 }).exec();
        return docs.map((doc) => this.toDomain(doc));
    }
    async findByMediaUrl(url) {
        const doc = await this.model.findOne({
            deletedAt: null,
            $or: [{ 'content.url': url }, { 'materials.url': url }],
        }).exec();
        return doc ? this.toDomain(doc) : null;
    }
    async getCourseVideoStats(courseIds, maxTimeMS) {
        if (courseIds.length === 0)
            return [];
        const validDuration = { $and: [{ $isNumber: '$content.duration' }, { $gt: ['$content.duration', 0] }] };
        const query = this.model.aggregate([
            { $match: { deletedAt: null, 'content.type': LessonContentTypeEnum.VIDEO } },
            { $lookup: { from: 'sections', localField: 'sectionId', foreignField: '_id', as: 'section' } },
            { $unwind: '$section' },
            { $match: { 'section.deletedAt': null, 'section.courseId': { $in: courseIds.map((id) => new Types.ObjectId(id)) } } },
            { $group: {
                    _id: '$section.courseId',
                    totalSeconds: { $sum: { $cond: [validDuration, '$content.duration', 0] } },
                    videoCount: { $sum: 1 },
                    missingDurationCount: { $sum: { $cond: [validDuration, 0, 1] } },
                    videos: { $push: { lessonId: { $toString: '$_id' }, url: '$content.url',
                            publicId: { $ifNull: ['$content.publicId', null] }, durationSeconds: '$content.duration' } },
                } },
            { $project: { _id: 0, courseId: { $toString: '$_id' }, totalSeconds: 1, videoCount: 1, missingDurationCount: 1, videos: 1 } },
        ]);
        if (maxTimeMS)
            query.option({ maxTimeMS });
        return query.exec();
    }
    async softDeleteBySectionId(sectionId, userId, session) {
        const sectionObjectId = Types.ObjectId.isValid(sectionId)
            ? new Types.ObjectId(sectionId)
            : sectionId;
        const result = await this.model.updateMany({
            sectionId: sectionObjectId,
            deletedAt: null,
        }, {
            $set: {
                deletedAt: new Date(),
                ...(userId ? { updatedById: userId } : {}),
            },
        }, { session: session ?? undefined });
        return result.modifiedCount;
    }
    async softDeleteBySectionIds(sectionIds, userId, session) {
        if (!sectionIds || sectionIds.length === 0)
            return 0;
        const sectionObjectIds = sectionIds
            .filter((id) => Types.ObjectId.isValid(id))
            .map((id) => new Types.ObjectId(id));
        if (sectionObjectIds.length === 0)
            return 0;
        const result = await this.model.updateMany({
            sectionId: { $in: sectionObjectIds },
            deletedAt: null,
        }, {
            $set: {
                deletedAt: new Date(),
                ...(userId ? { updatedById: userId } : {}),
            },
        }, { session: session ?? undefined });
        return result.modifiedCount;
    }
    async addMaterial(lessonId, material, session) {
        const lessonObjectId = Types.ObjectId.isValid(lessonId)
            ? new Types.ObjectId(lessonId)
            : lessonId;
        const doc = await this.model
            .findOneAndUpdate({ _id: lessonObjectId, deletedAt: null }, {
            $push: {
                materials: {
                    ...material,
                    _id: new Types.ObjectId(),
                },
            },
        }, { new: true, session: session ?? null })
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async deleteMaterial(lessonId, materialId, session) {
        const lessonObjectId = Types.ObjectId.isValid(lessonId)
            ? new Types.ObjectId(lessonId)
            : lessonId;
        const materialObjectId = Types.ObjectId.isValid(materialId)
            ? new Types.ObjectId(materialId)
            : materialId;
        const doc = await this.model
            .findOneAndUpdate({ _id: lessonObjectId, deletedAt: null }, {
            $pull: {
                materials: { _id: materialObjectId },
            },
        }, { new: true, session: session ?? null })
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async reorderAfterDelete(sectionId, deletedOrder, session) {
        const sectionObjectId = Types.ObjectId.isValid(sectionId)
            ? new Types.ObjectId(sectionId)
            : sectionId;
        const result = await this.model.updateMany({
            sectionId: sectionObjectId,
            deletedAt: null,
            order: { $gt: deletedOrder },
        }, {
            $inc: { order: -1 },
        }, { session: session ?? undefined });
        return result.modifiedCount;
    }
};
LessonRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(LessonEntity.name)),
    __metadata("design:paramtypes", [Model])
], LessonRepository);
export { LessonRepository };
//# sourceMappingURL=lesson.repository.js.map