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
import { Controller, Get, Post, Patch, Put, Param, Body, Query, HttpCode, HttpStatus, UseGuards, } from '@nestjs/common';
import { RoleEnum, } from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { InstructorApplicationService } from './services/instructor-application.service.js';
import { QueryInstructorApplicationsDto } from './dto/query-instructor-applications.dto.js';
import { RejectInstructorApplicationDto } from './dto/reject-instructor-application.dto.js';
import { UpdateInstructorTermsDto } from './dto/update-instructor-terms.dto.js';
import { ApplyInstructorApplicationDto } from './dto/apply-instructor-application.dto.js';
let InstructorApplicationController = class InstructorApplicationController {
    instructorApplicationService;
    constructor(instructorApplicationService) {
        this.instructorApplicationService = instructorApplicationService;
    }
    async getApplications(query) {
        const result = await this.instructorApplicationService.getApplications(query);
        return ApiResponse.success(result, 'Lấy danh sách hồ sơ ứng viên thành công');
    }
    async getPendingCount() {
        const result = await this.instructorApplicationService.getPendingCount();
        return ApiResponse.success(result, 'Lấy số lượng hồ sơ chờ duyệt thành công');
    }
    async getStats() {
        const result = await this.instructorApplicationService.getStats();
        return ApiResponse.success(result, 'Lấy thống kê hồ sơ thành công');
    }
    async getApplicationDetail(id) {
        const result = await this.instructorApplicationService.getApplicationDetail(id);
        return ApiResponse.success(result, 'Lấy chi tiết hồ sơ thành công');
    }
    async approveApplication(id, adminId, adminName) {
        const result = await this.instructorApplicationService.approveApplication(id, adminId, adminName || 'Quản trị viên');
        return ApiResponse.success(result, 'Phê duyệt hồ sơ giảng viên thành công');
    }
    async rejectApplication(id, adminId, adminName, dto) {
        const result = await this.instructorApplicationService.rejectApplication(id, adminId, adminName || 'Quản trị viên', dto.rejectionReason);
        return ApiResponse.success(result, 'Từ chối hồ sơ giảng viên thành công');
    }
};
__decorate([
    Get(),
    HttpCode(HttpStatus.OK),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [QueryInstructorApplicationsDto]),
    __metadata("design:returntype", Promise)
], InstructorApplicationController.prototype, "getApplications", null);
__decorate([
    Get('stats/pending-count'),
    HttpCode(HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InstructorApplicationController.prototype, "getPendingCount", null);
__decorate([
    Get('stats/overview'),
    HttpCode(HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InstructorApplicationController.prototype, "getStats", null);
__decorate([
    Get(':id'),
    HttpCode(HttpStatus.OK),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InstructorApplicationController.prototype, "getApplicationDetail", null);
__decorate([
    Patch(':id/approve'),
    HttpCode(HttpStatus.OK),
    __param(0, Param('id')),
    __param(1, CurrentUser('id')),
    __param(2, CurrentUser('fullName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], InstructorApplicationController.prototype, "approveApplication", null);
__decorate([
    Patch(':id/reject'),
    HttpCode(HttpStatus.OK),
    __param(0, Param('id')),
    __param(1, CurrentUser('id')),
    __param(2, CurrentUser('fullName')),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, RejectInstructorApplicationDto]),
    __metadata("design:returntype", Promise)
], InstructorApplicationController.prototype, "rejectApplication", null);
InstructorApplicationController = __decorate([
    Controller('admin/instructor-applications'),
    Roles(RoleEnum.ADMIN),
    __metadata("design:paramtypes", [InstructorApplicationService])
], InstructorApplicationController);
export { InstructorApplicationController };
let InstructorTermsController = class InstructorTermsController {
    instructorApplicationService;
    constructor(instructorApplicationService) {
        this.instructorApplicationService = instructorApplicationService;
    }
    async getTerms() {
        const result = await this.instructorApplicationService.getTerms();
        return ApiResponse.success(result, 'Lấy danh sách điều khoản giảng viên thành công');
    }
    async updateTerms(dto) {
        const result = await this.instructorApplicationService.updateTerms(dto);
        return ApiResponse.success(result, 'Cập nhật danh sách điều khoản thành công');
    }
};
__decorate([
    Get(),
    HttpCode(HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InstructorTermsController.prototype, "getTerms", null);
__decorate([
    Put(),
    HttpCode(HttpStatus.OK),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UpdateInstructorTermsDto]),
    __metadata("design:returntype", Promise)
], InstructorTermsController.prototype, "updateTerms", null);
InstructorTermsController = __decorate([
    Controller('admin/instructor-terms'),
    Roles(RoleEnum.ADMIN),
    __metadata("design:paramtypes", [InstructorApplicationService])
], InstructorTermsController);
export { InstructorTermsController };
let InstructorApplicationUserController = class InstructorApplicationUserController {
    instructorApplicationService;
    constructor(instructorApplicationService) {
        this.instructorApplicationService = instructorApplicationService;
    }
    async getTerms() {
        const result = await this.instructorApplicationService.getTerms();
        return ApiResponse.success(result, 'Lấy danh sách điều khoản giảng viên thành công');
    }
    async apply(userId, userEmail, userName, dto) {
        const result = await this.instructorApplicationService.applyOrResubmitApplication(userId, userEmail, userName || 'Học viên', dto);
        return ApiResponse.success(result, 'Nộp hồ sơ đăng ký giảng viên thành công');
    }
    async getMyApplication(userId) {
        const result = await this.instructorApplicationService.getMyApplication(userId);
        return ApiResponse.success(result, 'Lấy thông tin hồ sơ của bạn thành công');
    }
};
__decorate([
    Get('terms'),
    HttpCode(HttpStatus.OK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], InstructorApplicationUserController.prototype, "getTerms", null);
__decorate([
    Post('apply'),
    UseGuards(JwtAuthGuard),
    HttpCode(HttpStatus.CREATED),
    __param(0, CurrentUser('id')),
    __param(1, CurrentUser('email')),
    __param(2, CurrentUser('fullName')),
    __param(3, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, ApplyInstructorApplicationDto]),
    __metadata("design:returntype", Promise)
], InstructorApplicationUserController.prototype, "apply", null);
__decorate([
    Get('my-application'),
    UseGuards(JwtAuthGuard),
    HttpCode(HttpStatus.OK),
    __param(0, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], InstructorApplicationUserController.prototype, "getMyApplication", null);
InstructorApplicationUserController = __decorate([
    Controller('instructor-applications'),
    __metadata("design:paramtypes", [InstructorApplicationService])
], InstructorApplicationUserController);
export { InstructorApplicationUserController };
//# sourceMappingURL=instructor-application.controller.js.map