export declare class RevenueTimeRangeQueryDto {
    timeRange?: string;
    startDate?: string;
    endDate?: string;
}
export declare class RevenueTransactionsQueryDto extends RevenueTimeRangeQueryDto {
    page: number;
    limit: number;
    search?: string;
    sort?: string;
    status?: string;
}
export declare class InstructorsRevenueQueryDto extends RevenueTimeRangeQueryDto {
    page: number;
    limit: number;
    search?: string;
    sort?: string;
}
export declare class UpdateCommissionConfigDto {
    defaultRate: number;
    reason?: string;
}
export declare class UpdateInstructorCommissionDto {
    commissionRate: number;
    reason: string;
}
