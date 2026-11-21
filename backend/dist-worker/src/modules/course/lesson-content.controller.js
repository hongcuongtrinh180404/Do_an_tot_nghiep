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
import { Controller, Post, Get, Query, UseInterceptors, UploadedFile, HttpCode, HttpStatus, BadRequestException, } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RoleEnum } from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { StorageService } from '../storage/index.js';
import { LessonService } from './services/lesson.service.js';
import { LessonFileValidationPipe } from './pipes/lesson-file-validation.pipe.js';
let LessonContentController = class LessonContentController {
    storageService;
    lessonService;
    constructor(storageService, lessonService) {
        this.storageService = storageService;
        this.lessonService = lessonService;
    }
    async uploadContent(file) {
        const lessonContent = await this.storageService.uploadLessonMedia(file, 'courses/lessons');
        return ApiResponse.success(lessonContent, 'Tải lên nội dung bài học thành công');
    }
    async getStreamUrl(key, userId, userRole) {
        const trimmedKey = typeof key === 'string' ? key.trim() : '';
        if (!trimmedKey) {
            throw new BadRequestException('Khóa file (key) không được để trống');
        }
        const streamUrl = await this.lessonService.getAuthorizedStreamUrl(trimmedKey, userId, userRole);
        return ApiResponse.success({ url: streamUrl }, 'Tạo đường dẫn phát video thành công');
    }
};
__decorate([
    Post('upload'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    HttpCode(HttpStatus.OK),
    UseInterceptors(FileInterceptor('file')),
    __param(0, UploadedFile(LessonFileValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LessonContentController.prototype, "uploadContent", null);
__decorate([
    Get('stream-url'),
    Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    HttpCode(HttpStatus.OK),
    __param(0, Query('key')),
    __param(1, CurrentUser('id')),
    __param(2, CurrentUser('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LessonContentController.prototype, "getStreamUrl", null);
LessonContentController = __decorate([
    Controller('lesson-content'),
    __metadata("design:paramtypes", [StorageService,
        LessonService])
], LessonContentController);
export { LessonContentController };
//# sourceMappingURL=lesson-content.controller.js.map