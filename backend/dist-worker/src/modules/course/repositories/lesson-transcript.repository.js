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
import { LessonTranscriptionStatusEnum } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { LessonTranscriptEntity } from '../schemas/lesson-transcript.schema.js';
let LessonTranscriptRepository = class LessonTranscriptRepository extends BaseMongoRepository {
    constructor(lessonTranscriptModel) {
        super(lessonTranscriptModel, (doc) => {
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
                id: id,
                lessonId: (lessonId ?? ''),
                rawTranscript: (plain.rawTranscript ?? ''),
                sentences: (plain.sentences ?? []),
                durationSeconds: (plain.durationSeconds ?? 0),
                languageCode: (plain.languageCode ?? 'vi'),
                status: (plain.status ?? LessonTranscriptionStatusEnum.IDLE),
                externalTranscriptId: (plain.externalTranscriptId ?? null),
                failureReason: (plain.failureReason ?? null),
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
    async upsertByLessonId(lessonId, payload, session) {
        const lessonObjectId = Types.ObjectId.isValid(lessonId)
            ? new Types.ObjectId(lessonId)
            : lessonId;
        const doc = await this.model
            .findOneAndUpdate({
            lessonId: lessonObjectId,
            deletedAt: null,
        }, {
            $set: {
                ...payload,
                lessonId: lessonObjectId,
                updatedAt: new Date(),
            },
            $setOnInsert: {
                createdAt: new Date(),
            },
        }, {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
            session: session ?? null,
        })
            .exec();
        if (!doc) {
            throw new Error(`Failed to upsert lesson transcript for lesson ID: ${lessonId}`);
        }
        return this.toDomain(doc);
    }
    async updateStatusByLessonId(lessonId, status, failureReason, session) {
        const lessonObjectId = Types.ObjectId.isValid(lessonId)
            ? new Types.ObjectId(lessonId)
            : lessonId;
        const doc = await this.model
            .findOneAndUpdate({
            lessonId: lessonObjectId,
            deletedAt: null,
        }, {
            $set: {
                status,
                failureReason: failureReason ?? null,
                updatedAt: new Date(),
            },
        }, {
            new: true,
            session: session ?? null,
        })
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
};
LessonTranscriptRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(LessonTranscriptEntity.name)),
    __metadata("design:paramtypes", [Model])
], LessonTranscriptRepository);
export { LessonTranscriptRepository };
//# sourceMappingURL=lesson-transcript.repository.js.map