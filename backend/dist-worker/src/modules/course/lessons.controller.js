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
import { Controller, Get, Post, Patch, Delete, Param, Body, UseInterceptors, UseGuards, UploadedFile, HttpCode, HttpStatus, } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleEnum } from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { LessonService } from './services/lesson.service.js';
import { LessonTranscriptService } from './services/lesson-transcript.service.js';
import { LessonFileValidationPipe } from './pipes/lesson-file-validation.pipe.js';
import { LessonManagementGuard } from './guards/lesson-management.guard.js';
import { LessonAccessGuard } from './guards/lesson-access.guard.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';
let LessonsController = class LessonsController {
    lessonService;
    lessonTranscriptService;
    constructor(lessonService, lessonTranscriptService) {
        this.lessonService = lessonService;
        this.lessonTranscriptService = lessonTranscriptService;
    }
    async getLessonDetail(id, userId, userRole) {
        const lesson = await this.lessonService.getLessonForUser(id, userId, userRole);
        return ApiResponse.success(lesson, 'Lấy thông tin bài học thành công');
    }
    async updateLesson(id, dto, userId, userRole) {
        const updatedLesson = await this.lessonService.updateLesson(id, dto, userId, userRole);
        return ApiResponse.success(updatedLesson, 'Cập nhật bài học thành công');
    }
    async uploadMaterial(id, file, title, userId, userRole) {
        const updatedLesson = await this.lessonService.addMaterial(id, file, title, userId, userRole);
        return ApiResponse.success(updatedLesson, 'Đính kèm tài liệu thành công');
    }
    async deleteMaterial(id, materialId, userId, userRole) {
        const updatedLesson = await this.lessonService.deleteMaterial(id, materialId, userId, userRole);
        return ApiResponse.success(updatedLesson, 'Xóa tài liệu thành công');
    }
    async deleteLesson(id, userId, userRole) {
        await this.lessonService.deleteLesson(id, userId, userRole);
        return ApiResponse.success(null, 'Xóa bài học thành công');
    }
    async getLessonTranscript(id) {
        const transcript = await this.lessonTranscriptService.getTranscriptByLessonId(id);
        return ApiResponse.success(transcript, 'Lấy transcript bài học thành công');
    }
    async retryTranscription(id) {
        await this.lessonTranscriptService.retryTranscription(id);
        return ApiResponse.success(null, 'Đã kích hoạt lại tiến trình trích xuất transcript');
    }
};
__decorate([
    Get(':id'),
    Public(),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, CurrentUser('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LessonsController.prototype, "getLessonDetail", null);
__decorate([
    Patch(':id'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    HttpCode(HttpStatus.OK),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, Body()),
    __param(2, CurrentUser('id')),
    __param(3, CurrentUser('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateLessonDto, String, String]),
    __metadata("design:returntype", Promise)
], LessonsController.prototype, "updateLesson", null);
__decorate([
    Post(':id/materials'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    HttpCode(HttpStatus.OK),
    UseInterceptors(FileInterceptor('file')),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, UploadedFile(LessonFileValidationPipe)),
    __param(2, Body('title')),
    __param(3, CurrentUser('id')),
    __param(4, CurrentUser('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], LessonsController.prototype, "uploadMaterial", null);
__decorate([
    Delete(':id/materials/:materialId'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    HttpCode(HttpStatus.OK),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, Param('materialId', ParseObjectIdPipe)),
    __param(2, CurrentUser('id')),
    __param(3, CurrentUser('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], LessonsController.prototype, "deleteMaterial", null);
__decorate([
    Delete(':id'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    HttpCode(HttpStatus.OK),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, CurrentUser('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LessonsController.prototype, "deleteLesson", null);
__decorate([
    Get(':id/transcript'),
    Public(),
    UseGuards(LessonAccessGuard),
    __param(0, Param('id', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LessonsController.prototype, "getLessonTranscript", null);
__decorate([
    Post(':id/transcript/retry'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    UseGuards(LessonManagementGuard),
    HttpCode(HttpStatus.OK),
    __param(0, Param('id', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LessonsController.prototype, "retryTranscription", null);
LessonsController = __decorate([
    Controller('lessons'),
    __metadata("design:paramtypes", [LessonService,
        LessonTranscriptService])
], LessonsController);
export { LessonsController };
//# sourceMappingURL=lessons.controller.js.map