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
import { Controller, Get, Query, Header } from '@nestjs/common';
import { ApiResponse, } from '../base/index.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RoleEnum, } from 'share-lib';
import { AdminDashboardService } from './services/admin-dashboard.service.js';
import { AdminDashboardQueryDto, AdminCoursesPerformanceQueryDto, AdminInstructorsRankingQueryDto, } from './dto/admin-dashboard.dto.js';
let AdminDashboardController = class AdminDashboardController {
    dashboardService;
    constructor(dashboardService) {
        this.dashboardService = dashboardService;
    }
    async getAggregate(query) {
        const data = await this.dashboardService.getAggregate(query);
        return ApiResponse.success(data, 'Lấy dữ liệu tổng quan quản trị thành công');
    }
    async getChart(query) {
        const chart = await this.dashboardService.getChart(query);
        return ApiResponse.success(chart, 'Lấy dữ liệu biểu đồ doanh thu thành công');
    }
    async getCoursesPerformance(query) {
        const courses = await this.dashboardService.getCoursesPerformance(query);
        return ApiResponse.success(courses, 'Lấy hiệu suất khóa học thành công');
    }
    async getInstructorsRanking(query) {
        const instructors = await this.dashboardService.getInstructorsRanking(query);
        return ApiResponse.success(instructors, 'Lấy bảng xếp hạng giảng viên thành công');
    }
};
__decorate([
    Get('aggregate'),
    Header('Cache-Control', 'no-store'),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AdminDashboardQueryDto]),
    __metadata("design:returntype", Promise)
], AdminDashboardController.prototype, "getAggregate", null);
__decorate([
    Get('chart'),
    Header('Cache-Control', 'no-store'),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AdminDashboardQueryDto]),
    __metadata("design:returntype", Promise)
], AdminDashboardController.prototype, "getChart", null);
__decorate([
    Get('courses/performance'),
    Header('Cache-Control', 'no-store'),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AdminCoursesPerformanceQueryDto]),
    __metadata("design:returntype", Promise)
], AdminDashboardController.prototype, "getCoursesPerformance", null);
__decorate([
    Get('instructors/ranking'),
    Header('Cache-Control', 'no-store'),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AdminInstructorsRankingQueryDto]),
    __metadata("design:returntype", Promise)
], AdminDashboardController.prototype, "getInstructorsRanking", null);
AdminDashboardController = __decorate([
    Controller('admin/dashboard'),
    Roles(RoleEnum.ADMIN),
    __metadata("design:paramtypes", [AdminDashboardService])
], AdminDashboardController);
export { AdminDashboardController };
//# sourceMappingURL=admin-dashboard.controller.js.map