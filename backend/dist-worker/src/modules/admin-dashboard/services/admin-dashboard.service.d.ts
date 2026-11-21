import { ClsService } from 'nestjs-cls';
import { IOrder, type IDashboardRevenueChartPoint, type IDashboardCoursePerformance, type IDashboardInstructor, type IAdminDashboardAggregateResponse } from 'share-lib';
import { BaseService } from '../../base/index.js';
import { AdminDashboardRepository } from '../repositories/admin-dashboard.repository.js';
import { AdminDashboardQueryDto, AdminCoursesPerformanceQueryDto, AdminInstructorsRankingQueryDto } from '../dto/admin-dashboard.dto.js';
export declare class AdminDashboardService extends BaseService<IOrder, string> {
    protected readonly dashboardRepository: AdminDashboardRepository;
    constructor(dashboardRepository: AdminDashboardRepository, cls: ClsService);
    getAggregate(query: AdminDashboardQueryDto): Promise<IAdminDashboardAggregateResponse>;
    getInstructorsRanking(query: AdminInstructorsRankingQueryDto): Promise<IDashboardInstructor[]>;
    getChart(query: AdminDashboardQueryDto): Promise<IDashboardRevenueChartPoint[]>;
    getCoursesPerformance(query: AdminCoursesPerformanceQueryDto): Promise<IDashboardCoursePerformance[]>;
    private resolveDateRange;
    private resolvePreviousDateRange;
}
