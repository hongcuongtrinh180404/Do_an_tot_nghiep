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
import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { RoleEnum } from 'share-lib';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CourseApprovalService } from './services/course-approval.service.js';
let CourseApprovalController = class CourseApprovalController {
    approvalService;
    constructor(approvalService) {
        this.approvalService = approvalService;
    }
    async getChecklist(id, userId, role) {
        return ApiResponse.success(await this.approvalService.getChecklist(id, userId, role));
    }
    async requestApproval(id, userId, role) {
        return ApiResponse.success(await this.approvalService.requestApproval(id, userId, role), 'Đã gửi yêu cầu phê duyệt khóa học.');
    }
    async cancelApproval(id, userId, role) {
        return ApiResponse.success(await this.approvalService.withdrawApproval(id, userId, role), 'Đã hủy yêu cầu phê duyệt khóa học thành công.');
    }
    async withdrawApproval(id, userId, role) {
        return ApiResponse.success(await this.approvalService.withdrawApproval(id, userId, role), 'Đã rút yêu cầu phê duyệt khóa học thành công.');
    }
};
__decorate([
    Get(':id/approval-checklist'),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, CurrentUser('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CourseApprovalController.prototype, "getChecklist", null);
__decorate([
    Post(':id/request-approval'),
    HttpCode(HttpStatus.OK),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, CurrentUser('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CourseApprovalController.prototype, "requestApproval", null);
__decorate([
    Post(':id/cancel-approval'),
    HttpCode(HttpStatus.OK),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, CurrentUser('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CourseApprovalController.prototype, "cancelApproval", null);
__decorate([
    Post(':id/withdraw-approval'),
    HttpCode(HttpStatus.OK),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, CurrentUser('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CourseApprovalController.prototype, "withdrawApproval", null);
CourseApprovalController = __decorate([
    Controller('courses'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __metadata("design:paramtypes", [CourseApprovalService])
], CourseApprovalController);
export { CourseApprovalController };
//# sourceMappingURL=course-approval.controller.js.map