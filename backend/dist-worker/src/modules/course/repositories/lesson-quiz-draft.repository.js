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
import { LessonQuizDraftEntity } from '../schemas/lesson-quiz-draft.schema.js';
let LessonQuizDraftRepository = class LessonQuizDraftRepository extends BaseMongoRepository {
    constructor(lessonQuizDraftModel) {
        super(lessonQuizDraftModel, (doc) => {
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
                quizzes: (plain.quizzes ?? []),
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
    async saveDraftByLessonId(lessonId, quizzes, userId, session) {
        const lessonObjectId = Types.ObjectId.isValid(lessonId)
            ? new Types.ObjectId(lessonId)
            : lessonId;
        const doc = await this.model
            .findOneAndUpdate({ lessonId: lessonObjectId, deletedAt: null }, {
            $set: {
                quizzes,
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
    async clearDraftByLessonId(lessonId, session) {
        const lessonObjectId = Types.ObjectId.isValid(lessonId)
            ? new Types.ObjectId(lessonId)
            : lessonId;
        const res = await this.model
            .deleteMany({ lessonId: lessonObjectId })
            .session(session ?? null)
            .exec();
        return (res.deletedCount ?? 0) > 0;
    }
};
LessonQuizDraftRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(LessonQuizDraftEntity.name)),
    __metadata("design:paramtypes", [Model])
], LessonQuizDraftRepository);
export { LessonQuizDraftRepository };
//# sourceMappingURL=lesson-quiz-draft.repository.js.map