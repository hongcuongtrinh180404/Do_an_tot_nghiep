export declare class AdminDashboardQueryDto {
    period?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'month';
}
export declare class AdminCoursesPerformanceQueryDto extends AdminDashboardQueryDto {
    categoryId?: string;
    instructorId?: string;
    tab?: 'revenue' | 'enrollment' | 'completion';
    limit?: number;
}
export declare class AdminInstructorsRankingQueryDto extends AdminDashboardQueryDto {
    sortBy?: 'grossRevenue' | 'salesCount' | 'netRevenue';
    limit?: number;
}
