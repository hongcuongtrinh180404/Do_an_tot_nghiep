import { ApiResponse } from '../base/index.js';
import { type IAdminDashboardAggregateResponse, type IDashboardRevenueChartPoint, type IDashboardCoursePerformance, type IDashboardInstructor } from 'share-lib';
import { AdminDashboardService } from './services/admin-dashboard.service.js';
import { AdminDashboardQueryDto, AdminCoursesPerformanceQueryDto, AdminInstructorsRankingQueryDto } from './dto/admin-dashboard.dto.js';
export declare class AdminDashboardController {
    private readonly dashboardService;
    constructor(dashboardService: AdminDashboardService);
    getAggregate(query: AdminDashboardQueryDto): Promise<ApiResponse<IAdminDashboardAggregateResponse>>;
    getChart(query: AdminDashboardQueryDto): Promise<ApiResponse<IDashboardRevenueChartPoint[]>>;
    getCoursesPerformance(query: AdminCoursesPerformanceQueryDto): Promise<ApiResponse<IDashboardCoursePerformance[]>>;
    getInstructorsRanking(query: AdminInstructorsRankingQueryDto): Promise<ApiResponse<IDashboardInstructor[]>>;
}
