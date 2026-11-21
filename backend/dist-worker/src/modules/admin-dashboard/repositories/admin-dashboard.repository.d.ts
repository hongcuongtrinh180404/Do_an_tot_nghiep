import { Model } from 'mongoose';
import { IOrder, type IDashboardRevenueChartPoint, type CategoryRevenueItem, type IDashboardPendingTask, type IDashboardCoursePerformance, type IDashboardInstructor } from 'share-lib';
import { BaseMongoRepository } from '../../base/index.js';
import { OrderEntity } from '../../enrollment/schemas/order.schema.js';
export declare class AdminDashboardRepository extends BaseMongoRepository<IOrder, OrderEntity> {
    constructor(orderModel: Model<OrderEntity>);
    getRevenueKpi(startDate?: Date, endDate?: Date): Promise<{
        totalRevenue: number;
        platformCommission: number;
        instructorEarnings: number;
        successfulOrders: number;
    }>;
    getNewStudentsCount(startDate?: Date, endDate?: Date): Promise<number>;
    getEnrollmentsStats(startDate?: Date, endDate?: Date): Promise<{
        total: number;
        paid: number;
        free: number;
    }>;
    getPendingTasksCounts(): Promise<{
        cur: number;
        courses: number;
        instructors: number;
        reviews: number;
    }>;
    getRevenueChartPoints(startDate: Date, endDate: Date, groupBy: 'day' | 'month'): Promise<IDashboardRevenueChartPoint[]>;
    getCategoryRevenue(startDate?: Date, endDate?: Date): Promise<CategoryRevenueItem[]>;
    getRecentPendingTasks(limit?: number): Promise<IDashboardPendingTask[]>;
    getCoursesPerformance(params: {
        startDate?: Date;
        endDate?: Date;
        categoryId?: string;
        instructorId?: string;
        limit?: number;
    }): Promise<IDashboardCoursePerformance[]>;
    getInstructorsRanking(params: {
        startDate?: Date;
        endDate?: Date;
        sortBy?: 'grossRevenue' | 'salesCount' | 'netRevenue' | string;
        limit?: number;
    }): Promise<IDashboardInstructor[]>;
}
