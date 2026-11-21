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
import { BaseMongoRepository } from '../../base/index.js';
import { CourseMindmapEntity } from '../schemas/course-mindmap.schema.js';
let CourseMindmapRepository = class CourseMindmapRepository extends BaseMongoRepository {
    constructor(courseMindmapModel) {
        super(courseMindmapModel, (doc) => {
            const plain = typeof doc.toObject === 'function'
                ? doc.toObject()
                : doc;
            const rawId = plain._id;
            const id = typeof rawId === 'string' ? rawId : rawId?.toString?.();
            const rawCourseId = plain.courseId;
            const courseId = typeof rawCourseId === 'string'
                ? rawCourseId
                : rawCourseId?.toString?.();
            return {
                ...plain,
                id: id,
                courseId: (courseId ?? ''),
                mindmapData: (plain.mindmapData ?? {}),
            };
        });
    }
    async findByCourseId(courseId, session) {
        const courseObjectId = Types.ObjectId.isValid(courseId)
            ? new Types.ObjectId(courseId)
            : courseId;
        const doc = await this.model
            .findOne({
            courseId: courseObjectId,
            deletedAt: null,
        })
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async upsertByCourseId(courseId, mindmapData, userId, session) {
        const courseObjectId = Types.ObjectId.isValid(courseId)
            ? new Types.ObjectId(courseId)
            : courseId;
        const userObjectId = userId && Types.ObjectId.isValid(userId)
            ? new Types.ObjectId(userId)
            : null;
        const doc = await this.model
            .findOneAndUpdate({
            courseId: courseObjectId,
            deletedAt: null,
        }, {
            $set: {
                mindmapData,
                updatedById: userObjectId,
                deletedAt: null,
            },
            $setOnInsert: {
                createdById: userObjectId,
            },
        }, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            session: session ?? null,
        })
            .exec();
        if (!doc) {
            throw new Error(`Failed to upsert mindmap for course ID: ${courseId}`);
        }
        return this.toDomain(doc);
    }
    async softDeleteByCourseId(courseId, userId, session) {
        const courseObjectId = Types.ObjectId.isValid(courseId)
            ? new Types.ObjectId(courseId)
            : courseId;
        const userObjectId = userId && Types.ObjectId.isValid(userId)
            ? new Types.ObjectId(userId)
            : null;
        const result = await this.model.updateMany({
            courseId: courseObjectId,
            deletedAt: null,
        }, {
            $set: {
                deletedAt: new Date(),
                ...(userObjectId ? { updatedById: userObjectId } : {}),
            },
        }, { session: session ?? undefined });
        return result.modifiedCount;
    }
};
CourseMindmapRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(CourseMindmapEntity.name)),
    __metadata("design:paramtypes", [Model])
], CourseMindmapRepository);
export { CourseMindmapRepository };
//# sourceMappingURL=course-mindmap.repository.js.map