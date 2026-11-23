import { type BusinessPeriod, type BusinessPeriodInput } from './instructor-business.types.js';
export declare function vietnamDate(now: Date): string;
export declare function resolveBusinessPeriod(input: BusinessPeriodInput, now?: Date): BusinessPeriod;
export declare function previousBusinessPeriod(input: BusinessPeriodInput, current: BusinessPeriod, now: Date): BusinessPeriod;
