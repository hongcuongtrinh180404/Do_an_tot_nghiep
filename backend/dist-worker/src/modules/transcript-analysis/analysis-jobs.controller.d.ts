import { type IUserProfile, IJob } from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { AnalysisJobService } from './services/analysis-job.service.js';
export declare class AnalysisJobsController {
    private readonly analysisJobService;
    constructor(analysisJobService: AnalysisJobService);
    getLessonJobs(lessonId: string, user: Pick<IUserProfile, 'id' | 'role'>, limit?: number): Promise<ApiResponse<IJob[]>>;
    getJobDetail(lessonId: string, jobId: string, user: Pick<IUserProfile, 'id' | 'role'>): Promise<ApiResponse<IJob>>;
    retryJob(lessonId: string, jobId: string, user: Pick<IUserProfile, 'id' | 'role'>): Promise<ApiResponse<IJob>>;
}
