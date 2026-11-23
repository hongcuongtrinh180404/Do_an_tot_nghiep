import { IUserProfile, IJob } from 'share-lib';
import { JobService } from '../../jobs/services/job.service.js';
import { JobManagementPolicy } from '../policies/job-management.policy.js';
import { GenerateSummaryDto } from '../dto/generate-summary.dto.js';
import { GenerateQuizDto } from '../dto/generate-quiz.dto.js';
import { GenerateMindmapDto } from '../dto/generate-mindmap.dto.js';
export interface EnqueueSummaryJobParams {
    lessonId: string;
    dto?: GenerateSummaryDto;
    idempotencyKey?: string | null;
    userId: string;
}
export interface EnqueueQuizJobParams {
    lessonId: string;
    dto?: GenerateQuizDto;
    idempotencyKey?: string | null;
    userId: string;
}
export interface EnqueueMindmapJobParams {
    lessonId: string;
    dto?: GenerateMindmapDto;
    idempotencyKey?: string | null;
    userId: string;
}
export declare class AnalysisJobService {
    private readonly jobService;
    private readonly jobManagementPolicy;
    constructor(jobService: JobService, jobManagementPolicy: JobManagementPolicy);
    enqueueSummaryJob(params: EnqueueSummaryJobParams): Promise<IJob>;
    enqueueQuizJob(params: EnqueueQuizJobParams): Promise<IJob>;
    enqueueMindmapJob(params: EnqueueMindmapJobParams): Promise<IJob>;
    getRecentJobs(lessonId: string, user: Pick<IUserProfile, 'id' | 'role'>, limit?: number): Promise<IJob[]>;
    getJobById(lessonId: string, jobId: string, user: Pick<IUserProfile, 'id' | 'role'>): Promise<IJob>;
    retryJob(lessonId: string, jobId: string, user: Pick<IUserProfile, 'id' | 'role'>): Promise<IJob>;
}
