import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { DashboardCoursesSection } from '../dashboard/components/dashboard-courses-section';
import { DashboardReviewsSection } from '../dashboard/components/dashboard-reviews-section';
import { DashboardPendingDrawer } from '../dashboard/components/dashboard-pending-drawer';
import type { IDashboardCoursePerformance, IDashboardPendingTask } from '../dashboard/types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe('Admin Dashboard Real Data Integration Tests', () => {
  const mockRealCourses: IDashboardCoursePerformance[] = [
    {
      id: 'crs-real-1',
      title: 'Khóa học Thực Chiến React 19',
      instructor: 'Trần Văn Thực',
      category: 'Frontend',
      price: 599000,
      isFree: false,
      thumbnailBg: 'bg-primary/10 text-primary',
      thumbnailText: 'React',
      salesCount: 15,
      revenue: 8985000,
      newEnrollments: 15,
      totalOwned: 30,
      startedLearners: 25,
      completedLearners: 18,
      completionRate: 72.0,
      rating: 4.85,
      reviewCount: 8,
    },
    {
      id: 'crs-real-2',
      title: 'Khóa học Miễn Phí Git Cơ Bản',
      instructor: 'Nguyễn Văn Git',
      category: 'DevOps',
      price: 0,
      isFree: true,
      thumbnailBg: 'bg-emerald-50 text-emerald-700',
      thumbnailText: 'Git',
      salesCount: 0,
      revenue: 0,
      newEnrollments: 50,
      totalOwned: 120,
      startedLearners: 100,
      completedLearners: 80,
      completionRate: 80.0,
      rating: 4.95,
      reviewCount: 22,
    },
  ];

  const mockRealPendingTasks: IDashboardPendingTask[] = [
    {
      id: 'task-real-1',
      type: 'course',
      title: 'Khóa học Microservices với Go',
      actor: 'Lê Văn Go',
      timeAgo: '15 phút trước',
      badgeLabel: 'Khóa học chờ duyệt',
      route: '/admin/courses?status=pending_approval',
    },
    {
      id: 'task-real-2',
      type: 'instructor',
      title: 'Hồ sơ đăng ký Giảng viên: Hoàng Văn AI',
      actor: 'Hoàng Văn AI',
      timeAgo: '1 giờ trước',
      badgeLabel: 'Hồ sơ giảng viên',
      route: '/admin/instructors',
    },
  ];

  describe('DashboardCoursesSection with Real Data', () => {
    it('renders real courses with exact title and revenue', () => {
      const html = renderToString(
        React.createElement(DashboardCoursesSection, {
          globalPeriod: 'this_month',
          courses: mockRealCourses,
        }),
      );

      expect(html).toContain('Khóa học Thực Chiến React 19');
      expect(html).toContain('Trần Văn Thực');
      expect(html).toContain('8.985.000');
    });

    it('renders empty state when real courses list is empty', () => {
      const html = renderToString(
        React.createElement(DashboardCoursesSection, {
          globalPeriod: 'today',
          courses: [],
        }),
      );

      expect(html).toContain('Chưa có dữ liệu hiệu suất khóa học nào trong khoảng thời gian này');
    });
  });

  describe('DashboardReviewsSection with Real Data', () => {
    it('renders top rated real courses', () => {
      const html = renderToString(
        React.createElement(DashboardReviewsSection, {
          globalPeriod: 'this_month',
          courses: mockRealCourses,
        }),
      );

      expect(html).toContain('Khóa học Miễn Phí Git Cơ Bản');
      expect(html).toContain('4.95');
      expect(html).toContain('★');
    });

    it('renders empty state when no courses match rating threshold', () => {
      const html = renderToString(
        React.createElement(DashboardReviewsSection, {
          globalPeriod: 'this_month',
          courses: [],
        }),
      );

      expect(html).toContain('Không có khóa học nào đạt ngưỡng');
    });
  });

  describe('DashboardPendingDrawer with Real Data', () => {
    it('renders real pending task cards and counts', () => {
      const html = renderToString(
        React.createElement(DashboardPendingDrawer, {
          isOpen: true,
          onClose: () => {},
          tasks: mockRealPendingTasks,
        }),
      );

      expect(html).toContain('Khóa học Microservices với Go');
      expect(html).toContain('Hồ sơ đăng ký Giảng viên: Hoàng Văn AI');
      expect(html).toContain('2'); // total count
    });

    it('renders empty state when no pending tasks exist in DB', () => {
      const html = renderToString(
        React.createElement(DashboardPendingDrawer, {
          isOpen: true,
          onClose: () => {},
          tasks: [],
        }),
      );

      expect(html).toContain('Không có công việc nào đang chờ xử lý');
    });
  });
});
