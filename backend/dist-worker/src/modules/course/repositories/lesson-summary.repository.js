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
import { LessonSummaryEntity } from '../schemas/lesson-summary.schema.js';
let LessonSummaryRepository = class LessonSummaryRepository extends BaseMongoRepository {
    constructor(lessonSummaryModel) {
        super(lessonSummaryModel, (doc) => {
            const plain = typeof doc.toObject === 'function'
                ? doc.toObject()
                : doc;
            const rawId = plain._id;
            const id = typeof rawId === 'string' ? rawId : rawId?.toString?.();
            const rawLessonId = plain.lessonId;
            const lessonId = typeof rawLessonId === 'string'
                ? rawLessonId
                : rawLessonId?.toString?.();
            return {
                ...plain,
                id: (id ?? ''),
                lessonId: (lessonId ?? ''),
                summary: plain.summary,
                draftSummary: plain.draftSummary,
            };
        });
    }
    async findByLessonId(lessonId, session) {
        const lessonObjectId = Types.ObjectId.isValid(lessonId)
            ? new Types.ObjectId(lessonId)
            : lessonId;
        const doc = await this.model
            .findOne({
            lessonId: lessonObjectId,
            deletedAt: null,
        })
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async saveDraftByLessonId(lessonId, draftData, userId, session) {
        const lessonObjectId = Types.ObjectId.isValid(lessonId)
            ? new Types.ObjectId(lessonId)
            : lessonId;
        const doc = await this.model
            .findOneAndUpdate({ lessonId: lessonObjectId, deletedAt: null }, {
            $set: {
                draftSummary: draftData,
                updatedById: userId ?? 'SYSTEM',
            },
            $setOnInsert: {
                lessonId: lessonObjectId,
                summary: draftData,
                createdById: userId ?? 'SYSTEM',
                deletedAt: null,
            },
        }, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            session: session ?? null,
        })
            .exec();
        return this.toDomain(doc);
    }
    async applyDraftByLessonId(lessonId, userId, session) {
        const lessonObjectId = Types.ObjectId.isValid(lessonId)
            ? new Types.ObjectId(lessonId)
            : lessonId;
        const existing = await this.model
            .findOne({ lessonId: lessonObjectId, deletedAt: null })
            .session(session ?? null)
            .exec();
        const plain = existing;
        if (!plain || !plain.draftSummary) {
            return null;
        }
        const doc = await this.model
            .findOneAndUpdate({ lessonId: lessonObjectId, deletedAt: null }, {
            $set: {
                summary: plain.draftSummary,
                draftSummary: null,
                updatedById: userId ?? 'SYSTEM',
            },
        }, {
            new: true,
            session: session ?? null,
        })
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async upsertOfficialByLessonId(lessonId, summaryData, userId, session) {
        const lessonObjectId = Types.ObjectId.isValid(lessonId)
            ? new Types.ObjectId(lessonId)
            : lessonId;
        const doc = await this.model
            .findOneAndUpdate({ lessonId: lessonObjectId, deletedAt: null }, {
            $set: {
                summary: summaryData,
                draftSummary: null,
                updatedById: userId ?? 'SYSTEM',
            },
            $setOnInsert: {
                lessonId: lessonObjectId,
                createdById: userId ?? 'SYSTEM',
                deletedAt: null,
            },
        }, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            session: session ?? null,
        })
            .exec();
        return this.toDomain(doc);
    }
};
LessonSummaryRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(LessonSummaryEntity.name)),
    __metadata("design:paramtypes", [Model])
], LessonSummaryRepository);
export { LessonSummaryRepository };
//# sourceMappingURL=lesson-summary.repository.js.map