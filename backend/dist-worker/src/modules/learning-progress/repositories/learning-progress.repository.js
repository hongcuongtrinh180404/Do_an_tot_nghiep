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
import { LearningProgressEntity } from '../schemas/learning-progress.schema.js';
let LearningProgressRepository = class LearningProgressRepository extends BaseMongoRepository {
    constructor(model) {
        super(model, (doc) => {
            const value = 'toObject' in doc ? doc.toObject() : doc;
            return {
                id: String(value._id),
                userId: String(value.userId),
                courseId: String(value.courseId),
                watchedMs: value.watchedMs,
                lastLessonId: value.lastLessonId ? String(value.lastLessonId) : null,
                lastMediaUrl: value.lastMediaUrl,
                lastPositionSeconds: value.lastPositionSeconds,
                sessionId: value.sessionId,
                sessionLessonId: value.sessionLessonId ? String(value.sessionLessonId) : null,
                sessionMediaUrl: value.sessionMediaUrl,
                sessionExpiresAt: value.sessionExpiresAt,
                lastHeartbeatAt: value.lastHeartbeatAt,
                sessionWatchedMs: value.sessionWatchedMs,
                lastSequence: value.lastSequence,
                sessionClosed: value.sessionClosed,
                revision: value.revision,
                updatedAt: value.updatedAt,
            };
        });
    }
    async ensureExists(userId, courseId) {
        try {
            await this.model.updateOne({ userId, courseId }, { $setOnInsert: { userId, courseId, createdById: userId } }, { upsert: true }).exec();
        }
        catch (error) {
            if (error.code !== 11000)
                throw error;
        }
    }
    findForCourse(userId, courseId) {
        return this.findOne({ userId, courseId });
    }
    async findForCourses(userId, courseIds, maxTimeMS) {
        const query = this.model.find({ userId, courseId: { $in: courseIds }, deletedAt: null });
        if (maxTimeMS)
            query.maxTimeMS(maxTimeMS);
        const docs = await query.exec();
        return docs.map((doc) => this.toDomain(doc));
    }
    async compareAndSet(state, changes) {
        const result = await this.model.updateOne({ _id: state.id, userId: state.userId, courseId: state.courseId, revision: state.revision, deletedAt: null }, { $set: { ...changes, updatedById: state.userId }, $inc: { revision: 1 } }).exec();
        return result.modifiedCount === 1;
    }
};
LearningProgressRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(LearningProgressEntity.name)),
    __metadata("design:paramtypes", [Model])
], LearningProgressRepository);
export { LearningProgressRepository };
//# sourceMappingURL=learning-progress.repository.js.map