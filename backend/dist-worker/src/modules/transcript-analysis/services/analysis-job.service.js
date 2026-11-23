var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, NotFoundException } from '@nestjs/common';
import { RoleEnum, JobTypeEnum } from 'share-lib';
import { JobService } from '../../jobs/services/job.service.js';
import { JobManagementPolicy } from '../policies/job-management.policy.js';
let AnalysisJobService = class AnalysisJobService {
    jobService;
    jobManagementPolicy;
    constructor(jobService, jobManagementPolicy) {
        this.jobService = jobService;
        this.jobManagementPolicy = jobManagementPolicy;
    }
    async enqueueSummaryJob(params) {
        const { lesson, course } = await this.jobManagementPolicy.verifyLessonAccess(params.lessonId, { id: params.userId, role: RoleEnum.INSTRUCTOR }, { allowPendingApproval: false });
        const inputRevision = lesson.analysisInputRevision ?? 0;
        const targetRevision = lesson.analysisOutputRevisions?.summary ?? 0;
        return this.jobService.createJob({
            type: JobTypeEnum.SUMMARY,
            lessonId: params.lessonId,
            courseId: course.id,
            requestedById: params.userId,
            idempotencyKey: params.idempotencyKey || null,
            parameters: (params.dto || {}),
            inputRevision,
            targetRevision,
        });
    }
    async enqueueQuizJob(params) {
        const { lesson, course } = await this.jobManagementPolicy.verifyLessonAccess(params.lessonId, { id: params.userId, role: RoleEnum.INSTRUCTOR }, { allowPendingApproval: false });
        const inputRevision = lesson.analysisInputRevision ?? 0;
        const targetRevision = lesson.analysisOutputRevisions?.quiz ?? 0;
        return this.jobService.createJob({
            type: JobTypeEnum.QUIZ,
            lessonId: params.lessonId,
            courseId: course.id,
            requestedById: params.userId,
            idempotencyKey: params.idempotencyKey || null,
            parameters: (params.dto || {}),
            inputRevision,
            targetRevision,
        });
    }
    async enqueueMindmapJob(params) {
        const { lesson, course } = await this.jobManagementPolicy.verifyLessonAccess(params.lessonId, { id: params.userId, role: RoleEnum.INSTRUCTOR }, { allowPendingApproval: false });
        const inputRevision = lesson.analysisInputRevision ?? 0;
        const targetRevision = lesson.analysisOutputRevisions?.mindmap ?? 0;
        return this.jobService.createJob({
            type: JobTypeEnum.MINDMAP,
            lessonId: params.lessonId,
            courseId: course.id,
            requestedById: params.userId,
            idempotencyKey: params.idempotencyKey || null,
            parameters: (params.dto || {}),
            inputRevision,
            targetRevision,
        });
    }
    async getRecentJobs(lessonId, user, limit = 10) {
        await this.jobManagementPolicy.verifyLessonAccess(lessonId, user, {
            allowPendingApproval: true,
        });
        return this.jobService.getRecentJobsByLesson(lessonId, limit);
    }
    async getJobById(lessonId, jobId, user) {
        await this.jobManagementPolicy.verifyLessonAccess(lessonId, user, {
            allowPendingApproval: true,
        });
        const job = await this.jobService.getJobById(jobId);
        if (job.lessonId !== lessonId) {
            throw new NotFoundException(`Job ${jobId} không thuộc bài học ${lessonId}`);
        }
        return job;
    }
    async retryJob(lessonId, jobId, user) {
        await this.jobManagementPolicy.verifyLessonAccess(lessonId, user, {
            allowPendingApproval: false,
        });
        const job = await this.jobService.getJobById(jobId);
        if (job.lessonId !== lessonId) {
            throw new NotFoundException(`Job ${jobId} không thuộc bài học ${lessonId}`);
        }
        return this.jobService.retryManual(jobId, user.id);
    }
};
AnalysisJobService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [JobService,
        JobManagementPolicy])
], AnalysisJobService);
export { AnalysisJobService };
//# sourceMappingURL=analysis-job.service.js.map