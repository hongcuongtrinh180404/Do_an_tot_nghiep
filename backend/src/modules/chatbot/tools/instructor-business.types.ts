import type { InstructorRevenueCourse, InstructorRevenueTotals, InstructorCourseSales } from '../../payment/repositories/instructor-revenue-read.repository.js';

export type BusinessTimeRange = 'today' | 'yesterday' | 'this_week' | 'last_week' | '7days' | '30days'
  | 'this_month' | 'last_month' | 'this_year' | 'custom';
export interface BusinessPeriodInput {
  timeRange: BusinessTimeRange;
  startDate?: string;
  endDate?: string;
}
export interface BusinessPeriod {
  startDate: string;
  endDate: string;
  startAt: string;
  endAtExclusive: string;
  isPartial: boolean;
}
export interface BusinessQuery {
  period: BusinessPeriodInput;
  courseId?: string;
  courseName?: string;
  mode: 'revenue' | 'sales_count' | 'top_courses' | 'compare';
  metric: 'instructor_earnings' | 'successful_sales';
  comparePeriod?: BusinessPeriodInput;
  page: number;
  limit: number;
}
export interface BusinessContext {
  query: BusinessQuery;
  selectedCourseId?: string;
}
export type BusinessResult = {
  asOf: string;
  timeZone: 'Asia/Ho_Chi_Minh';
  currency: 'VND';
  period: BusinessPeriod;
  course: InstructorRevenueCourse | null;
} & (
  | { scope: 'revenue' | 'sales_count'; totals: InstructorRevenueTotals }
  | { scope: 'top_courses'; totals: InstructorRevenueTotals; items: InstructorCourseSales[];
    total: number; page: number; limit: number; hasMore: boolean; topTiedCount: number }
  | { scope: 'compare'; metric: BusinessQuery['metric']; current: InstructorRevenueTotals;
    previous: InstructorRevenueTotals; previousPeriod: BusinessPeriod;
    change: { absolute: number; percent: number | null; direction: 'up' | 'down' | 'unchanged' | 'new' } }
  | { scope: 'selection'; items: InstructorRevenueCourse[]; total: number; page: number; limit: number; hasMore: boolean }
  | { scope: 'not_owned' }
);

export class ChatbotBusinessError extends Error {
  constructor(readonly code: 'CHATBOT_TOOL_ARGUMENTS_INVALID' | 'CHATBOT_INSTRUCTOR_FORBIDDEN'
    | 'CHATBOT_REVENUE_UNAVAILABLE' | 'CHATBOT_REVENUE_DATA_INCOMPLETE') {
    super(code);
  }
}
export class BusinessFollowUpError extends Error {
  constructor(readonly reason: 'missing_business_context' | 'missing_business_course' | 'invalid_business_position' | 'no_more_business') {
    super(reason);
  }
}
