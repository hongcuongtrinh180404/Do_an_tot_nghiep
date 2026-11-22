import { Model, ClientSession } from 'mongoose';
import { IJob, JobTypeEnum } from 'share-lib';
import { BaseMongoRepository } from '../../base/repositories/base.mongo.repository.js';
import { Job } from '../schemas/job.schema.js';
export declare class JobRepository extends BaseMongoRepository<IJob, Job, string> {
    private readonly jobModel;
    constructor(jobModel: Model<Job>);
    findActiveByLessonAndType(lessonId: string, type: JobTypeEnum, session?: ClientSession): Promise<IJob | null>;
    findByIdempotencyKey(idempotencyKey: string, session?: ClientSession): Promise<IJob | null>;
    findRecentJobsByLesson(lessonId: string, limit?: number, session?: ClientSession): Promise<IJob[]>;
    findPendingDispatches(limit?: number, now?: Date, session?: ClientSession): Promise<IJob[]>;
    markDispatched(jobId: string, dispatchSequence: number, session?: ClientSession): Promise<boolean>;
    claimJobAtomic(jobId: string, dispatchSequence: number, workerId: string, leaseToken: string, leaseDurationMs: number, now?: Date): Promise<IJob | null>;
    renewLeaseAtomic(jobId: string, leaseToken: string, extendMs: number, now?: Date): Promise<boolean>;
    findExpiredLeases(now?: Date, limit?: number, session?: ClientSession): Promise<IJob[]>;
}
