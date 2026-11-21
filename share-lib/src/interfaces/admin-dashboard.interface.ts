export type DashboardPeriodType =
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

export type RevenueGroupBy = 'day' | 'month' | 'year';
export type RevenueChartType = 'line' | 'bar';

export interface IDashboardKpiData {
  grossRevenue: { cur: number; prev: number };
  platformRevenue: { cur: number; prev: number };
  instructorRevenue: { cur: number; prev: number };
  newStudents: { cur: number; prev: number };
  enrollments: { cur: number; prev: number; paid: number; free: number };
  pendingTasks: { cur: number; courses: number; instructors: number; reviews: number };
}

export interface IDashboardRevenueChartPoint {
  date: string;
  label: string;
  grossRevenue: number;
  platformRevenue: number;
  instructorRevenue: number;
  orderCount: number;
}

export interface IDashboardCoursePerformance {
  id: string;
  title: string;
  instructor: string;
  category: string;
  price: number;
  isFree: boolean;
  thumbnailBg: string;
  thumbnailText: string;
  salesCount: number;
  revenue: number;
  newEnrollments: number;
  totalOwned: number;
  startedLearners: number;
  completedLearners: number;
  completionRate: number;
  rating: number;
  reviewCount: number;
}

export type PendingTaskCategory = 'course' | 'instructor' | 'review';

export interface IDashboardPendingTask {
  id: string;
  type: PendingTaskCategory;
  title: string;
  actor: string;
  timeAgo: string;
  badgeLabel: string;
  route: string;
}

export interface CategoryRevenueItem {
  id: string;
  name: string;
  revenue: number;
}

export interface IAdminDashboardAggregateResponse {
  kpis: IDashboardKpiData;
  chartSeries: IDashboardRevenueChartPoint[];
  categoryRevenue: CategoryRevenueItem[];
  pendingTasks: IDashboardPendingTask[];
  courses: IDashboardCoursePerformance[];
}
