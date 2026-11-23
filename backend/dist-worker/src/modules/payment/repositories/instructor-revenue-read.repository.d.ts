import { Model } from 'mongoose';
import { OrderEntity } from '../../enrollment/schemas/order.schema.js';
export declare const INSTRUCTOR_REVENUE_QUERY_MS = 1500;
export interface InstructorRevenueTotals {
    totalRevenue: number;
    platformCommission: number;
    instructorEarnings: number;
    successfulSales: number;
    reconstructedOrders: number;
}
export interface InstructorRevenueCourse {
    id: string;
    title: string;
}
export type InstructorCourseSales = InstructorRevenueCourse & InstructorRevenueTotals & {
    rank: number;
};
export declare class InstructorRevenueReadRepository {
    private readonly orders;
    constructor(orders: Model<OrderEntity>);
    canRead(userId: string): Promise<boolean>;
    courses(userId: string, options: {
        keyword?: string;
        courseId?: string;
        page: number;
        limit: number;
    }): Promise<{
        items: InstructorRevenueCourse[];
        total: number;
    }>;
    summary(userId: string, start?: Date, endExclusive?: Date, courseId?: string): Promise<InstructorRevenueTotals>;
    compare(userId: string, current: {
        start: Date;
        endExclusive: Date;
    }, previous: {
        start: Date;
        endExclusive: Date;
    }, courseId?: string): Promise<InstructorRevenueTotals[]>;
    private periodTotals;
    topCourses(userId: string, start: Date, endExclusive: Date, page: number, limit: number): Promise<{
        totals: InstructorRevenueTotals;
        items: InstructorCourseSales[];
        total: number;
        topTiedCount: number;
    }>;
}
