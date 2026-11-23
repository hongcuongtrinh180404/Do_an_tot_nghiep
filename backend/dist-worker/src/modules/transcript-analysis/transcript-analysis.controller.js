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
import { Controller, Post, Get, Put, Param, Body, HttpCode, HttpStatus, UseGuards, Headers, Res, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoleEnum, JobTypeEnum, } from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { LessonManagementGuard } from '../course/guards/lesson-management.guard.js';
import { MindmapAnalysisService, } from './services/mindmap-analysis.service.js';
import { QuizGenerationService, } from './services/quiz-generation.service.js';
import { SummaryGenerationService, } from './services/summary-generation.service.js';
import { AnalysisJobService } from './services/analysis-job.service.js';
import { GenerateMindmapDto } from './dto/generate-mindmap.dto.js';
import { UpdateLessonMindmapDto } from './dto/update-mindmap.dto.js';
import { GenerateQuizDto } from './dto/generate-quiz.dto.js';
import { GenerateSummaryDto } from './dto/generate-summary.dto.js';
import { UpdateLessonSummaryDto } from './dto/update-summary.dto.js';
import { LessonAccessGuard } from '../course/guards/lesson-access.guard.js';
let TranscriptAnalysisController = class TranscriptAnalysisController {
    mindmapAnalysisService;
    quizGenerationService;
    summaryGenerationService;
    analysisJobService;
    configService;
    constructor(mindmapAnalysisService, quizGenerationService, summaryGenerationService, analysisJobService, configService) {
        this.mindmapAnalysisService = mindmapAnalysisService;
        this.quizGenerationService = quizGenerationService;
        this.summaryGenerationService = summaryGenerationService;
        this.analysisJobService = analysisJobService;
        this.configService = configService;
    }
    isAsyncEnabled(type) {
        const raw = this.configService.get('AI_ASYNC_TYPES', '');
        if (!raw)
            return false;
        const types = raw.split(',').map((t) => t.trim().toLowerCase());
        return types.includes(type.toLowerCase());
    }
    async generateMindmap(id, dto, userId, idempotencyKey, res) {
        if (this.isAsyncEnabled(JobTypeEnum.MINDMAP)) {
            if (res) {
                res.status(HttpStatus.ACCEPTED);
            }
            const job = await this.analysisJobService.enqueueMindmapJob({
                lessonId: id,
                dto,
                idempotencyKey,
                userId: userId || 'SYSTEM',
            });
            return ApiResponse.success({
                jobId: job.id,
                lessonId: job.lessonId,
                type: job.type,
                status: job.status,
                phase: job.phase,
                statusUrl: `/api/v1/lessons/${id}/analysis/jobs/${job.id}`,
            }, 'Đã tiếp nhận yêu cầu tạo sơ đồ tư duy bài học');
        }
        const result = await this.mindmapAnalysisService.generateMindmap(id, dto, userId);
        return ApiResponse.success(result, 'Phân tích và tạo sơ đồ tư duy thành công');
    }
    async getMindmap(id) {
        const mindmap = await this.mindmapAnalysisService.getMindmap(id);
        return ApiResponse.success(mindmap, 'Lấy sơ đồ tư duy bài học thành công');
    }
    async updateMindmap(id, dto, userId) {
        const updated = await this.mindmapAnalysisService.updateMindmap(id, dto, userId);
        return ApiResponse.success(updated, 'Cập nhật sơ đồ tư duy bài học thành công');
    }
    async applyDraftMindmap(id, userId) {
        const applied = await this.mindmapAnalysisService.applyDraft(id, userId);
        return ApiResponse.success(applied, 'Áp dụng sơ đồ tư duy chính thức cho bài học thành công');
    }
    async generateQuiz(id, dto, userId, idempotencyKey, res) {
        if (this.isAsyncEnabled(JobTypeEnum.QUIZ)) {
            if (res) {
                res.status(HttpStatus.ACCEPTED);
            }
            const job = await this.analysisJobService.enqueueQuizJob({
                lessonId: id,
                dto,
                idempotencyKey,
                userId: userId || 'SYSTEM',
            });
            return ApiResponse.success({
                jobId: job.id,
                lessonId: job.lessonId,
                type: job.type,
                status: job.status,
                phase: job.phase,
                statusUrl: `/api/v1/lessons/${id}/analysis/jobs/${job.id}`,
            }, 'Đã tiếp nhận yêu cầu tạo bộ câu hỏi trắc nghiệm bài học');
        }
        const result = await this.quizGenerationService.generateQuiz(id, dto, userId);
        return ApiResponse.success(result, 'Phân tích và tạo câu hỏi trắc nghiệm thành công');
    }
    async getQuizDraft(id) {
        const draft = await this.quizGenerationService.getQuizDraft(id);
        return ApiResponse.success(draft, 'Lấy bản nháp câu hỏi trắc nghiệm thành công');
    }
    async applyDraftQuiz(id, userId) {
        const applied = await this.quizGenerationService.applyDraft(id, userId);
        return ApiResponse.success(applied, 'Áp dụng bộ câu hỏi trắc nghiệm chính thức cho bài học thành công');
    }
    async generateSummary(id, dto, userId, idempotencyKey, res) {
        if (this.isAsyncEnabled(JobTypeEnum.SUMMARY)) {
            if (res) {
                res.status(HttpStatus.ACCEPTED);
            }
            const job = await this.analysisJobService.enqueueSummaryJob({
                lessonId: id,
                dto,
                idempotencyKey,
                userId: userId || 'SYSTEM',
            });
            return ApiResponse.success({
                jobId: job.id,
                lessonId: job.lessonId,
                type: job.type,
                status: job.status,
                phase: job.phase,
                statusUrl: `/api/v1/lessons/${id}/analysis/jobs/${job.id}`,
            }, 'Đã tiếp nhận yêu cầu tạo tóm tắt bài học');
        }
        const result = await this.summaryGenerationService.generateSummary(id, dto, userId);
        return ApiResponse.success(result, 'Phân tích và tạo bản tóm tắt bài học thành công');
    }
    async getSummary(id) {
        const summary = await this.summaryGenerationService.getSummary(id);
        return ApiResponse.success(summary, 'Lấy bản tóm tắt bài học thành công');
    }
    async updateSummary(id, dto, userId) {
        const updated = await this.summaryGenerationService.updateSummary(id, dto, userId);
        return ApiResponse.success(updated, 'Cập nhật bản tóm tắt bài học thành công');
    }
    async applyDraftSummary(id, userId) {
        const applied = await this.summaryGenerationService.applyDraft(id, userId);
        return ApiResponse.success(applied, 'Áp dụng bản tóm tắt chính thức cho bài học thành công');
    }
};
__decorate([
    Post(':id/analysis/mindmap'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, Body()),
    __param(2, CurrentUser('id')),
    __param(3, Headers('idempotency-key')),
    __param(4, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, GenerateMindmapDto, String, String, Object]),
    __metadata("design:returntype", Promise)
], TranscriptAnalysisController.prototype, "generateMindmap", null);
__decorate([
    Get(':id/analysis/mindmap'),
    Public(),
    UseGuards(LessonAccessGuard),
    __param(0, Param('id', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TranscriptAnalysisController.prototype, "getMindmap", null);
__decorate([
    Put(':id/analysis/mindmap'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    HttpCode(HttpStatus.OK),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, Body()),
    __param(2, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateLessonMindmapDto, String]),
    __metadata("design:returntype", Promise)
], TranscriptAnalysisController.prototype, "updateMindmap", null);
__decorate([
    Post(':id/analysis/mindmap/apply'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    HttpCode(HttpStatus.OK),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TranscriptAnalysisController.prototype, "applyDraftMindmap", null);
__decorate([
    Post(':id/analysis/quiz'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, Body()),
    __param(2, CurrentUser('id')),
    __param(3, Headers('idempotency-key')),
    __param(4, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, GenerateQuizDto, String, String, Object]),
    __metadata("design:returntype", Promise)
], TranscriptAnalysisController.prototype, "generateQuiz", null);
__decorate([
    Get(':id/analysis/quiz'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, Param('id', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TranscriptAnalysisController.prototype, "getQuizDraft", null);
__decorate([
    Post(':id/analysis/quiz/apply'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    HttpCode(HttpStatus.OK),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TranscriptAnalysisController.prototype, "applyDraftQuiz", null);
__decorate([
    Post(':id/analysis/summary'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, Body()),
    __param(2, CurrentUser('id')),
    __param(3, Headers('idempotency-key')),
    __param(4, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, GenerateSummaryDto, String, String, Object]),
    __metadata("design:returntype", Promise)
], TranscriptAnalysisController.prototype, "generateSummary", null);
__decorate([
    Get(':id/analysis/summary'),
    Public(),
    UseGuards(LessonAccessGuard),
    __param(0, Param('id', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TranscriptAnalysisController.prototype, "getSummary", null);
__decorate([
    Put(':id/analysis/summary'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    HttpCode(HttpStatus.OK),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, Body()),
    __param(2, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateLessonSummaryDto, String]),
    __metadata("design:returntype", Promise)
], TranscriptAnalysisController.prototype, "updateSummary", null);
__decorate([
    Post(':id/analysis/summary/apply'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    HttpCode(HttpStatus.OK),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TranscriptAnalysisController.prototype, "applyDraftSummary", null);
TranscriptAnalysisController = __decorate([
    Controller('lessons'),
    __metadata("design:paramtypes", [MindmapAnalysisService,
        QuizGenerationService,
        SummaryGenerationService,
        AnalysisJobService,
        ConfigService])
], TranscriptAnalysisController);
export { TranscriptAnalysisController };
//# sourceMappingURL=transcript-analysis.controller.js.map