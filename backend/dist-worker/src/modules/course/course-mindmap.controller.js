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
import { Controller, Get, Put, Body, Param, } from '@nestjs/common';
import { RoleEnum } from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Public } from '../auth/decorators/public.decorator.js';
import { CourseMindmapService } from './services/course-mindmap.service.js';
import { UpsertCourseMindmapDto } from './dto/upsert-course-mindmap.dto.js';
let CourseMindmapController = class CourseMindmapController {
    courseMindmapService;
    constructor(courseMindmapService) {
        this.courseMindmapService = courseMindmapService;
    }
    async getMindmap(courseId) {
        const mindmapData = await this.courseMindmapService.getMindmapByCourseId(courseId);
        return ApiResponse.success(mindmapData, 'Lấy sơ đồ tư duy khóa học thành công');
    }
    async upsertMindmap(courseId, userId, role, dto) {
        const result = await this.courseMindmapService.upsertMindmap(courseId, dto.mindmapData, userId, role);
        return ApiResponse.success(result, 'Cập nhật sơ đồ tư duy khóa học thành công');
    }
};
__decorate([
    Get(':courseId/mindmap'),
    Public(),
    __param(0, Param('courseId', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CourseMindmapController.prototype, "getMindmap", null);
__decorate([
    Put(':courseId/mindmap'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __param(0, Param('courseId', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, CurrentUser('role')),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, UpsertCourseMindmapDto]),
    __metadata("design:returntype", Promise)
], CourseMindmapController.prototype, "upsertMindmap", null);
CourseMindmapController = __decorate([
    Controller('courses'),
    __metadata("design:paramtypes", [CourseMindmapService])
], CourseMindmapController);
export { CourseMindmapController };
//# sourceMappingURL=course-mindmap.controller.js.map