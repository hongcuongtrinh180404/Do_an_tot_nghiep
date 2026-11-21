import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { RoleEnum } from 'share-lib';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { ReviewController } from '../review.controller.js';
import { ReviewService } from '../services/review.service.js';

describe('Admin review reply HTTP contracts', () => {
  const reviewId = '607f1f77bcf86cd799439011';
  const adminId = '607f1f77bcf86cd799439012';
  const service = { adminReplyToReview: vi.fn() };
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReviewController],
      providers: [{ provide: ReviewService, useValue: service }],
    }).compile();
    app = module.createNestApplication();
    app.use((request: {
      headers: Record<string, string>;
      user?: { id: string; role: string };
    }, _response: unknown, next: () => void) => {
      const role = request.headers['x-test-role'];
      if (role) request.user = { id: adminId, role };
      next();
    });
    app.useGlobalGuards(new RolesGuard(new Reflector()));
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }));
    await app.listen(0, '127.0.0.1');
    baseUrl = `${await app.getUrl()}/reviews/admin`;
  });

  beforeEach(() => {
    vi.resetAllMocks();
    service.adminReplyToReview.mockResolvedValue({ id: reviewId, adminReply: { content: 'Đang kiểm tra lỗi hệ thống.' } });
  });
  afterAll(async () => { await app?.close(); });

  function request(payload: unknown, role: string = RoleEnum.ADMIN, id = reviewId) {
    return fetch(`${baseUrl}/${id}/reply`, {
      method: 'POST',
      headers: { 'x-test-role': role, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  it('accepts an admin reply and trims whitespace', async () => {
    const response = await request({ reply: '  Đang kiểm tra lỗi hệ thống. \n' });
    expect(response.status).toBe(201);
    expect(service.adminReplyToReview).toHaveBeenCalledWith(adminId, reviewId, { reply: 'Đang kiểm tra lỗi hệ thống.' });
    expect(await response.json()).toMatchObject({
      success: true,
      data: { adminReply: { content: 'Đang kiểm tra lỗi hệ thống.' } },
    });
  });

  it('accepts the 2000-character boundary', async () => {
    expect((await request({ reply: 'x'.repeat(2000) })).status).toBe(201);
    expect(service.adminReplyToReview).toHaveBeenCalledOnce();
  });

  it.each([{}, { reply: '' }, { reply: ' \n ' }, { reply: null }, { reply: 5 },
    { reply: ['hello'] }, { reply: 'x'.repeat(2001) },
    { reply: 'Phản hồi', rating: 5 }, { reply: 'Phản hồi', adminId: 'someone-else' },
    { reply: 'Phản hồi', instructorReply: { content: 'Ghi đè' } },
  ])('rejects invalid content and forged fields (%#)', async (payload) => {
    expect((await request(payload)).status).toBe(400);
    expect(service.adminReplyToReview).not.toHaveBeenCalled();
  });

  it('rejects invalid review IDs', async () => {
    expect((await request({ reply: 'Phản hồi' }, RoleEnum.ADMIN, 'invalid-id')).status).toBe(400);
    expect(service.adminReplyToReview).not.toHaveBeenCalled();
  });

  it.each([RoleEnum.STUDENT, RoleEnum.INSTRUCTOR, ''])('rejects the non-admin role "%s"', async (role) => {
    expect((await request({ reply: 'Phản hồi' }, role)).status).toBe(403);
    expect(service.adminReplyToReview).not.toHaveBeenCalled();
  });
});
