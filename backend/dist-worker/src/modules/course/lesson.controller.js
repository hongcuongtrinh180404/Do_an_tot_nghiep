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
import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus, UseGuards, } from '@nestjs/common';
import { RoleEnum } from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { LessonService } from './services/lesson.service.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { LessonManagementGuard } from './guards/lesson-management.guard.js';
let LessonController = class LessonController {
    lessonService;
    constructor(lessonService) {
        this.lessonService = lessonService;
    }
    async createLesson(sectionId, userId, dto) {
        const lesson = await this.lessonService.createLesson(sectionId, {
            title: dto.title,
            order: dto.order,
            content: dto.content,
            isPreview: dto.isPreview ?? false,
            userId,
        });
        return ApiResponse.success(lesson, 'Tạo bài học thành công');
    }
    async getLessons(sectionId) {
        const lessons = await this.lessonService.getLessonsBySectionId(sectionId);
        return ApiResponse.success(lessons, 'Lấy danh sách bài học thành công');
    }
};
__decorate([
    Post(':sectionId/lessons'),
    HttpCode(HttpStatus.CREATED),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    __param(0, Param('sectionId', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, CreateLessonDto]),
    __metadata("design:returntype", Promise)
], LessonController.prototype, "createLesson", null);
__decorate([
    Get(':sectionId/lessons'),
    Public(),
    __param(0, Param('sectionId', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LessonController.prototype, "getLessons", null);
LessonController = __decorate([
    Controller('sections'),
    __metadata("design:paramtypes", [LessonService])
], LessonController);
export { LessonController };
//# sourceMappingURL=lesson.controller.js.map