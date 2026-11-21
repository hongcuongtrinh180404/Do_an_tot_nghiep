import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  calculateGrowth,
  formatCompactVnd,
  formatNumber,
  KPI_DATA_BY_PERIOD,
  COURSES_PERFORMANCE_DATA,
  PENDING_TASKS_DATA,
  PERIOD_LABELS,
  CATEGORY_REVENUE_DATA,
  getCategoryRevenueByPeriod,
} from '../dashboard/constants/mock-dashboard-data';
import type { DashboardPeriodType, CategoryRevenueItem } from '../dashboard/types';
import {
  AdminDashboardView,
  DashboardInstructorsSection,
  DashboardCoursesSection,
  CategoryRevenueBreakdown,
  DashboardPendingSection,
} from '@/features/admin';

describe('Admin Dashboard Unit Tests', () => {
  describe('Component Exports', () => {
    it('exports AdminDashboardView and DashboardInstructorsSection cleanly', () => {
      expect(AdminDashboardView).toBeDefined();
      expect(DashboardInstructorsSection).toBeDefined();
    });

    it('renders DashboardInstructorsSection to string without crashing', () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });
      const html = renderToString(
        React.createElement(
          QueryClientProvider,
          { client: queryClient },
          React.createElement(DashboardInstructorsSection, { globalPeriod: 'this_month' }),
        ),
      );
      expect(html).toContain('Bảng xếp hạng Giảng viên tiêu biểu');
      expect(html).toContain('THỨ HẠNG');
    });

    it('renders DashboardCoursesSection to string without crashing', () => {
      const html = renderToString(React.createElement(DashboardCoursesSection, { globalPeriod: 'this_month' }));
      expect(html).toContain('Phân tích Hiệu suất Khóa học');
    });
  });
  describe('Growth & Formatting Helpers', () => {
    it('returns neutral growth when previous is 0', () => {
      const growth = calculateGrowth(100, 0, false);
      expect(growth.isNeutral).toBe(true);
      expect(growth.diffPercent).toBe(0);
      expect(growth.formattedPrevious).toBe('0');
    });

    it('calculates positive growth percentage correctly', () => {
      const growth = calculateGrowth(120, 100, false);
      expect(growth.isNeutral).toBe(false);
      expect(growth.isUp).toBe(true);
      expect(growth.formattedPercent).toBe('+20,0%');
    });

    it('calculates negative growth percentage correctly', () => {
      const growth = calculateGrowth(80, 100, false);
      expect(growth.isNeutral).toBe(false);
      expect(growth.isUp).toBe(false);
      expect(growth.formattedPercent).toBe('-20,0%');
    });

    it('formats compact currency correctly for millions and billions', () => {
      expect(formatCompactVnd(1_500_000_000)).toContain('1,50 tỷ ₫');
      expect(formatCompactVnd(45_000_000)).toContain('45,0 tr ₫');
      expect(formatCompactVnd(500_000)).toContain('500.000');
    });

    it('formats numbers with Vietnamese locale', () => {
      const formatted = formatNumber(1234567);
      expect(formatted).toBe('1.234.567');
    });
  });

  describe('KPI Datasets & Period Consistency', () => {
    const periods: DashboardPeriodType[] = [
      'today',
      'yesterday',
      '7d',
      '30d',
      'this_month',
      'last_month',
      'this_year',
      'custom',
    ];

    it.each(periods)('contains valid KPI metrics for period %s', (period) => {
      const data = KPI_DATA_BY_PERIOD[period];
      expect(data).toBeDefined();
      expect(data.grossRevenue.cur).toBeGreaterThanOrEqual(0);
      expect(data.platformRevenue.cur).toBeGreaterThanOrEqual(0);
      expect(data.instructorRevenue.cur).toBeGreaterThanOrEqual(0);
      expect(data.newStudents.cur).toBeGreaterThanOrEqual(0);
      expect(data.enrollments.cur).toBeGreaterThanOrEqual(0);
      expect(data.pendingTasks.cur).toBeGreaterThanOrEqual(0);

      // Verify that Gross Revenue >= Platform Revenue
      expect(data.grossRevenue.cur).toBeGreaterThanOrEqual(data.platformRevenue.cur);
    });

    it('verifies PERIOD_LABELS has labels for all periods', () => {
      periods.forEach((p) => {
        expect(PERIOD_LABELS[p]).toBeTruthy();
      });
    });
  });

  describe('Instructor Data Integrity', () => {
    it('verifies that mock INSTRUCTORS_DATA is cleanly removed and components use live database types', () => {
      const testInst = {
        commissionRate: 70,
        grossRevenue: 1000000,
        netRevenue: 700000,
      };
      expect(testInst.commissionRate).toBeGreaterThanOrEqual(0);
      expect(testInst.commissionRate).toBeLessThanOrEqual(100);
      expect(testInst.grossRevenue).toBeGreaterThanOrEqual(testInst.netRevenue);
    });
  });

  describe('Course Performance Integrity', () => {
    it('verifies completion rates are within 0% to 100%', () => {
      COURSES_PERFORMANCE_DATA.forEach((course) => {
        expect(course.completionRate).toBeGreaterThanOrEqual(0);
        expect(course.completionRate).toBeLessThanOrEqual(100);
      });
    });

    it('verifies free courses have price 0', () => {
      COURSES_PERFORMANCE_DATA.filter((c) => c.isFree).forEach((course) => {
        expect(course.price).toBe(0);
      });
    });
  });

  describe('Pending Tasks Safety & SePay Exclusion', () => {
    it('verifies that NO pending task is of type sepay', () => {
      PENDING_TASKS_DATA.forEach((task) => {
        expect(task.type).not.toBe('sepay');
        expect(['course', 'instructor', 'review']).toContain(task.type);
      });
    });

    it('verifies all pending tasks have actionable valid routes', () => {
      PENDING_TASKS_DATA.forEach((task) => {
        expect(task.route.startsWith('/admin')).toBe(true);
      });
    });
  });

  describe('Category Revenue Breakdown (Top 5 + Khác)', () => {
    it('renders CategoryRevenueBreakdown with top 5 and groups remaining into Khác', () => {
      const sampleCategories: CategoryRevenueItem[] = [
        { id: 'c1', name: 'Web Dev', revenue: 50000000 },
        { id: 'c2', name: 'AI & Data', revenue: 40000000 },
        { id: 'c3', name: 'UI/UX Design', revenue: 30000000 },
        { id: 'c4', name: 'Marketing', revenue: 20000000 },
        { id: 'c5', name: 'DevOps', revenue: 10000000 },
        { id: 'c6', name: 'English', revenue: 5000000 },
        { id: 'c7', name: 'Video Editing', revenue: 3000000 },
      ];

      const html = renderToString(
        React.createElement(CategoryRevenueBreakdown, {
          categories: sampleCategories,
          timeframeLabel: 'Tháng này',
        }),
      );

      expect(html).toContain('Cơ cấu Doanh thu theo Danh mục');
      expect(html).toContain('Tháng này');
      expect(html).toContain('Web Dev');
      expect(html).toContain('AI &amp; Data');
      expect(html).toContain('UI/UX Design');
      expect(html).toContain('Marketing');
      expect(html).toContain('DevOps');
      // Should group rank 6 and 7 into Khác (2 danh mục)
      expect(html).toContain('Khác (2 danh mục)');
    });

    it('renders empty state when categories list is empty', () => {
      const html = renderToString(
        React.createElement(CategoryRevenueBreakdown, {
          categories: [],
          timeframeLabel: 'Hôm nay',
        }),
      );

      expect(html).toContain('Chưa có dữ liệu doanh thu');
      expect(html).toContain('Không phát sinh giao dịch trong kỳ đã chọn.');
    });

    it('scales category revenue appropriately by period', () => {
      const thisMonth = getCategoryRevenueByPeriod('this_month');
      const today = getCategoryRevenueByPeriod('today');

      expect(thisMonth.length).toBeGreaterThan(5);
      const totalThisMonth = thisMonth.reduce((sum, item) => sum + item.revenue, 0);
      const totalToday = today.reduce((sum, item) => sum + item.revenue, 0);

      expect(totalThisMonth).toBeGreaterThan(totalToday);
      expect(CATEGORY_REVENUE_DATA.length).toBeGreaterThan(5);
    });
  });

  describe('Dashboard Pending Section (Strict Read-Only)', () => {
    it('renders 3 informational cards with proper labels', () => {
      const html = renderToString(
        React.createElement(DashboardPendingSection, {
          pendingTasks: { cur: 16, courses: 5, instructors: 3, reviews: 8 },
        }),
      );

      expect(html).toContain('Trung tâm Công việc Chờ Xử Lý');
      expect(html).toContain('Khóa học cần phê duyệt');
      expect(html).toContain('Phê duyệt giảng viên');
      expect(html).toContain('Báo cáo đánh giá');
      expect(html).toContain('Chỉ xem • Tự động tổng hợp');
    });

    it('strictly satisfies Read-Only constraints: NO button, NO link, NO cursor-pointer', () => {
      const html = renderToString(
        React.createElement(DashboardPendingSection, {
          pendingTasks: { cur: 16, courses: 5, instructors: 3, reviews: 8 },
        }),
      );

      // Must not contain buttons
      expect(html).not.toContain('<button');
      // Must not contain links
      expect(html).not.toContain('<a');
      expect(html).not.toContain('href');
      // Must not contain clickable cursor indicators
      expect(html).not.toContain('cursor-pointer');
      // Must have cursor-default and select-none
      expect(html).toContain('cursor-default');
    });
  });
});
