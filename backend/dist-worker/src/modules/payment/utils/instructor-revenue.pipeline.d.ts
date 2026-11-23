import { type PipelineStage } from 'mongoose';
export declare class InstructorRevenueDataError extends Error {
    readonly reason: 'missing_payment_date' | 'invalid_money';
    constructor(reason: 'missing_payment_date' | 'invalid_money');
}
export declare function storedMoneyIsValid(field: string): Record<string, unknown>;
export declare function instructorMoneyStages(): PipelineStage.Set[];
export declare function instructorOrderOwnershipStages(instructorId: string, courseId?: string): Array<PipelineStage.Match | PipelineStage.Lookup>;
export declare function instructorPaidDateStages(): Array<PipelineStage.Lookup | PipelineStage.Set>;
export declare const instructorRevenueGroup: {
    _id: null;
    totalRevenue: {
        $sum: {
            $cond: (string | number)[];
        };
    };
    instructorEarnings: {
        $sum: {
            $cond: (string | number)[];
        };
    };
    platformCommission: {
        $sum: {
            $cond: (string | number | {
                $subtract: string[];
            })[];
        };
    };
    successfulSales: {
        $sum: number;
    };
    reconstructedOrders: {
        $sum: {
            $cond: (string | number)[];
        };
    };
    invalidMoney: {
        $sum: {
            $cond: (string | number)[];
        };
    };
};
export declare function assertRevenueTotals(value: {
    totalRevenue: number;
    instructorEarnings: number;
    platformCommission: number;
    successfulSales: number;
    reconstructedOrders: number;
    invalidMoney?: number;
}): void;
