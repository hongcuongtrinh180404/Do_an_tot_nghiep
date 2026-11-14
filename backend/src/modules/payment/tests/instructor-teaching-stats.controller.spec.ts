import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InstructorTeachingStatsController } from '../instructor-teaching-stats.controller.js';
import { RevenueService } from '../services/revenue.service.js';

describe('InstructorTeachingStatsController', () => {
  let controller: InstructorTeachingStatsController;
  let mockRevenueService: {
    getInstructorTeachingOverview: ReturnType<typeof vi.fn>;
    getInstructorCoursesStats: ReturnType<typeof vi.fn>;
  };

  const instructorId = 'instructor_test_id';

  beforeEach(() => {
    mockRevenueService = {
      getInstructorTeachingOverview: vi.fn(),
      getInstructorCoursesStats: vi.fn(),
    };

    controller = new InstructorTeachingStatsController(
      mockRevenueService as unknown as RevenueService,
    );
  });

  describe('getOverview', () => {
    it('should call revenueService.getInstructorTeachingOverview and return wrapped ApiResponse', async () => {
      const mockOverview = {
        totalRevenue: 24500000,
        instructorEarnings: 17150000,
        successfulSales: 49,
        averageRating: 4.8,
        totalReviews: 32,
      };
      mockRevenueService.getInstructorTeachingOverview.mockResolvedValue(mockOverview);

      const res = await controller.getOverview(instructorId, { timeRange: 'all' });

      expect(mockRevenueService.getInstructorTeachingOverview).toHaveBeenCalledWith(
        instructorId,
        { timeRange: 'all' },
      );
      expect(res.data).toEqual(mockOverview);
      expect(res.success).toBe(true);
    });
  });

  describe('getCourses', () => {
    it('should call revenueService.getInstructorCoursesStats and return wrapped ApiResponse', async () => {
      const mockResult = {
        items: [
          {
            id: 'c1',
            title: 'NodeJS Master',
            status: 'PUBLISHED',
            price: 500000,
            thumbnailUrl: null,
            successfulSales: 10,
            totalRevenue: 5000000,
            instructorEarnings: 3500000,
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      mockRevenueService.getInstructorCoursesStats.mockResolvedValue(mockResult);

      const query = { timeRange: 'all', search: 'Node', sort: 'revenue_desc' as const, page: 1, limit: 10 };
      const res = await controller.getCourses(instructorId, query);

      expect(mockRevenueService.getInstructorCoursesStats).toHaveBeenCalledWith(
        instructorId,
        query,
      );
      expect(res.data).toEqual(mockResult);
      expect(res.success).toBe(true);
    });
  });
});
