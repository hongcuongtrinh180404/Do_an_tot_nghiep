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
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { RoleEnum } from 'share-lib';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { CompleteLessonVideoDto, SubmitLessonQuizAnswerDto } from './dto/lesson-completion.dto.js';
import { LessonCompletionService } from './services/lesson-completion.service.js';
let LessonCompletionController = class LessonCompletionController {
    service;
    constructor(service) {
        this.service = service;
    }
    async getLessons(userId, courseId) {
        return ApiResponse.success(await this.service.getLessons(userId, courseId));
    }
    async getLesson(userId, courseId, lessonId) {
        return ApiResponse.success(await this.service.getLesson(userId, courseId, lessonId));
    }
    async submitAnswer(userId, courseId, lessonId, dto) {
        return ApiResponse.success(await this.service.submitAnswer(userId, courseId, lessonId, dto));
    }
    async videoEnded(userId, courseId, lessonId, dto) {
        return ApiResponse.success(await this.service.videoEnded(userId, courseId, lessonId, dto));
    }
};
__decorate([
    Get(),
    __param(0, CurrentUser('id')),
    __param(1, Param('courseId', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LessonCompletionController.prototype, "getLessons", null);
__decorate([
    Get(':lessonId'),
    __param(0, CurrentUser('id')),
    __param(1, Param('courseId', ParseObjectIdPipe)),
    __param(2, Param('lessonId', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LessonCompletionController.prototype, "getLesson", null);
__decorate([
    Post(':lessonId/quiz-answers'),
    HttpCode(HttpStatus.OK),
    __param(0, CurrentUser('id')),
    __param(1, Param('courseId', ParseObjectIdPipe)),
    __param(2, Param('lessonId', ParseObjectIdPipe)),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, SubmitLessonQuizAnswerDto]),
    __metadata("design:returntype", Promise)
], LessonCompletionController.prototype, "submitAnswer", null);
__decorate([
    Post(':lessonId/video-ended'),
    HttpCode(HttpStatus.OK),
    __param(0, CurrentUser('id')),
    __param(1, Param('courseId', ParseObjectIdPipe)),
    __param(2, Param('lessonId', ParseObjectIdPipe)),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, CompleteLessonVideoDto]),
    __metadata("design:returntype", Promise)
], LessonCompletionController.prototype, "videoEnded", null);
LessonCompletionController = __decorate([
    Controller('learning-progress/courses/:courseId/lessons'),
    Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __metadata("design:paramtypes", [LessonCompletionService])
], LessonCompletionController);
export { LessonCompletionController };
//# sourceMappingURL=lesson-completion.controller.js.map