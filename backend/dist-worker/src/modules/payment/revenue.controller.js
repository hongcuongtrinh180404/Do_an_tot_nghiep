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
import { Controller, Get, Patch, Param, Body, Query, HttpCode, HttpStatus, Header, } from '@nestjs/common';
import { ApiResponse, ParseObjectIdPipe, } from '../base/index.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RoleEnum, } from 'share-lib';
import { RevenueService } from './services/revenue.service.js';
import { RevenueTimeRangeQueryDto, RevenueTransactionsQueryDto, InstructorsRevenueQueryDto, UpdateCommissionConfigDto, UpdateInstructorCommissionDto, } from './dto/revenue.dto.js';
let RevenueController = class RevenueController {
    revenueService;
    constructor(revenueService) {
        this.revenueService = revenueService;
    }
    async getOverview(query) {
        const kpi = await this.revenueService.getOverview(query);
        return ApiResponse.success(kpi, 'Lấy dữ liệu tổng quan doanh thu thành công');
    }
    async getChart(query) {
        const chart = await this.revenueService.getChart(query);
        return ApiResponse.success(chart, 'Lấy dữ liệu biểu đồ doanh thu thành công');
    }
    async getTransactions(query) {
        const result = await this.revenueService.getTransactions(query);
        return ApiResponse.success(result, 'Lấy danh sách giao dịch thành công');
    }
    async getTransactionDetail(orderCode) {
        const detail = await this.revenueService.getTransactionDetail(orderCode);
        return ApiResponse.success(detail, 'Lấy chi tiết giao dịch thành công');
    }
    async getInstructors(query) {
        const result = await this.revenueService.getInstructors(query);
        return ApiResponse.success(result, 'Lấy danh sách doanh thu giảng viên thành công');
    }
    async getInstructorDetail(id, query) {
        const result = await this.revenueService.getInstructorDetail(id, query);
        return ApiResponse.success(result, 'Lấy chi tiết giảng viên thành công');
    }
    async getInstructorCourses(id, query) {
        const result = await this.revenueService.getInstructorCourses(id, query);
        return ApiResponse.success(result, 'Lấy danh sách khóa học giảng viên thành công');
    }
    async getInstructorTransactions(id, query) {
        const result = await this.revenueService.getInstructorTransactions(id, query);
        return ApiResponse.success(result, 'Lấy danh sách giao dịch của giảng viên thành công');
    }
    async getInstructorCommissionHistory(id) {
        const result = await this.revenueService.getInstructorCommissionHistory(id);
        return ApiResponse.success(result, 'Lấy lịch sử hoa hồng thành công');
    }
    async getCommissionConfig() {
        const config = await this.revenueService.getCommissionConfig();
        return ApiResponse.success(config, 'Lấy cấu hình hoa hồng mặc định thành công');
    }
    async updateCommissionConfig(adminId, dto) {
        const result = await this.revenueService.updateCommissionConfig(dto, adminId);
        return ApiResponse.success(result, 'Cập nhật cấu hình hoa hồng mặc định thành công');
    }
    async updateInstructorCommission(id, adminId, dto) {
        const result = await this.revenueService.updateInstructorCommission(id, dto, adminId);
        return ApiResponse.success(result, result.message);
    }
};
__decorate([
    Get('overview'),
    Header('Cache-Control', 'no-store'),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RevenueTimeRangeQueryDto]),
    __metadata("design:returntype", Promise)
], RevenueController.prototype, "getOverview", null);
__decorate([
    Get('chart'),
    Header('Cache-Control', 'no-store'),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RevenueTimeRangeQueryDto]),
    __metadata("design:returntype", Promise)
], RevenueController.prototype, "getChart", null);
__decorate([
    Get('transactions'),
    Header('Cache-Control', 'no-store'),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RevenueTransactionsQueryDto]),
    __metadata("design:returntype", Promise)
], RevenueController.prototype, "getTransactions", null);
__decorate([
    Get('transactions/:orderCode'),
    Header('Cache-Control', 'no-store'),
    __param(0, Param('orderCode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RevenueController.prototype, "getTransactionDetail", null);
__decorate([
    Get('instructors'),
    Header('Cache-Control', 'no-store'),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [InstructorsRevenueQueryDto]),
    __metadata("design:returntype", Promise)
], RevenueController.prototype, "getInstructors", null);
__decorate([
    Get('instructors/:id'),
    Header('Cache-Control', 'no-store'),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, RevenueTimeRangeQueryDto]),
    __metadata("design:returntype", Promise)
], RevenueController.prototype, "getInstructorDetail", null);
__decorate([
    Get('instructors/:id/courses'),
    Header('Cache-Control', 'no-store'),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, RevenueTransactionsQueryDto]),
    __metadata("design:returntype", Promise)
], RevenueController.prototype, "getInstructorCourses", null);
__decorate([
    Get('instructors/:id/transactions'),
    Header('Cache-Control', 'no-store'),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, RevenueTransactionsQueryDto]),
    __metadata("design:returntype", Promise)
], RevenueController.prototype, "getInstructorTransactions", null);
__decorate([
    Get('instructors/:id/commission-history'),
    Header('Cache-Control', 'no-store'),
    __param(0, Param('id', ParseObjectIdPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RevenueController.prototype, "getInstructorCommissionHistory", null);
__decorate([
    Get('commission-config'),
    Header('Cache-Control', 'no-store'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RevenueController.prototype, "getCommissionConfig", null);
__decorate([
    Patch('commission-config'),
    HttpCode(HttpStatus.OK),
    __param(0, CurrentUser('id')),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateCommissionConfigDto]),
    __metadata("design:returntype", Promise)
], RevenueController.prototype, "updateCommissionConfig", null);
__decorate([
    Patch('instructors/:id/commission'),
    HttpCode(HttpStatus.OK),
    __param(0, Param('id', ParseObjectIdPipe)),
    __param(1, CurrentUser('id')),
    __param(2, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, UpdateInstructorCommissionDto]),
    __metadata("design:returntype", Promise)
], RevenueController.prototype, "updateInstructorCommission", null);
RevenueController = __decorate([
    Controller('payments/revenue'),
    Roles(RoleEnum.ADMIN),
    __metadata("design:paramtypes", [RevenueService])
], RevenueController);
export { RevenueController };
//# sourceMappingURL=revenue.controller.js.map