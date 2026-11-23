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
import { Controller, Get, Query, Header, UnprocessableEntityException, } from '@nestjs/common';
import { ApiResponse } from '../base/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RoleEnum, } from 'share-lib';
import { RevenueService } from './services/revenue.service.js';
import { RevenueTimeRangeQueryDto } from './dto/revenue.dto.js';
import { InstructorCoursesRevenueQueryDto } from './dto/instructor-teaching-stats.dto.js';
import { InstructorRevenueDataError } from './utils/instructor-revenue.pipeline.js';
function rethrowTeachingStatsError(error) {
    if (error instanceof InstructorRevenueDataError) {
        throw new UnprocessableEntityException({
            statusCode: 422,
            code: 'INSTRUCTOR_REVENUE_DATA_INCOMPLETE',
            reason: error.reason,
            message: error.reason === 'missing_payment_date'
                ? 'Có đơn hàng thiếu ngày thanh toán đã xác thực. Vui lòng liên hệ quản trị viên để đối soát trước khi xem báo cáo theo ngày.'
                : 'Dữ liệu thu nhập hoặc hoa hồng của một số đơn hàng chưa đầy đủ. Vui lòng liên hệ quản trị viên để đối soát.',
        });
    }
    throw error;
}
let InstructorTeachingStatsController = class InstructorTeachingStatsController {
    revenueService;
    constructor(revenueService) {
        this.revenueService = revenueService;
    }
    async getOverview(instructorId, query) {
        try {
            const overview = await this.revenueService.getInstructorTeachingOverview(instructorId, query);
            return ApiResponse.success(overview, 'Lấy dữ liệu tổng quan thống kê giảng dạy thành công');
        }
        catch (error) {
            rethrowTeachingStatsError(error);
        }
    }
    async getCourses(instructorId, query) {
        try {
            const result = await this.revenueService.getInstructorCoursesStats(instructorId, query);
            return ApiResponse.success(result, 'Lấy danh sách doanh thu theo khóa học thành công');
        }
        catch (error) {
            rethrowTeachingStatsError(error);
        }
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