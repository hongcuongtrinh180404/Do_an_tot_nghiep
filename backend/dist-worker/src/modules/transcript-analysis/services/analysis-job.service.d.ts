import { IUserProfile, IJob } from 'share-lib';
import { JobService } from '../../jobs/services/job.service.js';
import { JobManagementPolicy } from '../policies/job-management.policy.js';
export declare class AnalysisJobService {
    private readonly jobService;
    private readonly jobManagementPolicy;
    constructor(jobService: JobService, jobManagementPolicy: JobManagementPolicy);
    getRecentJobs(lessonId: string, user: Pick<IUserProfile, 'id' | 'role'>, limit?: number): Promise<IJob[]>;
    getJobById(lessonId: string, jobId: string, user: Pick<IUserProfile, 'id' | 'role'>): Promise<IJob>;
    retryJob(lessonId: string, jobId: string, user: Pick<IUserProfile, 'id' | 'role'>): Promise<IJob>;
}
