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
import { Controller, Get, Header, Param, UnprocessableEntityException } from '@nestjs/common';
import { RoleEnum } from 'share-lib';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { ApiResponse, ParseObjectIdPipe } from '../base/index.js';
import { InstructorRevenueDataError } from '../payment/utils/instructor-revenue.pipeline.js';
import { AdminUserCoursesService } from './services/admin-user-courses.service.js';
let AdminUserCoursesController = class AdminUserCoursesController {
    service;
    constructor(service) {
        this.service = service;
    }
    async getEnrolledCourses(userId) {
        return ApiResponse.success(await this.service.getEnrolledCourses(userId), 'Lấy khóa học đã đăng ký thành công');
    }
    async getTeaching(userId) {
        try {
            return ApiResponse.success(await this.service.getTeaching(userId), 'Lấy số liệu giảng dạy thành công');
        }
        catch (error) {
            if (error instanceof InstructorRevenueDataError) {
                throw new UnprocessableEntityException({
                    statusCode: 422,
                    code: 'INSTRUCTOR_REVENUE_DATA_INCOMPLETE',
                    reason: error.reason,
                    message: 'Dữ liệu doanh thu hoặc hoa hồng của tài khoản chưa đầy đủ. Cần đối soát đơn hàng trước khi hiển thị thống kê.',
                });
            }
            throw error;
        }
    }
};
__decorate([
    Get(':id/enrolled-courses'),
    Header('Cache-Control', 'no-store'),
    __param(0, Param('id', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminUserCoursesController.prototype, "getEnrolledCourses", null);
__decorate([
    Get(':id/teaching'),
    Header('Cache-Control', 'no-store'),
    __param(0, Param('id', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminUserCoursesController.prototype, "getTeaching", null);
AdminUserCoursesController = __decorate([
    Controller('users'),
    Roles(RoleEnum.ADMIN),
    __metadata("design:paramtypes", [AdminUserCoursesService])
], AdminUserCoursesController);
export { AdminUserCoursesController };
//# sourceMappingURL=admin-user-courses.controller.js.map