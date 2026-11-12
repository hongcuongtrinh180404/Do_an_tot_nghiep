import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { RoleEnum } from 'share-lib';
import { ReviewController } from '../review.controller.js';
import { ReviewService } from '../services/review.service.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';

describe('Admin reviews HTTP contracts', () => {
  const reviewId = '607f1f77bcf86cd799439011';
  const review = {
    id: reviewId,
    rating: 4,
    comment: 'Nhận xét từ cơ sở dữ liệu',
    status: 'visible',
    user: { id: 'student-id', fullName: 'Học viên', email: 'student@example.com' },
    course: { id: 'course-id', title: 'Khóa học' },
  };
  const stats = {
    total: 7,
    visibleCount: 4,
    hiddenCount: 2,
    deletedCount: 1,
    reportedCount: 1,
    averageRating: 3.8,
  };
  const service = {
    adminGetStats: vi.fn(),
    adminGetReviews: vi.fn(),
    adminGetReviewDetail: vi.fn(),
  };
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReviewController],
      providers: [{ provide: ReviewService, useValue: service }],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    // Only authentication is stubbed; the real role guard and DTO validation still run.
    app.use((request: { headers: Record<string, string>; user?: { role: string } }, _response: unknown, next: () => void) => {
      const role = request.headers['x-test-role'];
      if (role) request.user = { role };
      next();
    });
    app.useGlobalGuards(new RolesGuard(new Reflector()));
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.listen(0, '127.0.0.1');
    baseUrl = `${await app.getUrl()}/api/v1/reviews/admin`;
  });

  beforeEach(() => {
    vi.resetAllMocks();
    service.adminGetStats.mockResolvedValue(stats);
    service.adminGetReviews.mockResolvedValue({ items: [review], total: 1, page: 2, limit: 5, totalPages: 1 });
    service.adminGetReviewDetail.mockResolvedValue(review);
  });

  afterAll(async () => { await app?.close(); });

  function request(path = '', role: string = RoleEnum.ADMIN) {
    return fetch(`${baseUrl}${path}`, { headers: { 'x-test-role': role } });
  }

  it('registers the stats route before the review ID route and returns service statistics', async () => {
    const response = await request('/stats');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, data: stats });
    expect(service.adminGetStats).toHaveBeenCalledOnce();
    expect(service.adminGetReviewDetail).not.toHaveBeenCalled();
  });

  it('passes pagination, search, status, star rating and sorting to the service', async () => {
    const params = new URLSearchParams({ page: '2', limit: '5', search: ' Học viên ', status: 'visible', rating: '4', sort: 'rating:asc' });
    const response = await request(`?${params}`);

    expect(response.status).toBe(200);
    expect(service.adminGetReviews).toHaveBeenCalledWith(expect.objectContaining({
      page: 2,
      limit: 5,
      search: 'Học viên',
      status: 'visible',
      rating: 4,
      sort: [{ orderBy: 'rating', order: 'asc' }],
    }));
    expect(await response.json()).toMatchObject({ success: true, data: { items: [review], total: 1 } });
  });

  it('returns populated review details from the service', async () => {
    const response = await request(`/${reviewId}`);

    expect(response.status).toBe(200);
    expect(service.adminGetReviewDetail).toHaveBeenCalledWith(reviewId);
    expect(await response.json()).toMatchObject({ success: true, data: review });
  });

  it.each(['', '/stats', `/${reviewId}`])('rejects a student accessing %s', async (path) => {
    expect((await request(path, RoleEnum.STUDENT)).status).toBe(403);
    expect(service.adminGetStats).not.toHaveBeenCalled();
    expect(service.adminGetReviews).not.toHaveBeenCalled();
    expect(service.adminGetReviewDetail).not.toHaveBeenCalled();
  });

  it.each(['?page=0', '?limit=101', '?rating=6', '?rating=invalid', '/invalid-id'])('rejects invalid query parameters or IDs: %s', async (path) => {
    expect((await request(path)).status).toBe(400);
    expect(service.adminGetReviews).not.toHaveBeenCalled();
    expect(service.adminGetReviewDetail).not.toHaveBeenCalled();
  });

  it('returns an actual empty response without inserting sample reviews', async () => {
    const empty = { items: [], total: 0, page: 1, limit: 10, totalPages: 1 };
    service.adminGetReviews.mockResolvedValue(empty);

    const response = await request();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, data: empty });
  });
});
