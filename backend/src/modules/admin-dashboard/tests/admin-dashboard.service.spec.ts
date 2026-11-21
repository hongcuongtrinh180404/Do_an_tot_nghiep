import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClsService } from 'nestjs-cls';
import { AdminDashboardService } from '../services/admin-dashboard.service.js';
import { AdminDashboardRepository } from '../repositories/admin-dashboard.repository.js';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;
  let repo: {
    getRevenueKpi: ReturnType<typeof vi.fn>;
    getNewStudentsCount: ReturnType<typeof vi.fn>;
    getEnrollmentsStats: ReturnType<typeof vi.fn>;
    getPendingTasksCounts: ReturnType<typeof vi.fn>;
    getRevenueChartPoints: ReturnType<typeof vi.fn>;
    getCategoryRevenue: ReturnType<typeof vi.fn>;
    getRecentPendingTasks: ReturnType<typeof vi.fn>;
    getCoursesPerformance: ReturnType<typeof vi.fn>;
  };
  let cls: ClsService;

  beforeEach(() => {
    repo = {
      getRevenueKpi: vi.fn(),
      getNewStudentsCount: vi.fn(),
      getEnrollmentsStats: vi.fn(),
      getPendingTasksCounts: vi.fn(),
      getRevenueChartPoints: vi.fn(),
      getCategoryRevenue: vi.fn(),
      getRecentPendingTasks: vi.fn(),
      getCoursesPerformance: vi.fn(),
    };

    cls = {
      get: vi.fn().mockReturnValue('mock-admin-id'),
    } as unknown as ClsService;

    service = new AdminDashboardService(
      repo as unknown as AdminDashboardRepository,
      cls,
    );
  });

  describe('getAggregate', () => {
    it('aggregates real data from all collections for the selected period', async () => {
      // Arrange
      repo.getRevenueKpi
        .mockResolvedValueOnce({
          totalRevenue: 50000000,
          platformCommission: 15000000,
          instructorEarnings: 35000000,
          successfulOrders: 25,
        })
        .mockResolvedValueOnce({
          totalRevenue: 40000000,
          platformCommission: 12000000,
          instructorEarnings: 28000000,
          successfulOrders: 20,
        });

      repo.getNewStudentsCount
        .mockResolvedValueOnce(15) // current
        .mockResolvedValueOnce(10); // previous

      repo.getEnrollmentsStats
        .mockResolvedValueOnce({ total: 30, paid: 25, free: 5 }) // current
        .mockResolvedValueOnce({ total: 22, paid: 20, free: 2 }); // previous

      repo.getPendingTasksCounts.mockResolvedValue({
        cur: 6,
        courses: 2,
        instructors: 1,
        reviews: 3,
      });

      repo.getRevenueChartPoints.mockResolvedValue([
        {
          date: '2026-11-01',
          label: '01/11',
          grossRevenue: 50000000,
          platformRevenue: 15000000,
          instructorRevenue: 35000000,
          orderCount: 25,
        },
      ]);

      repo.getCategoryRevenue.mockResolvedValue([
        { id: 'cat-1', name: 'Lập trình Backend', revenue: 35000000 },
        { id: 'cat-2', name: 'Trí tuệ nhân tạo', revenue: 15000000 },
      ]);

      repo.getRecentPendingTasks.mockResolvedValue([
        {
          id: 'c-1',
          type: 'course',
          title: 'Khóa học Node.js nâng cao',
          actor: 'Giảng viên A',
          timeAgo: '1 giờ trước',
          badgeLabel: 'Khóa học chờ duyệt',
          route: '/admin/courses?status=pending_approval',
        },
      ]);

      repo.getCoursesPerformance.mockResolvedValue([
        {
          id: 'crs-1',
          title: 'Node.js Mastery',
          instructor: 'Giảng viên A',
          category: 'Backend',
          price: 500000,
          isFree: false,
          thumbnailBg: 'bg-primary/10 text-primary',
          thumbnailText: 'Node',
          salesCount: 25,
          revenue: 12500000,
          newEnrollments: 25,
          totalOwned: 50,
          startedLearners: 40,
          completedLearners: 30,
          completionRate: 75.0,
          rating: 4.8,
          reviewCount: 12,
        },
      ]);

      // Act
      const result = await service.getAggregate({ period: 'this_month' });

      // Assert
      expect(result).toBeDefined();
      expect(result.kpis.grossRevenue.cur).toBe(50000000);
      expect(result.kpis.grossRevenue.prev).toBe(40000000);
      expect(result.kpis.newStudents.cur).toBe(15);
      expect(result.kpis.newStudents.prev).toBe(10);
      expect(result.kpis.enrollments.paid).toBe(25);
      expect(result.kpis.enrollments.free).toBe(5);
      expect(result.kpis.pendingTasks.courses).toBe(2);
      expect(result.kpis.pendingTasks.cur).toBe(6);
      expect(result.categoryRevenue).toHaveLength(2);
      expect(result.courses).toHaveLength(1);
      expect(result.pendingTasks).toHaveLength(1);
    });

    it('returns zero metrics gracefully when database has 0 records', async () => {
      // Arrange
      repo.getRevenueKpi.mockResolvedValue({
        totalRevenue: 0,
        platformCommission: 0,
        instructorEarnings: 0,
        successfulOrders: 0,
      });
      repo.getNewStudentsCount.mockResolvedValue(0);
      repo.getEnrollmentsStats.mockResolvedValue({ total: 0, paid: 0, free: 0 });
      repo.getPendingTasksCounts.mockResolvedValue({
        cur: 0,
        courses: 0,
        instructors: 0,
        reviews: 0,
      });
      repo.getRevenueChartPoints.mockResolvedValue([]);
      repo.getCategoryRevenue.mockResolvedValue([]);
      repo.getRecentPendingTasks.mockResolvedValue([]);
      repo.getCoursesPerformance.mockResolvedValue([]);

      // Act
      const result = await service.getAggregate({ period: 'today' });

      // Assert
      expect(result.kpis.grossRevenue.cur).toBe(0);
      expect(result.kpis.grossRevenue.prev).toBe(0);
      expect(result.kpis.newStudents.cur).toBe(0);
      expect(result.kpis.enrollments.cur).toBe(0);
      expect(result.kpis.pendingTasks.cur).toBe(0);
      expect(result.categoryRevenue).toEqual([]);
      expect(result.pendingTasks).toEqual([]);
      expect(result.courses).toEqual([]);
    });
  });

  describe('getCoursesPerformance', () => {
    it('sorts by revenue when tab=revenue', async () => {
      // Arrange
      repo.getCoursesPerformance.mockResolvedValue([
        { id: '1', title: 'Course A', price: 100, isFree: false, revenue: 1000, newEnrollments: 10, completionRate: 50 },
        { id: '2', title: 'Course B', price: 200, isFree: false, revenue: 3000, newEnrollments: 5, completionRate: 20 },
      ]);

      // Act
      const result = await service.getCoursesPerformance({ tab: 'revenue' });

      // Assert
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('1');
    });

    it('sorts by completionRate when tab=completion', async () => {
      // Arrange
      repo.getCoursesPerformance.mockResolvedValue([
        { id: '1', title: 'Course A', price: 100, isFree: false, revenue: 1000, newEnrollments: 10, completionRate: 50 },
        { id: '2', title: 'Course B', price: 200, isFree: false, revenue: 3000, newEnrollments: 5, completionRate: 85 },
      ]);

      // Act
      const result = await service.getCoursesPerformance({ tab: 'completion' });

      // Assert
      expect(result[0].id).toBe('2');
      expect(result[0].completionRate).toBe(85);
    });
  });
});
