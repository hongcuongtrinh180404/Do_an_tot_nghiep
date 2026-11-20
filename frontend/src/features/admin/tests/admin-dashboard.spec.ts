import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  calculateGrowth,
  formatCompactVnd,
  formatNumber,
  KPI_DATA_BY_PERIOD,
  INSTRUCTORS_DATA,
  COURSES_PERFORMANCE_DATA,
  PENDING_TASKS_DATA,
  PERIOD_LABELS,
} from '../dashboard/constants/mock-dashboard-data';
import type { DashboardPeriodType } from '../dashboard/types';
import { AdminDashboardView, DashboardInstructorsSection, DashboardCoursesSection } from '@/features/admin';

describe('Admin Dashboard Unit Tests', () => {
  describe('Component Exports', () => {
    it('exports AdminDashboardView and DashboardInstructorsSection cleanly', () => {
      expect(AdminDashboardView).toBeDefined();
      expect(DashboardInstructorsSection).toBeDefined();
    });

    it('renders DashboardInstructorsSection to string without crashing', () => {
      const html = renderToString(React.createElement(DashboardInstructorsSection, { globalPeriod: 'this_month' }));
      expect(html).toContain('Bảng xếp hạng Giảng viên tiêu biểu');
      expect(html).toContain('Nguyễn Minh Quân');
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
    it('verifies all instructors have commission rates between 0 and 100', () => {
      INSTRUCTORS_DATA.forEach((inst) => {
        expect(inst.commissionRate).toBeGreaterThanOrEqual(0);
        expect(inst.commissionRate).toBeLessThanOrEqual(100);
      });
    });

    it('verifies grossRevenue is greater than or equal to netRevenue for all instructors', () => {
      INSTRUCTORS_DATA.forEach((inst) => {
        expect(inst.grossRevenue).toBeGreaterThanOrEqual(inst.netRevenue);
      });
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
});
