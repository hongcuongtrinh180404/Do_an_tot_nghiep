import { describe, it, expect, vi, beforeEach } from 'vitest';
import { type Model } from 'mongoose';
import { OrderStatusEnum } from 'share-lib';
import { OrderRepository } from '../repositories/order.repository.js';
import { type OrderEntity } from '../schemas/order.schema.js';

describe('OrderRepository', () => {
  let repository: OrderRepository;
  let mockModel: { aggregate: ReturnType<typeof vi.fn> };
  let exec: ReturnType<typeof vi.fn>;

  const mockKpi = {
    totalRevenue: 5000000,
    platformCommission: 1500000,
    instructorEarnings: 3500000,
    successfulOrders: 10,
  };

  beforeEach(() => {
    exec = vi.fn().mockResolvedValue([mockKpi]);
    mockModel = { aggregate: vi.fn().mockReturnValue({ exec }) };
    repository = new OrderRepository(mockModel as unknown as Model<OrderEntity>);
  });

  describe('getRevenueOverview', () => {
    it('should filter paid, non-deleted orders by the requested date range', async () => {
      const startDate = new Date('2026-11-01T00:00:00+07:00');
      const endDate = new Date('2026-11-12T23:59:59.999+07:00');

      const result = await repository.getRevenueOverview(startDate, endDate);

      expect(result).toEqual(mockKpi);
      expect(mockModel.aggregate).toHaveBeenCalledWith(expect.arrayContaining([
        {
          $match: {
            status: OrderStatusEnum.PAID,
            deletedAt: null,
            $or: [
              { paidAt: { $gte: startDate, $lte: endDate } },
              { paidAt: null, createdAt: { $gte: startDate, $lte: endDate } },
            ],
          },
        },
      ]));
    });

    it('should query all paid, non-deleted orders when no date range is provided', async () => {
      const result = await repository.getRevenueOverview(undefined, undefined);

      expect(result).toEqual(mockKpi);
      expect(mockModel.aggregate).toHaveBeenCalledWith(expect.arrayContaining([
        {
          $match: {
            status: OrderStatusEnum.PAID,
            deletedAt: null,
          },
        },
      ]));
    });

    it('should return zero metrics when no orders match', async () => {
      exec.mockResolvedValue([]);

      await expect(repository.getRevenueOverview(undefined, undefined)).resolves.toEqual({
        totalRevenue: 0,
        platformCommission: 0,
        instructorEarnings: 0,
        successfulOrders: 0,
      });
    });
  });
});
