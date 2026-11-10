import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { RoleEnum } from 'share-lib';
import type { Request, Response, NextFunction } from 'express';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { LessonCompletionController } from '../lesson-completion.controller.js';
import { LessonCompletionService } from '../services/lesson-completion.service.js';

describe('Lesson completion HTTP contracts', () => {
  const courseId = '607f1f77bcf86cd799439011';
  const lessonId = '607f1f77bcf86cd799439012';
  const quizId = '607f1f77bcf86cd799439013';
  const base = `/learning-progress/courses/${courseId}/lessons`;
  const payload = { quizId, quizRevision: 'a'.repeat(64), selectedOptionIds: ['a'] };
  const service = { getLessons: vi.fn(), getLesson: vi.fn(), submitAnswer: vi.fn(), videoEnded: vi.fn() };
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [LessonCompletionController],
      providers: [{ provide: LessonCompletionService, useValue: service }],
    }).compile();
    app = module.createNestApplication();
    app.use((req: Request & { user?: { id: string; role: RoleEnum } }, _res: Response, next: NextFunction) => {
      if (req.header('x-test-student')) req.user = { id: 'authenticated-student', role: RoleEnum.STUDENT };
      next();
    });
    app.useGlobalGuards(new RolesGuard(new Reflector()));
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });
  afterAll(async () => { await app?.close(); });
  beforeEach(() => {
    vi.resetAllMocks();
    service.submitAnswer.mockResolvedValue({ lessonId, status: 'COMPLETED' });
  });

  it('uses the authenticated student identity and returns the server result', async () => {
    const response = await request(app.getHttpServer()).post(`${base}/${lessonId}/quiz-answers`).set('x-test-student', 'yes').send(payload);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ success: true, data: { lessonId, status: 'COMPLETED' } });
    expect(service.submitAnswer).toHaveBeenCalledWith('authenticated-student', courseId, lessonId, expect.objectContaining(payload));
  });

  it.each([
    { ...payload, isCorrect: true }, { ...payload, userId: 'other-student' },
    { ...payload, selectedOptionIds: [] }, { ...payload, selectedOptionIds: ['a', 'a'] },
    { ...payload, selectedOptionIds: 'a' }, { ...payload, quizId: 'invalid' },
    { ...payload, quizRevision: 'old' },
  ])('rejects invalid or client-forged completion data: %j', async (body) => {
    const response = await request(app.getHttpServer()).post(`${base}/${lessonId}/quiz-answers`).set('x-test-student', 'yes').send(body);
    expect(response.status).toBe(400);
    expect(service.submitAnswer).not.toHaveBeenCalled();
  });

  it('does not expose personal completion to an unauthenticated reader', async () => {
    const response = await request(app.getHttpServer()).get(`${base}/${lessonId}`);
    expect(response.status).toBe(403);
    expect(service.getLesson).not.toHaveBeenCalled();
  });

  it('rejects a malformed lesson ID before accessing services', async () => {
    const response = await request(app.getHttpServer()).get(`${base}/invalid`).set('x-test-student', 'yes');
    expect(response.status).toBe(400);
    expect(service.getLesson).not.toHaveBeenCalled();
  });
});
