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
import { SectionEntity } from '../schemas/section.schema.js';
let SectionRepository = class SectionRepository extends BaseMongoRepository {
    constructor(sectionModel) {
        super(sectionModel, (doc) => {
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
            };
        });
    }
    async findByCourseId(courseId, session) {
        const courseObjectId = Types.ObjectId.isValid(courseId)
            ? new Types.ObjectId(courseId)
            : courseId;
        const docs = await this.model
            .find({
            courseId: courseObjectId,
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
    async reorderSections(courseId, sectionIds, userId, session) {
        const courseObjectId = Types.ObjectId.isValid(courseId)
            ? new Types.ObjectId(courseId)
            : courseId;
        const operations = sectionIds.map((id, index) => {
            const sectionObjectId = Types.ObjectId.isValid(id)
                ? new Types.ObjectId(id)
                : id;
            return {
                updateOne: {
                    filter: {
                        _id: sectionObjectId,
                        courseId: courseObjectId,
                        deletedAt: null,
                    },
                    update: {
                        $set: {
                            order: index,
                            ...(userId ? { updatedById: userId } : {}),
                        },
                    },
                },
            };
        });
        if (operations.length > 0) {
            await this.model.bulkWrite(operations, { session: session ?? undefined });
        }
        return this.findByCourseId(courseId, session);
    }
    async shiftOrdersAfterDelete(courseId, fromOrder, userId, session) {
        const courseObjectId = Types.ObjectId.isValid(courseId)
            ? new Types.ObjectId(courseId)
            : courseId;
        const result = await this.model.updateMany({
            courseId: courseObjectId,
            order: { $gt: fromOrder },
            deletedAt: null,
        }, {
            $inc: { order: -1 },
            ...(userId ? { $set: { updatedById: userId } } : {}),
        }, { session: session ?? undefined });
        return result.modifiedCount;
    }
    async softDeleteByCourseId(courseId, userId, session) {
        const courseObjectId = Types.ObjectId.isValid(courseId)
            ? new Types.ObjectId(courseId)
            : courseId;
        const result = await this.model.updateMany({
            courseId: courseObjectId,
            deletedAt: null,
        }, {
            $set: {
                deletedAt: new Date(),
                ...(userId ? { updatedById: userId } : {}),
            },
        }, { session: session ?? undefined });
        return result.modifiedCount;
    }
};
SectionRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(SectionEntity.name)),
    __metadata("design:paramtypes", [Model])
], SectionRepository);
export { SectionRepository };
//# sourceMappingURL=section.repository.js.map