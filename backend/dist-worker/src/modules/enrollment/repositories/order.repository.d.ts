import { Model, ClientSession } from 'mongoose';
import { IOrder, ReconciliationStatusEnum, type IRevenueOverviewKpi, type IRevenueChartItem, type IRevenueTransactionItem, type IRevenueTransactionDetail, type IInstructorRevenueSummary, type IInstructorCourseRevenue } from 'share-lib';
import { BaseMongoRepository, PaginationResult } from '../../base/index.js';
import { OrderEntity } from '../schemas/order.schema.js';
export type OrderStatusRecord = Pick<IOrder, 'id' | 'orderCode' | 'userId' | 'courseId' | 'amount' | 'status' | 'expiresAt' | 'paidAt' | 'receivedAmount' | 'lastPaymentStatus'>;
export declare class OrderRepository extends BaseMongoRepository<IOrder, OrderEntity> {
    constructor(orderModel: Model<OrderEntity>);
    ensureIndexes(): Promise<void>;
    findByOrderCode(orderCode: string, session?: ClientSession): Promise<IOrder | null>;
    findStatusByOrderCode(orderCode: string): Promise<OrderStatusRecord | null>;
    findPendingOrderByUserAndCourse(userId: string, courseId: string): Promise<IOrder | null>;
    expirePendingOrders(userId: string, courseId: string): Promise<void>;
    expirePendingOrder(orderId: string, now: Date): Promise<OrderStatusRecord | null>;
    lockForPaymentProcessing(orderId: string, session: ClientSession): Promise<IOrder | null>;
    recordReceipt(orderId: string, status: ReconciliationStatusEnum, session: ClientSession, receivedAmount?: number): Promise<void>;
    markPaid(orderId: string, paidAt: Date, receivedAmount: number, reconciliationStatus: ReconciliationStatusEnum, session: ClientSession): Promise<IOrder | null>;
    cancelOtherPendingOrders(order: IOrder, session: ClientSession): Promise<void>;
    getRevenueOverview(startDate?: Date, endDate?: Date): Promise<IRevenueOverviewKpi>;
    getRevenueChart(startDate: Date, endDate: Date, groupBy: 'day' | 'month'): Promise<IRevenueChartItem[]>;
    findSuccessfulTransactions(params: {
        startDate?: Date;
        endDate?: Date;
        search?: string;
        sort?: string;
        status?: string;
        page: number;
        limit: number;
    }): Promise<PaginationResult<IRevenueTransactionItem>>;
    findRevenueTransactionDetail(orderCode: string): Promise<IRevenueTransactionDetail | null>;
    getInstructorsRevenueStats(params: {
        startDate?: Date;
        endDate?: Date;
        search?: string;
        sort?: string;
        page: number;
        limit: number;
    }): Promise<PaginationResult<IInstructorRevenueSummary>>;
    getInstructorRevenueKpi(instructorId: string, startDate?: Date, endDate?: Date): Promise<{
        totalRevenue: number;
        instructorEarnings: number;
        totalCourses: number;
        successfulSales: number;
    }>;
    getInstructorCoursesRevenue(instructorId: string, startDate?: Date, endDate?: Date, page?: number, limit?: number, search?: string, sort?: string): Promise<PaginationResult<IInstructorCourseRevenue>>;
    getInstructorTransactions(instructorId: string, startDate?: Date, endDate?: Date, page?: number, limit?: number): Promise<PaginationResult<IRevenueTransactionItem>>;
}
