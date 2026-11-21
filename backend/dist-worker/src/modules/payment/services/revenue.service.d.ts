import { ClsService } from 'nestjs-cls';
import { type IRevenueOverviewKpi, type IRevenueChartItem, type IRevenueTransactionItem, type IRevenueTransactionDetail, type IInstructorRevenueSummary, type IInstructorRevenueDetail, type IInstructorCourseRevenue, type ICommissionConfig, type ICommissionHistoryItem, type ITeachingStatsOverview } from 'share-lib';
import { BaseService, PaginationResult } from '../../base/index.js';
import { CommissionSettingRepository, type ICommissionSettingDomain } from '../repositories/commission-setting.repository.js';
import { CommissionHistoryRepository } from '../repositories/commission-history.repository.js';
import { OrderRepository } from '../../enrollment/repositories/order.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { ReviewRepository } from '../../review/repositories/review.repository.js';
import { RevenueTimeRangeQueryDto, RevenueTransactionsQueryDto, InstructorsRevenueQueryDto, UpdateCommissionConfigDto, UpdateInstructorCommissionDto } from '../dto/revenue.dto.js';
import { InstructorCoursesRevenueQueryDto } from '../dto/instructor-teaching-stats.dto.js';
export declare class RevenueService extends BaseService<ICommissionSettingDomain, string> {
    protected readonly commissionSettingRepository: CommissionSettingRepository;
    protected readonly commissionHistoryRepository: CommissionHistoryRepository;
    protected readonly orderRepository: OrderRepository;
    protected readonly userRepository: UserRepository;
    protected readonly reviewRepository: ReviewRepository;
    constructor(commissionSettingRepository: CommissionSettingRepository, commissionHistoryRepository: CommissionHistoryRepository, orderRepository: OrderRepository, userRepository: UserRepository, reviewRepository: ReviewRepository, cls: ClsService);
    getOverview(query: RevenueTimeRangeQueryDto): Promise<IRevenueOverviewKpi>;
    getChart(query: RevenueTimeRangeQueryDto): Promise<IRevenueChartItem[]>;
    private fillMissingChartData;
    getTransactions(query: RevenueTransactionsQueryDto): Promise<PaginationResult<IRevenueTransactionItem>>;
    getTransactionDetail(orderCode: string): Promise<IRevenueTransactionDetail>;
    getInstructors(query: InstructorsRevenueQueryDto): Promise<PaginationResult<IInstructorRevenueSummary>>;
    getInstructorDetail(instructorId: string, query: RevenueTimeRangeQueryDto): Promise<IInstructorRevenueDetail>;
    getInstructorCourses(instructorId: string, query: RevenueTransactionsQueryDto): Promise<PaginationResult<IInstructorCourseRevenue>>;
    getInstructorTeachingOverview(instructorId: string, query: RevenueTimeRangeQueryDto): Promise<ITeachingStatsOverview>;
    getInstructorCoursesStats(instructorId: string, query: InstructorCoursesRevenueQueryDto): Promise<PaginationResult<IInstructorCourseRevenue>>;
    getInstructorTransactions(instructorId: string, query: RevenueTransactionsQueryDto): Promise<PaginationResult<IRevenueTransactionItem>>;
    getInstructorCommissionHistory(instructorId: string): Promise<ICommissionHistoryItem[]>;
    getCommissionConfig(): Promise<ICommissionConfig>;
    updateCommissionConfig(dto: UpdateCommissionConfigDto, adminId: string): Promise<ICommissionConfig>;
    updateInstructorCommission(instructorId: string, dto: UpdateInstructorCommissionDto, adminId: string): Promise<{
        commissionRate: number;
        message: string;
    }>;
}
