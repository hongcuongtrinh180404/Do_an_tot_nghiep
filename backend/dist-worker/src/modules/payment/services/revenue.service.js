var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var RevenueService_1;
import { Injectable, NotFoundException, BadRequestException, } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { RoleEnum, } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { CommissionSettingRepository, } from '../repositories/commission-setting.repository.js';
import { CommissionHistoryRepository } from '../repositories/commission-history.repository.js';
import { OrderRepository } from '../../enrollment/repositories/order.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { ReviewRepository } from '../../review/repositories/review.repository.js';
import { parseRevenueTimeRange, } from '../utils/revenue-date.util.js';
let RevenueService = RevenueService_1 = class RevenueService extends BaseService {
    commissionSettingRepository;
    commissionHistoryRepository;
    orderRepository;
    userRepository;
    reviewRepository;
    constructor(commissionSettingRepository, commissionHistoryRepository, orderRepository, userRepository, reviewRepository, cls) {
        super(commissionSettingRepository, cls, RevenueService_1.name);
        this.commissionSettingRepository = commissionSettingRepository;
        this.commissionHistoryRepository = commissionHistoryRepository;
        this.orderRepository = orderRepository;
        this.userRepository = userRepository;
        this.reviewRepository = reviewRepository;
    }
    async getOverview(query) {
        const { startDate, endDate } = parseRevenueTimeRange(query.timeRange, query.startDate, query.endDate);
        return this.orderRepository.getRevenueOverview(startDate, endDate);
    }
    async getChart(query) {
        const { startDate, endDate, groupBy } = parseRevenueTimeRange(query.timeRange, query.startDate, query.endDate);
        const effectiveStart = startDate ?? new Date(Date.now() - 365 * 86400000);
        const effectiveEnd = endDate ?? new Date();
        const dbItems = await this.orderRepository.getRevenueChart(effectiveStart, effectiveEnd, groupBy);
        return this.fillMissingChartData(dbItems, effectiveStart, effectiveEnd, groupBy);
    }
    fillMissingChartData(items, startDate, endDate, groupBy) {
        const map = new Map();
        for (const item of items) {
            map.set(item.date, item);
        }
        const result = [];
        const pad = (n) => String(n).padStart(2, '0');
        if (groupBy === 'day') {
            const current = new Date(startDate.getTime());
            while (current.getTime() <= endDate.getTime()) {
                const vnDate = new Date(current.getTime() + 7 * 3600000);
                const y = vnDate.getUTCFullYear();
                const m = vnDate.getUTCMonth() + 1;
                const d = vnDate.getUTCDate();
                const key = `${y}-${pad(m)}-${pad(d)}`;
                const existing = map.get(key);
                result.push(existing ?? {
                    date: key,
                    label: `${pad(d)}/${pad(m)}`,
                    totalRevenue: 0,
                    platformCommission: 0,
                    instructorEarnings: 0,
                    orderCount: 0,
                });
                current.setTime(current.getTime() + 86400000);
            }
        }
        else {
            const sVn = new Date(startDate.getTime() + 7 * 3600000);
            const eVn = new Date(endDate.getTime() + 7 * 3600000);
            let y = sVn.getUTCFullYear();
            let m = sVn.getUTCMonth() + 1;
            const endY = eVn.getUTCFullYear();
            const endM = eVn.getUTCMonth() + 1;
            while (y < endY || (y === endY && m <= endM)) {
                const key = `${y}-${pad(m)}`;
                const existing = map.get(key);
                result.push(existing ?? {
                    date: key,
                    label: `T${m}/${y}`,
                    totalRevenue: 0,
                    platformCommission: 0,
                    instructorEarnings: 0,
                    orderCount: 0,
                });
                m += 1;
                if (m > 12) {
                    m = 1;
                    y += 1;
                }
            }
        }
        return result;
    }
    async getTransactions(query) {
        const { startDate, endDate } = parseRevenueTimeRange(query.timeRange, query.startDate, query.endDate);
        return this.orderRepository.findSuccessfulTransactions({
            startDate,
            endDate,
            search: query.search,
            sort: query.sort,
            status: query.status,
            page: query.page,
            limit: query.limit,
        });
    }
    async getTransactionDetail(orderCode) {
        const detail = await this.orderRepository.findRevenueTransactionDetail(orderCode);
        if (!detail) {
            throw new NotFoundException(`Không tìm thấy giao dịch với mã '${orderCode}'`);
        }
        return detail;
    }
    async getInstructors(query) {
        const { startDate, endDate } = parseRevenueTimeRange(query.timeRange, query.startDate, query.endDate);
        return this.orderRepository.getInstructorsRevenueStats({
            startDate,
            endDate,
            search: query.search,
            sort: query.sort,
            page: query.page,
            limit: query.limit,
        });
    }
    async getInstructorDetail(instructorId, query) {
        const user = await this.userRepository.findById(instructorId);
        if (!user || user.deletedAt || user.role !== RoleEnum.INSTRUCTOR) {
            throw new NotFoundException('Không tìm thấy thông tin giảng viên');
        }
        const { startDate, endDate } = parseRevenueTimeRange(query.timeRange, query.startDate, query.endDate);
        const kpi = await this.orderRepository.getInstructorRevenueKpi(instructorId, startDate, endDate);
        return {
            instructor: {
                id: user.id,
                fullName: user.fullName || user.email,
                email: user.email,
                avatarUrl: user.avatarUrl || user.avatar || null,
                status: user.status,
                createdAt: new Date(user.createdAt).toISOString(),
                commissionRate: user.commissionRate ?? 30,
                commissionRateUpdatedAt: user.commissionRateUpdatedAt
                    ? new Date(user.commissionRateUpdatedAt).toISOString()
                    : null,
            },
            kpi,
        };
    }
    async getInstructorCourses(instructorId, query) {
        const user = await this.userRepository.findById(instructorId);
        if (!user || user.deletedAt || user.role !== RoleEnum.INSTRUCTOR) {
            throw new NotFoundException('Không tìm thấy thông tin giảng viên');
        }
        const { startDate, endDate } = parseRevenueTimeRange(query.timeRange, query.startDate, query.endDate);
        return this.orderRepository.getInstructorCoursesRevenue(instructorId, startDate, endDate, query.page, query.limit);
    }
    async getInstructorTeachingOverview(instructorId, query) {
        const user = await this.userRepository.findById(instructorId);
        if (!user || user.deletedAt || (user.role !== RoleEnum.INSTRUCTOR && user.role !== RoleEnum.ADMIN)) {
            throw new NotFoundException('Không tìm thấy thông tin giảng viên');
        }
        const { startDate, endDate } = parseRevenueTimeRange(query.timeRange, query.startDate, query.endDate);
        const kpi = await this.orderRepository.getInstructorRevenueKpi(instructorId, startDate, endDate);
        const reviewStats = await this.reviewRepository.calculateInstructorReviewStats(instructorId);
        return {
            totalRevenue: kpi.totalRevenue,
            instructorEarnings: kpi.instructorEarnings,
            successfulSales: kpi.successfulSales,
            averageRating: reviewStats.averageRating,
            totalReviews: reviewStats.totalReviews,
        };
    }
    async getInstructorCoursesStats(instructorId, query) {
        const user = await this.userRepository.findById(instructorId);
        if (!user || user.deletedAt || (user.role !== RoleEnum.INSTRUCTOR && user.role !== RoleEnum.ADMIN)) {
            throw new NotFoundException('Không tìm thấy thông tin giảng viên');
        }
        const { startDate, endDate } = parseRevenueTimeRange(query.timeRange, query.startDate, query.endDate);
        return this.orderRepository.getInstructorCoursesRevenue(instructorId, startDate, endDate, query.page, query.limit, query.search, query.sort);
    }
    async getInstructorTransactions(instructorId, query) {
        const user = await this.userRepository.findById(instructorId);
        if (!user || user.deletedAt || user.role !== RoleEnum.INSTRUCTOR) {
            throw new NotFoundException('Không tìm thấy thông tin giảng viên');
        }
        const { startDate, endDate } = parseRevenueTimeRange(query.timeRange, query.startDate, query.endDate);
        return this.orderRepository.getInstructorTransactions(instructorId, startDate, endDate, query.page, query.limit);
    }
    async getInstructorCommissionHistory(instructorId) {
        const user = await this.userRepository.findById(instructorId);
        if (!user || user.deletedAt || user.role !== RoleEnum.INSTRUCTOR) {
            throw new NotFoundException('Không tìm thấy thông tin giảng viên');
        }
        const histories = await this.commissionHistoryRepository.findByInstructorId(instructorId);
        const result = [];
        for (const h of histories) {
            const admin = await this.userRepository.findById(h.appliedById);
            result.push({
                id: h.id,
                targetType: h.targetType,
                instructorId: h.instructorId,
                oldRate: h.oldRate,
                newRate: h.newRate,
                reason: h.reason,
                createdAt: new Date(h.createdAt).toISOString(),
                adminName: admin?.fullName || 'Quản trị viên',
                adminEmail: admin?.email || '',
            });
        }
        return result;
    }
    async getCommissionConfig() {
        const current = await this.commissionSettingRepository.getCurrentSetting();
        if (!current) {
            return {
                defaultRate: 30,
                updatedAt: null,
                updatedById: null,
                updatedByName: null,
            };
        }
        let adminName = null;
        if (current.appliedById) {
            const admin = await this.userRepository.findById(current.appliedById);
            if (admin)
                adminName = admin.fullName || admin.email;
        }
        return {
            defaultRate: current.defaultRate,
            updatedAt: current.updatedAt ? new Date(current.updatedAt).toISOString() : null,
            updatedById: current.appliedById ?? null,
            updatedByName: adminName,
        };
    }
    async updateCommissionConfig(dto, adminId) {
        const current = await this.commissionSettingRepository.getCurrentSetting();
        const currentRate = current?.defaultRate ?? 30;
        if (currentRate === dto.defaultRate) {
            throw new BadRequestException('Tỷ lệ hoa hồng mới phải khác tỷ lệ hiện tại');
        }
        const reason = dto.reason?.trim() ||
            'Cập nhật cấu hình hoa hồng mặc định toàn hệ thống (áp dụng cho tất cả giảng viên)';
        let updatedSetting = null;
        await this.commissionSettingRepository.withTransaction(async (session) => {
            updatedSetting = await this.commissionSettingRepository.updateDefaultRate(dto.defaultRate, adminId, session);
            await this.userRepository.updateAllInstructorsCommissionRate(dto.defaultRate, adminId, session);
            await this.commissionHistoryRepository.create({
                targetType: 'SYSTEM',
                oldRate: currentRate,
                newRate: dto.defaultRate,
                reason,
                appliedById: adminId,
            }, session);
        });
        const admin = await this.userRepository.findById(adminId);
        return {
            defaultRate: updatedSetting ? updatedSetting.defaultRate : dto.defaultRate,
            updatedAt: updatedSetting ? new Date(updatedSetting.updatedAt).toISOString() : new Date().toISOString(),
            updatedById: adminId,
            updatedByName: admin?.fullName || 'Quản trị viên',
        };
    }
    async updateInstructorCommission(instructorId, dto, adminId) {
        const user = await this.userRepository.findById(instructorId);
        if (!user || user.deletedAt || user.role !== RoleEnum.INSTRUCTOR) {
            throw new NotFoundException('Không tìm thấy thông tin giảng viên');
        }
        const currentRate = user.commissionRate ?? 30;
        if (currentRate === dto.commissionRate) {
            throw new BadRequestException('Tỷ lệ hoa hồng mới phải khác tỷ lệ hiện tại');
        }
        const reason = dto.reason?.trim();
        if (!reason) {
            throw new BadRequestException('Lý do thay đổi hoa hồng không được để trống');
        }
        await this.commissionSettingRepository.withTransaction(async (session) => {
            await this.userRepository.updateCommissionRate(instructorId, dto.commissionRate, adminId, session);
            await this.commissionHistoryRepository.create({
                instructorId,
                oldRate: currentRate,
                newRate: dto.commissionRate,
                reason,
                appliedById: adminId,
            }, session);
        });
        return {
            commissionRate: dto.commissionRate,
            message: 'Cập nhật tỷ lệ hoa hồng cho giảng viên thành công',
        };
    }
};
RevenueService = RevenueService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [CommissionSettingRepository,
        CommissionHistoryRepository,
        OrderRepository,
        UserRepository,
        ReviewRepository,
        ClsService])
], RevenueService);
export { RevenueService };
//# sourceMappingURL=revenue.service.js.map