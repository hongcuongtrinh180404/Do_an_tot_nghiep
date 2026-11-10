import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Reflector } from '@nestjs/core';
import { RoleEnum } from 'share-lib';
import { ReviewController } from '../review.controller.js';
import { ReviewService } from '../services/review.service.js';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator.js';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator.js';

describe('ReviewController', () => {
  let controller: ReviewController;
  let mockService: Record<string, unknown>;
  const reflector = new Reflector();

  beforeEach(() => {
    mockService = {
      getCourseStats: vi.fn(),
      getCourseReviews: vi.fn(),
      checkEligibility: vi.fn(),
      getMyReview: vi.fn(),
      createReview: vi.fn(),
      updateReview: vi.fn(),
      deleteReview: vi.fn(),
    };

    controller = new ReviewController(mockService as unknown as ReviewService);
  });

  it('1. should have @Public() metadata on getCourseStats and getCourseReviews', () => {
    const isPublicStats = reflector.get<boolean>(IS_PUBLIC_KEY, ReviewController.prototype.getCourseStats);
    const isPublicReviews = reflector.get<boolean>(IS_PUBLIC_KEY, ReviewController.prototype.getCourseReviews);

    expect(isPublicStats).toBe(true);
    expect(isPublicReviews).toBe(true);
  });

  it('2. should have @Roles metadata on createReview, updateReview, and deleteReview', () => {
    const createRoles = reflector.get<RoleEnum[]>(ROLES_KEY, ReviewController.prototype.createReview);
    const updateRoles = reflector.get<RoleEnum[]>(ROLES_KEY, ReviewController.prototype.updateReview);
    const deleteRoles = reflector.get<RoleEnum[]>(ROLES_KEY, ReviewController.prototype.deleteReview);

    expect(createRoles).toContain(RoleEnum.STUDENT);
    expect(updateRoles).toContain(RoleEnum.STUDENT);
    expect(deleteRoles).toContain(RoleEnum.STUDENT);
  });

  it('3. should call service.getCourseStats', async () => {
    (mockService.getCourseStats as ReturnType<typeof vi.fn>).mockResolvedValue({
      averageRating: 4.8,
      totalReviews: 12,
    });

    const res = await controller.getCourseStats('course_1');

    expect(res.data.averageRating).toBe(4.8);
    expect(res.data.totalReviews).toBe(12);
  });

  it('4. should call service.createReview and return 201 Created ApiResponse', async () => {
    const mockCreated = { id: 'rev_1', rating: 5, comment: 'Tốt' };
    (mockService.createReview as ReturnType<typeof vi.fn>).mockResolvedValue(mockCreated);

    const res = await controller.createReview('course_1', 'user_1', { rating: 5, comment: 'Tốt' });

    expect(mockService.createReview).toHaveBeenCalledWith('user_1', 'course_1', { rating: 5, comment: 'Tốt' });
    expect(res.data).toEqual(mockCreated);
  });

  it('5. should call service.updateReview', async () => {
    const mockUpdated = { id: 'rev_1', rating: 4 };
    (mockService.updateReview as ReturnType<typeof vi.fn>).mockResolvedValue(mockUpdated);

    const res = await controller.updateReview('rev_1', 'user_1', { rating: 4 });

    expect(mockService.updateReview).toHaveBeenCalledWith('user_1', 'rev_1', { rating: 4 });
    expect(res.data).toEqual(mockUpdated);
  });

  it('6. should call service.deleteReview', async () => {
    (mockService.deleteReview as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const res = await controller.deleteReview('rev_1', 'user_1');

    expect(mockService.deleteReview).toHaveBeenCalledWith('user_1', 'rev_1');
    expect(res.data.success).toBe(true);
  });
});

