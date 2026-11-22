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
import { Controller, Get, Post, Param, Query, HttpCode, HttpStatus, } from '@nestjs/common';
import { RoleEnum } from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { AnalysisJobService } from './services/analysis-job.service.js';
let AnalysisJobsController = class AnalysisJobsController {
    analysisJobService;
    constructor(analysisJobService) {
        this.analysisJobService = analysisJobService;
    }
    async getLessonJobs(lessonId, user, limit) {
        const jobs = await this.analysisJobService.getRecentJobs(lessonId, user, limit ? Number(limit) : 10);
        return ApiResponse.success(jobs, 'Lấy danh sách tác vụ thành công');
    }
    async getJobDetail(lessonId, jobId, user) {
        const job = await this.analysisJobService.getJobById(lessonId, jobId, user);
        return ApiResponse.success(job, 'Lấy thông tin tác vụ thành công');
    }
    async retryJob(lessonId, jobId, user) {
        const newJob = await this.analysisJobService.retryJob(lessonId, jobId, user);
        return ApiResponse.success(newJob, 'Đã tiếp nhận yêu cầu thử lại tác vụ');
    }
};
__decorate([
    Get(':id/analysis/jobs'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser()),
    __param(2, Query('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Number]),
    __metadata("design:returntype", Promise)
], AnalysisJobsController.prototype, "getLessonJobs", null);
__decorate([
    Get(':id/analysis/jobs/:jobId'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, Param('jobId', ParseObjectIdPipe)),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AnalysisJobsController.prototype, "getJobDetail", null);
__decorate([
    Post(':id/analysis/jobs/:jobId/retry'),
    HttpCode(HttpStatus.ACCEPTED),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, Param('jobId', ParseObjectIdPipe)),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AnalysisJobsController.prototype, "retryJob", null);
AnalysisJobsController = __decorate([
    Controller('lessons'),
    __metadata("design:paramtypes", [AnalysisJobService])
], AnalysisJobsController);
export { AnalysisJobsController };
//# sourceMappingURL=analysis-jobs.controller.js.map