import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { RoleEnum, UserStatusEnum } from 'share-lib';
import { RevenueService } from '../services/revenue.service.js';
import { CommissionSettingRepository } from '../repositories/commission-setting.repository.js';
import { CommissionHistoryRepository } from '../repositories/commission-history.repository.js';
import { OrderRepository } from '../../enrollment/repositories/order.repository.js';
import { UserRepository } from '../../user/repositories/user.repository.js';
import { ReviewRepository } from '../../review/repositories/review.repository.js';

describe('RevenueService', () => {
  let service: RevenueService;
  let commissionSettingRepo: {
    getCurrentSetting: ReturnType<typeof vi.fn>;
    updateDefaultRate: ReturnType<typeof vi.fn>;
    withTransaction: ReturnType<typeof vi.fn>;
  };
  let commissionHistoryRepo: {
    findByInstructorId: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  let orderRepo: {
    getRevenueOverview: ReturnType<typeof vi.fn>;
    getRevenueChart: ReturnType<typeof vi.fn>;
    findSuccessfulTransactions: ReturnType<typeof vi.fn>;
    findRevenueTransactionDetail: ReturnType<typeof vi.fn>;
    getInstructorsRevenueStats: ReturnType<typeof vi.fn>;
    getInstructorRevenueKpi: ReturnType<typeof vi.fn>;
    getInstructorCoursesRevenue: ReturnType<typeof vi.fn>;
    getInstructorTransactions: ReturnType<typeof vi.fn>;
  };
  let userRepo: {
    findById: ReturnType<typeof vi.fn>;
    updateCommissionRate: ReturnType<typeof vi.fn>;
    updateAllInstructorsCommissionRate: ReturnType<typeof vi.fn>;
  };
  let reviewRepo: {
    calculateInstructorReviewStats: ReturnType<typeof vi.fn>;
    findInstructorReviews: ReturnType<typeof vi.fn>;
  };
  let cls: ClsService;

  const mockAdminId = '000000000000000000000001';
  const mockInstructorId = '000000000000000000000002';

  beforeEach(() => {
    commissionSettingRepo = {
      getCurrentSetting: vi.fn(),
      updateDefaultRate: vi.fn(),
      withTransaction: vi.fn(async (cb) => cb({} as any)),
    };

    commissionHistoryRepo = {
      findByInstructorId: vi.fn(),
      create: vi.fn(),
    };

    orderRepo = {
      getRevenueOverview: vi.fn(),
      getRevenueChart: vi.fn(),
      findSuccessfulTransactions: vi.fn(),
      findRevenueTransactionDetail: vi.fn(),
      getInstructorsRevenueStats: vi.fn(),
      getInstructorRevenueKpi: vi.fn(),
      getInstructorCoursesRevenue: vi.fn(),
      getInstructorTransactions: vi.fn(),
    };

    userRepo = {
      findById: vi.fn(),
      updateCommissionRate: vi.fn(),
      updateAllInstructorsCommissionRate: vi.fn(),
    };

    reviewRepo = {
      calculateInstructorReviewStats: vi.fn().mockResolvedValue({
        averageRating: 4.8,
        totalReviews: 25,
        distribution: [
          { stars: 5, count: 20, percentage: 80 },
          { stars: 4, count: 5, percentage: 20 },
          { stars: 3, count: 0, percentage: 0 },
          { stars: 2, count: 0, percentage: 0 },
          { stars: 1, count: 0, percentage: 0 },
        ],
      }),
      findInstructorReviews: vi.fn(),
    };

    cls = {
      get: vi.fn().mockReturnValue(mockAdminId),
    } as unknown as ClsService;

    service = new RevenueService(
      commissionSettingRepo as unknown as CommissionSettingRepository,
      commissionHistoryRepo as unknown as CommissionHistoryRepository,
      orderRepo as unknown as OrderRepository,
      userRepo as unknown as UserRepository,
      reviewRepo as unknown as ReviewRepository,
      cls,
    );
  });

  describe('getOverview', () => {
    it('should return KPI metrics for the date range', async () => {
      const mockKpi = {
        totalRevenue: 5000000,
        platformCommission: 1500000,
        instructorEarnings: 3500000,
        successfulOrders: 10,
      };
      orderRepo.getRevenueOverview.mockResolvedValue(mockKpi);

      const result = await service.getOverview({ timeRange: '30days' });
      expect(result).toEqual(mockKpi);
      expect(orderRepo.getRevenueOverview).toHaveBeenCalledTimes(1);
      expect(orderRepo.getRevenueOverview).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
      );
    });

    it.each(['all', 'all_time'])('should query all-time metrics for %s', async (timeRange) => {
      const mockKpi = {
        totalRevenue: 5000000,
        platformCommission: 1500000,
        instructorEarnings: 3500000,
        successfulOrders: 10,
      };
      orderRepo.getRevenueOverview.mockResolvedValue(mockKpi);

      const result = await service.getOverview({ timeRange });

      expect(result).toEqual(mockKpi);
      expect(orderRepo.getRevenueOverview).toHaveBeenCalledWith(undefined, undefined);
    });
  });

  describe('getChart', () => {
    it('should return chart items and fill missing dates with zeros', async () => {
      orderRepo.getRevenueChart.mockResolvedValue([
        {
          date: '2026-11-10',
          label: '2026-11-10',
          totalRevenue: 1000000,
          platformCommission: 300000,
          instructorEarnings: 700000,
          orderCount: 2,
        },
      ]);

      const result = await service.getChart({
        timeRange: 'custom',
        startDate: '2026-11-10',
        endDate: '2026-11-12',
      });

      expect(result.length).toBe(3);
      expect(result[0].date).toBe('2026-11-10');
      expect(result[0].totalRevenue).toBe(1000000);
      expect(result[1].date).toBe('2026-11-11');
      expect(result[1].totalRevenue).toBe(0);
      expect(result[2].date).toBe('2026-11-12');
      expect(result[2].totalRevenue).toBe(0);
    });
  });

  describe('getTransactions', () => {
    it('should query successful transactions with pagination', async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };
      orderRepo.findSuccessfulTransactions.mockResolvedValue(mockResult);

      const result = await service.getTransactions({ page: 1, limit: 10, search: 'React' });
      expect(result).toEqual(mockResult);
      expect(orderRepo.findSuccessfulTransactions).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'React', page: 1, limit: 10 }),
      );
    });
  });

  describe('getTransactionDetail', () => {
    it('should return transaction detail when order exists', async () => {
      const mockDetail = {
        orderCode: 'MDL-001',
        amountDue: 500000,
        platformCommissionRate: 30,
        platformEarnings: 150000,
        instructorEarnings: 350000,
      };
      orderRepo.findRevenueTransactionDetail.mockResolvedValue(mockDetail);

      const result = await service.getTransactionDetail('MDL-001');
      expect(result).toEqual(mockDetail);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      orderRepo.findRevenueTransactionDetail.mockResolvedValue(null);
      await expect(service.getTransactionDetail('NON_EXISTENT')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getInstructors', () => {
    it('should return paginated instructor revenue stats', async () => {
      const mockResult = {
        items: [
          {
            id: mockInstructorId,
            fullName: 'Trần Văn B',
            email: 'instructor@example.com',
            totalCourses: 3,
            successfulSales: 5,
            totalRevenue: 2500000,
            commissionRate: 30,
            lastTransactionDate: '2026-11-11 14:00:00',
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };
      orderRepo.getInstructorsRevenueStats.mockResolvedValue(mockResult);

      const result = await service.getInstructors({ page: 1, limit: 10 });
      expect(result).toEqual(mockResult);
    });
  });

  describe('getInstructorDetail', () => {
    it('should return instructor details and KPIs', async () => {
      userRepo.findById.mockResolvedValue({
        id: mockInstructorId,
        fullName: 'Trần Văn B',
        email: 'instructor@example.com',
        role: RoleEnum.INSTRUCTOR,
        status: UserStatusEnum.ACTIVE,
        createdAt: new Date('2026-01-01'),
        commissionRate: 25,
      });

      orderRepo.getInstructorRevenueKpi.mockResolvedValue({
        totalRevenue: 2500000,
        instructorEarnings: 1875000,
        totalCourses: 2,
        successfulSales: 5,
      });

      const result = await service.getInstructorDetail(mockInstructorId, { timeRange: '30days' });
      expect(result.instructor.fullName).toBe('Trần Văn B');
      expect(result.instructor.commissionRate).toBe(25);
      expect(result.kpi.totalRevenue).toBe(2500000);
    });

    it('should throw NotFoundException if user is not an instructor', async () => {
      userRepo.findById.mockResolvedValue({
        id: mockInstructorId,
        role: RoleEnum.STUDENT,
      });

      await expect(
        service.getInstructorDetail(mockInstructorId, { timeRange: '30days' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('commissionConfig', () => {
    it('should return default 30% if no config exists', async () => {
      commissionSettingRepo.getCurrentSetting.mockResolvedValue(null);
      const config = await service.getCommissionConfig();
      expect(config.defaultRate).toBe(30);
    });

    it('should update default rate, apply to all instructors, create system history, and reject identical rate', async () => {
      commissionSettingRepo.getCurrentSetting.mockResolvedValue({ defaultRate: 30 });

      await expect(
        service.updateCommissionConfig({ defaultRate: 30 }, mockAdminId),
      ).rejects.toThrow(BadRequestException);

      commissionSettingRepo.updateDefaultRate.mockResolvedValue({
        defaultRate: 25,
        updatedAt: new Date(),
      });
      userRepo.findById.mockResolvedValue({ fullName: 'Admin User' });
      userRepo.updateAllInstructorsCommissionRate.mockResolvedValue(5);

      const updated = await service.updateCommissionConfig(
        { defaultRate: 25, reason: 'Chính sách Q4' },
        mockAdminId,
      );
      expect(updated.defaultRate).toBe(25);
      expect(commissionSettingRepo.updateDefaultRate).toHaveBeenCalledWith(25, mockAdminId, expect.anything());
      expect(userRepo.updateAllInstructorsCommissionRate).toHaveBeenCalledWith(25, mockAdminId, expect.anything());
      expect(commissionHistoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          targetType: 'SYSTEM',
          oldRate: 30,
          newRate: 25,
          reason: 'Chính sách Q4',
          appliedById: mockAdminId,
        }),
        expect.anything(),
      );
    });
  });

  describe('updateInstructorCommission', () => {
    it('should reject if new rate is same as current rate', async () => {
      userRepo.findById.mockResolvedValue({
        id: mockInstructorId,
        role: RoleEnum.INSTRUCTOR,
        commissionRate: 30,
      });

      await expect(
        service.updateInstructorCommission(
          mockInstructorId,
          { commissionRate: 30, reason: 'Test reason' },
          mockAdminId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update instructor commission and write history entry', async () => {
      userRepo.findById.mockResolvedValue({
        id: mockInstructorId,
        role: RoleEnum.INSTRUCTOR,
        commissionRate: 30,
      });

      const result = await service.updateInstructorCommission(
        mockInstructorId,
        { commissionRate: 25, reason: 'Giảng viên xuất sắc' },
        mockAdminId,
      );

      expect(result.commissionRate).toBe(25);
      expect(userRepo.updateCommissionRate).toHaveBeenCalledWith(
        mockInstructorId,
        25,
        mockAdminId,
        expect.anything(),
      );
      expect(commissionHistoryRepo.create).toHaveBeenCalledWith(
        {
          instructorId: mockInstructorId,
          oldRate: 30,
          newRate: 25,
          reason: 'Giảng viên xuất sắc',
          appliedById: mockAdminId,
        },
        expect.anything(),
      );
    });
  });

  describe('getInstructorTeachingOverview', () => {
    it('should throw NotFoundException if instructor not found', async () => {
      userRepo.findById.mockResolvedValue(null);
      await expect(
        service.getInstructorTeachingOverview('nonexistent', { timeRange: 'all' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return combined KPI and review stats for teaching overview', async () => {
      userRepo.findById.mockResolvedValue({
        id: mockInstructorId,
        role: RoleEnum.INSTRUCTOR,
      });

      orderRepo.getInstructorRevenueKpi.mockResolvedValue({
        totalRevenue: 10000000,
        instructorEarnings: 7000000,
        totalCourses: 5,
        successfulSales: 20,
      });

      const overview = await service.getInstructorTeachingOverview(mockInstructorId, {
        timeRange: 'all',
      });

      expect(overview).toEqual({
        totalRevenue: 10000000,
        instructorEarnings: 7000000,
        successfulSales: 20,
        averageRating: 4.8,
        totalReviews: 25,
      });
      expect(orderRepo.getInstructorRevenueKpi).toHaveBeenCalled();
      expect(reviewRepo.calculateInstructorReviewStats).toHaveBeenCalledWith(mockInstructorId);
    });
  });

  describe('getInstructorCoursesStats', () => {
    it('should query instructor courses revenue with search and sort', async () => {
      userRepo.findById.mockResolvedValue({
        id: mockInstructorId,
        role: RoleEnum.INSTRUCTOR,
      });

      orderRepo.getInstructorCoursesRevenue.mockResolvedValue({
        items: [
          {
            id: 'c1',
            title: 'Khóa học React Pro',
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
      });

      const result = await service.getInstructorCoursesStats(mockInstructorId, {
        timeRange: 'all',
        search: 'React',
        sort: 'revenue_desc',
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].instructorEarnings).toBe(3500000);
      expect(orderRepo.getInstructorCoursesRevenue).toHaveBeenCalledWith(
        mockInstructorId,
        undefined,
        undefined,
        1,
        10,
        'React',
        'revenue_desc',
      );
    });
  });
});
