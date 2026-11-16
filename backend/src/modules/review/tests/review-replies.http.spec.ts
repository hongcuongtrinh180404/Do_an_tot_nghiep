import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { RoleEnum } from 'share-lib';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { ReviewController } from '../review.controller.js';
import { ReviewService } from '../services/review.service.js';

describe('Instructor review reply HTTP contracts', () => {
  const reviewId = '607f1f77bcf86cd799439011';
  const instructorId = '607f1f77bcf86cd799439012';
  const service = {
    replyToReview: vi.fn(),
    deleteInstructorReply: vi.fn(),
  };
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
      if (role) request.user = { id: instructorId, role };
      next();
    });
    app.useGlobalGuards(new RolesGuard(new Reflector()));
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }));
    await app.listen(0, '127.0.0.1');
    baseUrl = `${await app.getUrl()}/reviews`;
  });

  beforeEach(() => {
    vi.resetAllMocks();
    service.replyToReview.mockResolvedValue({ id: reviewId, instructorReply: { content: 'Cảm ơn bạn' } });
    service.deleteInstructorReply.mockResolvedValue({ id: reviewId, instructorReply: null });
  });
  afterAll(async () => { await app?.close(); });

  function request(method: string, payload?: unknown, role: string = RoleEnum.INSTRUCTOR, id = reviewId) {
    return fetch(`${baseUrl}/${id}/reply`, {
      method,
      headers: { 'x-test-role': role, 'content-type': 'application/json' },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
  }

  it('accepts and trims an instructor reply', async () => {
    const response = await request('POST', { reply: '  Cảm ơn bạn  ' });
    expect(response.status).toBe(201);
    expect(service.replyToReview).toHaveBeenCalledWith(instructorId, reviewId, { reply: 'Cảm ơn bạn' });
    expect(await response.json()).toMatchObject({
      success: true,
      data: { instructorReply: { content: 'Cảm ơn bạn' } },
    });
  });

  it('accepts the 2000-character boundary', async () => {
    expect((await request('POST', { reply: 'x'.repeat(2000) })).status).toBe(201);
    expect(service.replyToReview).toHaveBeenCalledOnce();
  });

  it.each([{}, { reply: '' }, { reply: ' \n ' }, { reply: null }, { reply: 5 },
    { reply: ['hello'] }, { reply: 'x'.repeat(2001) },
    { reply: 'Cảm ơn', rating: 5 }, { reply: 'Cảm ơn', instructorId: 'someone-else' },
  ])('rejects invalid or extra payload fields (%#)', async (payload) => {
    expect((await request('POST', payload)).status).toBe(400);
    expect(service.replyToReview).not.toHaveBeenCalled();
  });

  it.each(['POST', 'DELETE'])('rejects invalid review IDs for %s', async (method) => {
    expect((await request(method, method === 'POST' ? { reply: 'Cảm ơn' } : undefined,
      RoleEnum.INSTRUCTOR, 'invalid-id')).status).toBe(400);
    expect(service.replyToReview).not.toHaveBeenCalled();
    expect(service.deleteInstructorReply).not.toHaveBeenCalled();
  });

  it.each(['POST', 'DELETE'])('rejects students and unauthenticated users for %s', async (method) => {
    for (const role of [RoleEnum.STUDENT, '']) {
      expect((await request(method, method === 'POST' ? { reply: 'Cảm ơn' } : undefined, role)).status).toBe(403);
    }
    expect(service.replyToReview).not.toHaveBeenCalled();
    expect(service.deleteInstructorReply).not.toHaveBeenCalled();
  });

  it('deletes the reply without deleting the review', async () => {
    const response = await request('DELETE');
    expect(response.status).toBe(200);
    expect(service.deleteInstructorReply).toHaveBeenCalledWith(instructorId, reviewId);
    expect(await response.json()).toMatchObject({
      success: true,
      data: { id: reviewId, instructorReply: null },
    });
  });
});
