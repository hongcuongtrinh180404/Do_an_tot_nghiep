import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InstructorTeachingStatsController } from '../instructor-teaching-stats.controller.js';
import { RevenueService } from '../services/revenue.service.js';
import { InstructorRevenueDataError } from '../utils/instructor-revenue.pipeline.js';

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
    it('should call revenueService.getInstructorTeachingOverview and return wrapped ApiResponse for all', async () => {
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

    it('should call revenueService.getInstructorTeachingOverview with today', async () => {
      const mockOverview = {
        totalRevenue: 500000,
        instructorEarnings: 350000,
        successfulSales: 1,
        averageRating: 5.0,
        totalReviews: 1,
      };
      mockRevenueService.getInstructorTeachingOverview.mockResolvedValue(mockOverview);

      const res = await controller.getOverview(instructorId, { timeRange: 'today' });

      expect(mockRevenueService.getInstructorTeachingOverview).toHaveBeenCalledWith(
        instructorId,
        { timeRange: 'today' },
      );
      expect(res.data).toEqual(mockOverview);
      expect(res.success).toBe(true);
    });

    it('should call revenueService.getInstructorTeachingOverview with custom date range', async () => {
      const mockOverview = {
        totalRevenue: 1200000,
        instructorEarnings: 840000,
        successfulSales: 3,
        averageRating: 4.9,
        totalReviews: 5,
      };
      mockRevenueService.getInstructorTeachingOverview.mockResolvedValue(mockOverview);

      const query = {
        timeRange: 'custom',
        startDate: '2026-11-01',
        endDate: '2026-11-22',
      };
      const res = await controller.getOverview(instructorId, query);

      expect(mockRevenueService.getInstructorTeachingOverview).toHaveBeenCalledWith(
        instructorId,
        query,
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

    it('should call revenueService.getInstructorCoursesStats with custom date range', async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      mockRevenueService.getInstructorCoursesStats.mockResolvedValue(mockResult);

      const query = {
        timeRange: 'custom',
        startDate: '2026-11-01',
        endDate: '2026-11-22',
        page: 1,
        limit: 10,
      };
      const res = await controller.getCourses(instructorId, query);

      expect(mockRevenueService.getInstructorCoursesStats).toHaveBeenCalledWith(
        instructorId,
        query,
      );
      expect(res.data).toEqual(mockResult);
      expect(res.success).toBe(true);
    });
  });

  describe.each(['overview', 'courses'] as const)('%s errors', (endpoint) => {
    function read() {
      return endpoint === 'overview'
        ? controller.getOverview(instructorId, { timeRange: 'today' })
        : controller.getCourses(instructorId, { timeRange: 'today', page: 1, limit: 10 });
    }

    function serviceMock() {
      return endpoint === 'overview'
        ? mockRevenueService.getInstructorTeachingOverview
        : mockRevenueService.getInstructorCoursesStats;
    }

    it.each(['missing_payment_date', 'invalid_money'] as const)(
      'returns a non-retryable 422 business error for %s instead of a generic 500',
      async (reason) => {
        serviceMock().mockRejectedValue(new InstructorRevenueDataError(reason));

        const result = read();
        await expect(result).rejects.toBeInstanceOf(UnprocessableEntityException);
        await expect(result).rejects.toMatchObject({
          status: 422,
          response: {
            statusCode: 422,
            code: 'INSTRUCTOR_REVENUE_DATA_INCOMPLETE',
            reason,
            message: expect.stringContaining('đối soát'),
          },
        });
        expect(serviceMock()).toHaveBeenCalledTimes(1);
      },
    );

    it('preserves account and unexpected infrastructure errors', async () => {
      const notFound = new NotFoundException('Không tìm thấy thông tin giảng viên');
      serviceMock().mockRejectedValueOnce(notFound);
      await expect(read()).rejects.toBe(notFound);

      const unavailable = new Error('Database unavailable');
      serviceMock().mockRejectedValueOnce(unavailable);
      await expect(read()).rejects.toBe(unavailable);
    });
  });
});
