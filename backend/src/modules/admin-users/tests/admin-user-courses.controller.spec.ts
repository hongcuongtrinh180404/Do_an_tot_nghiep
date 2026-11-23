import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';
import { RoleEnum } from 'share-lib';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { InstructorRevenueDataError } from '../../payment/utils/instructor-revenue.pipeline.js';
import { AdminUserCoursesController } from '../admin-user-courses.controller.js';
import { AdminUserCoursesService } from '../services/admin-user-courses.service.js';

describe('Admin user course HTTP contracts', () => {
  const userId = '607f1f77bcf86cd799439011';
  const otherId = '607f1f77bcf86cd799439012';
  const service = { getEnrolledCourses: vi.fn(), getTeaching: vi.fn() };
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminUserCoursesController],
      providers: [{ provide: AdminUserCoursesService, useValue: service }],
    }).compile();
    app = module.createNestApplication();
    app.use((req: Request & { user?: { id: string; role: string } }, _res: Response, next: NextFunction) => {
      const role = req.header('x-test-role');
      if (role) req.user = { id: 'the-viewing-admin', role };
      next();
    });
    app.useGlobalGuards(new RolesGuard(new Reflector()));
    await app.init();
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => {
    vi.resetAllMocks();
    service.getEnrolledCourses.mockResolvedValue([]);
    service.getTeaching.mockResolvedValue({ stats: { totalCourses: 0 }, courses: [] });
  });

  it.each(['enrolled-courses', 'teaching'])('uses the URL account identity for %s, never the viewing admin', async (endpoint) => {
    for (const id of [userId, otherId]) {
      const response = await request(app.getHttpServer()).get(`/users/${id}/${endpoint}`).set('x-test-role', RoleEnum.ADMIN);
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.headers['cache-control']).toBe('no-store');
      expect(endpoint === 'teaching' ? service.getTeaching : service.getEnrolledCourses).toHaveBeenLastCalledWith(id);
    }
  });

  it.each([undefined, RoleEnum.STUDENT, RoleEnum.INSTRUCTOR])('does not expose account data to role %s', async (role) => {
    for (const endpoint of ['enrolled-courses', 'teaching']) {
      const req = request(app.getHttpServer()).get(`/users/${userId}/${endpoint}`);
      const response = await (role ? req.set('x-test-role', role) : req);
      expect(response.status).toBe(403);
    }
    expect(service.getEnrolledCourses).not.toHaveBeenCalled();
    expect(service.getTeaching).not.toHaveBeenCalled();
  });

  it.each(['enrolled-courses', 'teaching'])('rejects malformed account IDs before accessing %s data', async (endpoint) => {
    const response = await request(app.getHttpServer()).get(`/users/not-an-id/${endpoint}`).set('x-test-role', RoleEnum.ADMIN);
    expect(response.status).toBe(400);
    expect(service.getEnrolledCourses).not.toHaveBeenCalled();
    expect(service.getTeaching).not.toHaveBeenCalled();
  });

  it('returns 404 for an absent/deleted account, rather than invented empty data', async () => {
    service.getEnrolledCourses.mockRejectedValue(new NotFoundException('Tài khoản không tồn tại'));
    const response = await request(app.getHttpServer()).get(`/users/${userId}/enrolled-courses`).set('x-test-role', RoleEnum.ADMIN);
    expect(response.status).toBe(404);
  });

  it('reports incomplete stored finances explicitly instead of returning zero revenue', async () => {
    service.getTeaching.mockRejectedValue(new InstructorRevenueDataError('invalid_money'));
    const response = await request(app.getHttpServer()).get(`/users/${userId}/teaching`).set('x-test-role', RoleEnum.ADMIN);
    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ code: 'INSTRUCTOR_REVENUE_DATA_INCOMPLETE', reason: 'invalid_money' });
    expect(response.body).not.toHaveProperty('data');
  });
});
