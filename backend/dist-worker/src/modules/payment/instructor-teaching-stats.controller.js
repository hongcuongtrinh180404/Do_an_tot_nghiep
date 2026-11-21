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
import { Controller, Get, Query, Header, } from '@nestjs/common';
import { ApiResponse } from '../base/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RoleEnum, } from 'share-lib';
import { RevenueService } from './services/revenue.service.js';
import { RevenueTimeRangeQueryDto } from './dto/revenue.dto.js';
import { InstructorCoursesRevenueQueryDto } from './dto/instructor-teaching-stats.dto.js';
let InstructorTeachingStatsController = class InstructorTeachingStatsController {
    revenueService;
    constructor(revenueService) {
        this.revenueService = revenueService;
    }
    async getOverview(instructorId, query) {
        const overview = await this.revenueService.getInstructorTeachingOverview(instructorId, query);
        return ApiResponse.success(overview, 'Lấy dữ liệu tổng quan thống kê giảng dạy thành công');
    }
    async getCourses(instructorId, query) {
        const result = await this.revenueService.getInstructorCoursesStats(instructorId, query);
        return ApiResponse.success(result, 'Lấy danh sách doanh thu theo khóa học thành công');
    }
};
__decorate([
    Get('overview'),
    Header('Cache-Control', 'no-store'),
    __param(0, CurrentUser('id')),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, RevenueTimeRangeQueryDto]),
    __metadata("design:returntype", Promise)
], InstructorTeachingStatsController.prototype, "getOverview", null);
__decorate([
    Get('courses'),
    Header('Cache-Control', 'no-store'),
    __param(0, CurrentUser('id')),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, InstructorCoursesRevenueQueryDto]),
    __metadata("design:returntype", Promise)
], InstructorTeachingStatsController.prototype, "getCourses", null);
InstructorTeachingStatsController = __decorate([
    Controller('instructor/teaching-stats'),
    Roles(RoleEnum.INSTRUCTOR, RoleEnum.ADMIN),
    __metadata("design:paramtypes", [RevenueService])
], InstructorTeachingStatsController);
export { InstructorTeachingStatsController };
//# sourceMappingURL=instructor-teaching-stats.controller.js.map