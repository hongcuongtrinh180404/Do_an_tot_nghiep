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
import { JobStatusEnum, JobPhaseEnum, } from 'share-lib';
import { BaseMongoRepository } from '../../base/repositories/base.mongo.repository.js';
import { Job } from '../schemas/job.schema.js';
let JobRepository = class JobRepository extends BaseMongoRepository {
    jobModel;
    constructor(jobModel) {
        super(jobModel);
        this.jobModel = jobModel;
    }
    async findActiveByLessonAndType(lessonId, type, session) {
        const doc = await this.jobModel
            .findOne({
            lessonId,
            type,
            active: true,
            deletedAt: null,
        })
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async findByIdempotencyKey(idempotencyKey, session) {
        const doc = await this.jobModel
            .findOne({
            idempotencyKey,
            deletedAt: null,
        })
            .session(session ?? null)
            .exec();
        return doc ? this.toDomain(doc) : null;
    }
    async findRecentJobsByLesson(lessonId, limit = 10, session) {
        const docs = await this.jobModel
            .find({
            lessonId,
            deletedAt: null,
        })
            .sort({ createdAt: -1 })
            .limit(limit)
            .session(session ?? null)
            .exec();
        return docs.map((d) => this.toDomain(d));
    }
    async findPendingDispatches(limit = 10, now = new Date(), session) {
        const docs = await this.jobModel
            .find({
            status: JobStatusEnum.QUEUED,
            dispatchState: 'pending',
            deletedAt: null,
            $or: [
                { nextRunAt: null },
                { nextRunAt: { $lte: now } },
            ],
        })
            .sort({ createdAt: 1 })
            .limit(limit)
            .session(session ?? null)
            .exec();
        return docs.map((d) => this.toDomain(d));
    }
    async markDispatched(jobId, dispatchSequence, session) {
        const res = await this.jobModel
            .updateOne({
            _id: jobId,
            dispatchSequence,
        }, {
            $set: {
                dispatchState: 'published',
                publishedAt: new Date(),
                phase: JobPhaseEnum.WAITING_WORKER,
            },
        }, { session })
            .exec();
        return res.modifiedCount > 0;
    }
    async claimJobAtomic(jobId, dispatchSequence, workerId, leaseToken, leaseDurationMs, now = new Date()) {
        const leaseExpiresAt = new Date(now.getTime() + leaseDurationMs);
        const updatedDoc = await this.jobModel
            .findOneAndUpdate({
            _id: jobId,
            status: JobStatusEnum.QUEUED,
            dispatchSequence,
            deletedAt: null,
            $and: [
                {
                    $or: [
                        { nextRunAt: null },
                        { nextRunAt: { $lte: now } },
                    ],
                },
                {
                    $or: [
                        { leaseExpiresAt: null },
                        { leaseExpiresAt: { $lte: now } },
                    ],
                },
            ],
        }, {
            $set: {
                status: JobStatusEnum.PROCESSING,
                phase: JobPhaseEnum.CALLING_AI,
                workerId,
                leaseToken,
                leaseExpiresAt,
                heartbeatAt: now,
                startedAt: now,
            },
            $inc: { attempts: 1 },
        }, { new: true })
            .exec();
        return updatedDoc ? this.toDomain(updatedDoc) : null;
    }
    async renewLeaseAtomic(jobId, leaseToken, extendMs, now = new Date()) {
        const newExpiresAt = new Date(now.getTime() + extendMs);
        const res = await this.jobModel
            .updateOne({
            _id: jobId,
            leaseToken,
            status: JobStatusEnum.PROCESSING,
        }, {
            $set: {
                leaseExpiresAt: newExpiresAt,
                heartbeatAt: now,
            },
        })
            .exec();
        return res.modifiedCount > 0;
    }
    async findExpiredLeases(now = new Date(), limit = 10, session) {
        const docs = await this.jobModel
            .find({
            status: JobStatusEnum.PROCESSING,
            active: true,
            deletedAt: null,
            leaseExpiresAt: { $lt: now },
        })
            .sort({ leaseExpiresAt: 1 })
            .limit(limit)
            .session(session ?? null)
            .exec();
        return docs.map((d) => this.toDomain(d));
    }
};
JobRepository = __decorate([
    Injectable(),
    __param(0, InjectModel(Job.name)),
    __metadata("design:paramtypes", [Model])
], JobRepository);
export { JobRepository };
//# sourceMappingURL=job.repository.js.map