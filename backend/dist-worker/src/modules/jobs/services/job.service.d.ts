import { Logger } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ClientSession } from 'mongoose';
import { IJob, JobTypeEnum } from 'share-lib';
import { BaseService } from '../../base/services/base.service.js';
import { JobRepository } from '../repositories/job.repository.js';
export interface CreateJobParams {
    type: JobTypeEnum;
    lessonId: string;
    courseId: string;
    requestedById: string;
    correlationId?: string;
    idempotencyKey?: string | null;
    parameters?: Record<string, unknown>;
    inputRevision?: number;
    targetRevision?: number;
}
export interface FailJobParams {
    errorCode: string;
    errorMessage: string;
    retryable?: boolean;
    retryDelayMs?: number;
}
export declare class JobService extends BaseService<IJob, string> {
    private readonly jobRepository;
    protected readonly logger: Logger;
    constructor(jobRepository: JobRepository, cls: ClsService);
    createJob(params: CreateJobParams, session?: ClientSession): Promise<IJob>;
    claimJob(jobId: string, dispatchSequence: number, workerId: string, leaseDurationMs?: number): Promise<{
        job: IJob;
        leaseToken: string;
    } | null>;
    renewLease(jobId: string, leaseToken: string, extendMs?: number): Promise<boolean>;
    completeJob(jobId: string, leaseToken: string, resultRef?: Record<string, unknown>, session?: ClientSession): Promise<IJob>;
    failJob(jobId: string, leaseToken: string, params: FailJobParams, session?: ClientSession): Promise<IJob>;
    retryManual(jobId: string, requestedById: string): Promise<IJob>;
    getRecentJobsByLesson(lessonId: string, limit?: number): Promise<IJob[]>;
    getJobById(jobId: string): Promise<IJob>;
    private computeHash;
}
