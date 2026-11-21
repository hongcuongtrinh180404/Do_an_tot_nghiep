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
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { QuizQuestionTypeEnum } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { LessonQuizEntity } from '../schemas/lesson-quiz.schema.js';
let LessonQuizRepository = class LessonQuizRepository extends BaseMongoRepository {
    constructor(lessonQuizModel) {
        super(lessonQuizModel, (doc) => {
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
                timestamp: (plain.timestamp ?? null),
                explanationTimestamp: (plain.explanationTimestamp ?? null),
                order: (plain.order ?? 1),
                question: (plain.question ?? ''),
                questionType: (plain.questionType ?? QuizQuestionTypeEnum.SINGLE),
                options: (plain.options ?? []),
                explanation: (plain.explanation ?? null),
                createdAt: plain.createdAt,
                updatedAt: plain.updatedAt,
            };
        });
    }
    async findByLessonId(lessonId, session) {
        const lessonObjectId = Types.ObjectId.isValid(lessonId)
            ? new Types.ObjectId(lessonId)
            : lessonId;
        const docs = await this.model
            .find({
            lessonId: lessonObjectId,
            deletedAt: null,
        })
            .sort({ timestamp: 1, order: 1, _id: 1 })
            .session(session ?? null)
            .exec();
        return docs.map((d) => this.toDomain(d));
    }
    async findByLessonIdAndTimestamp(lessonId, timestamp, session) {
        const lessonObjectId = Types.ObjectId.isValid(lessonId)
            ? new Types.ObjectId(lessonId)
            : lessonId;
        const docs = await this.model
            .find({
            lessonId: lessonObjectId,
            timestamp,
            deletedAt: null,
        })
            .sort({ order: 1, _id: 1 })
            .session(session ?? null)
            .exec();
        return docs.map((d) => this.toDomain(d));
    }
    async hardDelete(id, session) {
        const result = await this.model
            .deleteOne({ _id: id, deletedAt: null })
            .session(session ?? null)
            .exec();
        return (result.deletedCount ?? 0) > 0;
    }
    async findByLessonIds(lessonIds, maxTimeMS) {
        if (lessonIds.length === 0)
            return [];
        const query = this.model.find({
            lessonId: { $in: lessonIds.map((id) => new Types.ObjectId(id)) }, deletedAt: null,
        }).sort({ timestamp: 1, order: 1, _id: 1 });
        if (maxTimeMS)
            query.maxTimeMS(maxTimeMS);
        const docs = await query.exec();
        return docs.map((doc) => this.toDomain(doc));
    }
    async syncQuizzesAtTimestamp(lessonId, timestamp, quizzes, session) {
        if (!session) {
            return this.withTransaction((transaction) => this.syncQuizzesAtTimestamp(lessonId, timestamp, quizzes, transaction));
        }
        const lessonObjectId = Types.ObjectId.isValid(lessonId)
            ? new Types.ObjectId(lessonId)
            : lessonId;
        const clusterFilter = { lessonId: lessonObjectId, timestamp: { $gte: Math.max(0, timestamp - 2), $lte: timestamp + 2 }, deletedAt: null };
        const existing = await this.model.find(clusterFilter).session(session).exec();
        const existingIds = new Set(existing.map((quiz) => String(quiz._id)));
        const retainedIds = quizzes.filter((quiz) => quiz.id).map((quiz) => quiz.id);
        if (new Set(retainedIds).size !== retainedIds.length || retainedIds.some((id) => !existingIds.has(id))) {
            throw new BadRequestException('Câu hỏi cần đồng bộ không thuộc checkpoint này hoặc bị trùng ID');
        }
        await this.model
            .deleteMany({
            ...clusterFilter,
            _id: { $nin: retainedIds.map((id) => new Types.ObjectId(id)) },
        })
            .session(session ?? null)
            .exec();
        if (quizzes.length === 0) {
            return [];
        }
        for (const quiz of quizzes.filter((item) => item.id)) {
            const { id, ...content } = quiz;
            await this.model.updateOne({ _id: id, lessonId: lessonObjectId, deletedAt: null }, {
                $set: { ...content, timestamp: content.timestamp === undefined ? timestamp : content.timestamp },
            }, { session }).exec();
        }
        const documentsToInsert = quizzes.filter((quiz) => !quiz.id).map((q) => ({
            lessonId: lessonObjectId,
            timestamp: q.timestamp === undefined ? timestamp : q.timestamp,
            order: q.order,
            question: q.question,
            questionType: q.questionType,
            options: q.options,
            explanation: q.explanation || null,
            explanationTimestamp: q.explanationTimestamp ?? null,
            deletedAt: null,
        }));
        if (documentsToInsert.length > 0)
            await this.model.insertMany(documentsToInsert, { session });
        if (quizzes.some((quiz) => quiz.timestamp !== undefined && quiz.timestamp !== timestamp)) {
            return this.findByLessonId(lessonId, session);
        }
        return this.findByLessonIdAndTimestamp(lessonId, timestamp, session);
    }
    async deleteQuizzesAtTimestampRange(lessonId, timestamp, rangeSeconds = 2, session) {
        const lessonObjectId = Types.ObjectId.isValid(lessonId)
            ? new Types.ObjectId(lessonId)
            : lessonId;
        const minTs = Math.max(0, timestamp - rangeSeconds);
        const maxTs = timestamp + rangeSeconds;
        const res = await this.model
            .deleteMany({
            lessonId: lessonObjectId,
            timestamp: { $gte: minTs, $lte: maxTs },
            deletedAt: null,
        })
            .session(session ?? null)
            .exec();
        return res.deletedCount || 0;
    }
    async replaceAllQuizzesForLesson(lessonId, quizzes, session) {
        if (!session) {
            return this.withTransaction((transaction) => this.replaceAllQuizzesForLesson(lessonId, quizzes, transaction));
        }
        const lessonObjectId = Types.ObjectId.isValid(lessonId)
            ? new Types.ObjectId(lessonId)
            : lessonId;
        await this.model
            .deleteMany({
            lessonId: lessonObjectId,
            deletedAt: null,
        })
            .session(session ?? null)
            .exec();
        if (quizzes.length === 0) {
            return [];
        }
        const documentsToInsert = quizzes.map((q) => ({
            lessonId: lessonObjectId,
            timestamp: q.timestamp,
            order: q.order,
            question: q.question,
            questionType: q.questionType,
            options: q.options,
            explanation: q.explanation || null,
            explanationTimestamp: q.explanationTimestamp ?? null,
            deletedAt: null,
        }));
        const insertedDocs = await this.model.insertMany(documentsToInsert, {
            session: session ?? undefined,
        });
        return insertedDocs.map((d) => this.toDomain(d));
    }
    async moveOrMergeCluster(lessonId, sourceTimestamp, targetTimestamp, rangeSeconds = 2, session) {
        const lessonObjectId = Types.ObjectId.isValid(lessonId)
            ? new Types.ObjectId(lessonId)
            : lessonId;
        const sourceMin = Math.max(0, sourceTimestamp - rangeSeconds);
        const sourceMax = sourceTimestamp + rangeSeconds;
        const sourceDocs = await this.model
            .find({
            lessonId: lessonObjectId,
            timestamp: { $gte: sourceMin, $lte: sourceMax },
            deletedAt: null,
        })
            .sort({ order: 1 })
            .session(session ?? null)
            .exec();
        if (sourceDocs.length === 0) {
            return this.findByLessonId(lessonId, session);
        }
        const sourceIds = sourceDocs.map((doc) => doc._id);
        const targetMin = Math.max(0, targetTimestamp - rangeSeconds);
        const targetMax = targetTimestamp + rangeSeconds;
        const targetDocs = await this.model
            .find({
            lessonId: lessonObjectId,
            _id: { $nin: sourceIds },
            timestamp: { $gte: targetMin, $lte: targetMax },
            deletedAt: null,
        })
            .sort({ order: 1 })
            .session(session ?? null)
            .exec();
        const isMerge = targetDocs.length > 0;
        const finalTargetTimestamp = isMerge
            ? targetDocs[0].timestamp
            : Math.round(targetTimestamp);
        if (isMerge) {
            const maxTargetOrder = targetDocs.reduce((max, doc) => Math.max(max, doc.order || 0), 0);
            for (let i = 0; i < sourceDocs.length; i++) {
                await this.model
                    .updateOne({ _id: sourceDocs[i]._id }, {
                    $set: {
                        timestamp: finalTargetTimestamp,
                        order: maxTargetOrder + i + 1,
                    },
                })
                    .session(session ?? null)
                    .exec();
            }
        }
        else {
            for (let i = 0; i < sourceDocs.length; i++) {
                await this.model
                    .updateOne({ _id: sourceDocs[i]._id }, {
                    $set: {
                        timestamp: finalTargetTimestamp,
                        order: i + 1,
                    },
                })
                    .session(session ?? null)
                    .exec();
            }
        }
        return this.findByLessonId(lessonId, session);
    }
};
LessonQuizRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(LessonQuizEntity.name)),
    __metadata("design:paramtypes", [Model])
], LessonQuizRepository);
export { LessonQuizRepository };
//# sourceMappingURL=lesson-quiz.repository.js.map