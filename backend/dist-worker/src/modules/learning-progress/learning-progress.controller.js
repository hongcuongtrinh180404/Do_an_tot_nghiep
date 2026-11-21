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
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { PlaybackHeartbeatDto, StartPlaybackSessionDto } from './dto/playback-session.dto.js';
import { LearningProgressService } from './services/learning-progress.service.js';
let LearningProgressController = class LearningProgressController {
    service;
    constructor(service) {
        this.service = service;
    }
    async getMyProgress(userId) {
        return ApiResponse.success(await this.service.getMyProgress(userId));
    }
    async getProgress(userId, courseId) {
        return ApiResponse.success(await this.service.getProgress(userId, courseId));
    }
    async startSession(userId, courseId, dto) {
        return ApiResponse.success(await this.service.startSession(userId, courseId, dto));
    }
    async heartbeat(userId, courseId, dto) {
        return ApiResponse.success(await this.service.heartbeat(userId, courseId, dto));
    }
    async endSession(userId, courseId, dto) {
        return ApiResponse.success(await this.service.heartbeat(userId, courseId, dto, true));
    }
};
__decorate([
    Get('my-courses'),
    __param(0, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LearningProgressController.prototype, "getMyProgress", null);
__decorate([
    Get('courses/:courseId'),
    __param(0, CurrentUser('id')),
    __param(1, Param('courseId', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LearningProgressController.prototype, "getProgress", null);
__decorate([
    Post('courses/:courseId/sessions'),
    HttpCode(HttpStatus.OK),
    __param(0, CurrentUser('id')),
    __param(1, Param('courseId', ParseObjectIdPipe)),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, StartPlaybackSessionDto]),
    __metadata("design:returntype", Promise)
], LearningProgressController.prototype, "startSession", null);
__decorate([
    Post('courses/:courseId/heartbeat'),
    HttpCode(HttpStatus.OK),
    __param(0, CurrentUser('id')),
    __param(1, Param('courseId', ParseObjectIdPipe)),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, PlaybackHeartbeatDto]),
    __metadata("design:returntype", Promise)
], LearningProgressController.prototype, "heartbeat", null);
__decorate([
    Post('courses/:courseId/end'),
    HttpCode(HttpStatus.OK),
    __param(0, CurrentUser('id')),
    __param(1, Param('courseId', ParseObjectIdPipe)),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, PlaybackHeartbeatDto]),
    __metadata("design:returntype", Promise)
], LearningProgressController.prototype, "endSession", null);
LearningProgressController = __decorate([
    Controller('learning-progress'),
    Roles(RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __metadata("design:paramtypes", [LearningProgressService])
], LearningProgressController);
export { LearningProgressController };
//# sourceMappingURL=learning-progress.controller.js.map