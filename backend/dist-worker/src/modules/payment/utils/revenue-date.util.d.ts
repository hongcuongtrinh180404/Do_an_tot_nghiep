export interface ParsedTimeRange {
    startDate?: Date;
    endDate?: Date;
    groupBy: 'day' | 'month';
}
export declare function getVietnamNow(): {
    year: number;
    month: number;
    day: number;
    hours: number;
    minutes: number;
    seconds: number;
};
export declare function createVnDate(year: number, month: number, day: number, hours?: number, minutes?: number, seconds?: number, ms?: number): Date;
export declare function parseRevenueTimeRange(timeRange?: string, customStart?: string, customEnd?: string): ParsedTimeRange;
