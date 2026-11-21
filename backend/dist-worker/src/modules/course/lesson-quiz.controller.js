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
import { Controller, Get, Post, Put, Patch, Delete, Param, Body, UseGuards, } from '@nestjs/common';
import { RoleEnum, hasQuizTimestamp } from 'share-lib';
import { studentQuiz } from './utils/lesson-quiz-version.util.js';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { LessonQuizService } from './services/lesson-quiz.service.js';
import { SyncLessonQuizzesAtTimestampDto } from './dto/sync-lesson-quizzes.dto.js';
import { MoveMergeLessonQuizzesDto } from './dto/move-merge-lesson-quizzes.dto.js';
import { LessonManagementGuard } from './guards/lesson-management.guard.js';
import { LessonAccessGuard } from './guards/lesson-access.guard.js';
import { SaveLessonQuizDto, UpdateQuizTimestampDto } from './dto/save-lesson-quiz.dto.js';
let LessonQuizController = class LessonQuizController {
    lessonQuizService;
    constructor(lessonQuizService) {
        this.lessonQuizService = lessonQuizService;
    }
    async getQuizzes(id) {
        const quizzes = await this.lessonQuizService.getQuizzesByLessonId(id);
        return ApiResponse.success(quizzes.filter(hasQuizTimestamp).map((quiz) => studentQuiz(quiz)), 'Lấy danh sách câu hỏi video thành công');
    }
    async getManagementQuizzes(id) {
        return ApiResponse.success(await this.lessonQuizService.getQuizzesByLessonId(id));
    }
    async createQuiz(id, dto) {
        const quiz = await this.lessonQuizService.createQuiz(id, dto);
        return ApiResponse.success(quiz, 'Thêm câu hỏi video thành công');
    }
    async updateQuiz(quizId, dto) {
        const quiz = await this.lessonQuizService.updateQuiz(quizId, dto);
        return ApiResponse.success(quiz, 'Cập nhật câu hỏi video thành công');
    }
    async syncQuizzes(id, dto) {
        const synced = await this.lessonQuizService.syncQuizzesAtTimestamp(id, dto);
        return ApiResponse.success(synced, 'Đồng bộ câu hỏi video thành công');
    }
    async updateTimestamp(quizId, dto) {
        return ApiResponse.success(await this.lessonQuizService.updateTimestamp(quizId, dto.timestamp));
    }
    async moveOrMergeQuizzes(id, dto) {
        const quizzes = await this.lessonQuizService.moveOrMergeQuizCluster(id, dto);
        return ApiResponse.success(quizzes, 'Cập nhật vị trí câu hỏi video thành công');
    }
    async deleteQuiz(quizId) {
        await this.lessonQuizService.deleteQuiz(quizId);
        return ApiResponse.success({ deleted: true }, 'Xóa câu hỏi video thành công');
    }
    async deleteQuizzesAtTimestamp(id, timestamp) {
        const deletedCount = await this.lessonQuizService.deleteQuizzesAtTimestamp(id, Number(timestamp));
        return ApiResponse.success({ deletedCount }, 'Xóa cụm câu hỏi video thành công');
    }
};
__decorate([
    Get(':id/quizzes'),
    Public(),
    UseGuards(LessonAccessGuard),
    __param(0, Param('id', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LessonQuizController.prototype, "getQuizzes", null);
__decorate([
    Get(':id/quizzes/manage'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    __param(0, Param('id', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LessonQuizController.prototype, "getManagementQuizzes", null);
__decorate([
    Post(':id/quizzes'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, SaveLessonQuizDto]),
    __metadata("design:returntype", Promise)
], LessonQuizController.prototype, "createQuiz", null);
__decorate([
    Put('quizzes/:quizId'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    __param(0, Param('quizId', ParseObjectIdPipe)),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, SaveLessonQuizDto]),
    __metadata("design:returntype", Promise)
], LessonQuizController.prototype, "updateQuiz", null);
__decorate([
    Put(':id/quizzes/sync'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, SyncLessonQuizzesAtTimestampDto]),
    __metadata("design:returntype", Promise)
], LessonQuizController.prototype, "syncQuizzes", null);
__decorate([
    Patch('quizzes/:quizId/timestamp'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    __param(0, Param('quizId', ParseObjectIdPipe)),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateQuizTimestampDto]),
    __metadata("design:returntype", Promise)
], LessonQuizController.prototype, "updateTimestamp", null);
__decorate([
    Put(':id/quizzes/move-merge'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, MoveMergeLessonQuizzesDto]),
    __metadata("design:returntype", Promise)
], LessonQuizController.prototype, "moveOrMergeQuizzes", null);
__decorate([
    Delete('quizzes/:quizId'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    __param(0, Param('quizId', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LessonQuizController.prototype, "deleteQuiz", null);
__decorate([
    Delete(':id/quizzes/timestamp/:timestamp'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, Param('timestamp')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LessonQuizController.prototype, "deleteQuizzesAtTimestamp", null);
LessonQuizController = __decorate([
    Controller('lessons'),
    __metadata("design:paramtypes", [LessonQuizService])
], LessonQuizController);
export { LessonQuizController };
//# sourceMappingURL=lesson-quiz.controller.js.map