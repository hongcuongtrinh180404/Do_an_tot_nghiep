import { ApiResponse } from '../base/index.js';
import { type IRevenueOverviewKpi, type IRevenueChartItem, type IRevenueTransactionItem, type IRevenueTransactionDetail, type IInstructorRevenueSummary, type IInstructorRevenueDetail, type IInstructorCourseRevenue, type ICommissionConfig, type ICommissionHistoryItem } from 'share-lib';
import { RevenueService } from './services/revenue.service.js';
import { RevenueTimeRangeQueryDto, RevenueTransactionsQueryDto, InstructorsRevenueQueryDto, UpdateCommissionConfigDto, UpdateInstructorCommissionDto } from './dto/revenue.dto.js';
import { PaginationResult } from '../base/index.js';
export declare class RevenueController {
    private readonly revenueService;
    constructor(revenueService: RevenueService);
    getOverview(query: RevenueTimeRangeQueryDto): Promise<ApiResponse<IRevenueOverviewKpi>>;
    getChart(query: RevenueTimeRangeQueryDto): Promise<ApiResponse<IRevenueChartItem[]>>;
    getTransactions(query: RevenueTransactionsQueryDto): Promise<ApiResponse<PaginationResult<IRevenueTransactionItem>>>;
    getTransactionDetail(orderCode: string): Promise<ApiResponse<IRevenueTransactionDetail>>;
    getInstructors(query: InstructorsRevenueQueryDto): Promise<ApiResponse<PaginationResult<IInstructorRevenueSummary>>>;
    getInstructorDetail(id: string, query: RevenueTimeRangeQueryDto): Promise<ApiResponse<IInstructorRevenueDetail>>;
    getInstructorCourses(id: string, query: RevenueTransactionsQueryDto): Promise<ApiResponse<PaginationResult<IInstructorCourseRevenue>>>;
    getInstructorTransactions(id: string, query: RevenueTransactionsQueryDto): Promise<ApiResponse<PaginationResult<IRevenueTransactionItem>>>;
    getInstructorCommissionHistory(id: string): Promise<ApiResponse<ICommissionHistoryItem[]>>;
    getCommissionConfig(): Promise<ApiResponse<ICommissionConfig>>;
    updateCommissionConfig(adminId: string, dto: UpdateCommissionConfigDto): Promise<ApiResponse<ICommissionConfig>>;
    updateInstructorCommission(id: string, adminId: string, dto: UpdateInstructorCommissionDto): Promise<ApiResponse<{
        commissionRate: number;
        message: string;
    }>>;
}
