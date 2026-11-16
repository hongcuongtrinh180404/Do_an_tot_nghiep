import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { LessonController } from '../lesson.controller.js';
import { LessonManagementGuard } from '../guards/lesson-management.guard.js';
import { LessonService } from '../services/lesson.service.js';

const sectionId = '607f1f77bcf86cd799439022';
const path = `/sections/${sectionId}/lessons`;

describe('Lesson creation HTTP validation (isolated, no database writes)', () => {
  let app: INestApplication;
  const service = { createLesson: vi.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [LessonController],
      providers: [{ provide: LessonService, useValue: service }],
    })
      .overrideGuard(LessonManagementGuard).useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  afterAll(async () => { await app?.close(); });
  beforeEach(() => {
    vi.resetAllMocks();
    service.createLesson.mockResolvedValue({ id: 'new-lesson' });
  });

  it.each([
    { title: 'Bài học', order: 0 },
    { title: 'Bài học', order: 0, content: null },
    { title: 'Bài học', order: 0, content: {} },
    { title: 'Bài học', order: 0, content: { type: 'video', url: '  ' } },
    { title: 'Bài học', order: 0, content: { type: 'audio', url: '/audio.mp3' } },
  ])('rejects invalid media before reaching the write service: %j', async (body) => {
    const response = await request(app.getHttpServer()).post(path).send(body);
    expect(response.status).toBe(400);
    expect(service.createLesson).not.toHaveBeenCalled();
  });

  it.each(['video', 'document'])('accepts %s without description or key points', async (type) => {
    const content = { type, url: `http://localhost:9000/media/${type}` };
    const response = await request(app.getHttpServer()).post(path).send({ title: 'Bài học', order: 0, content });
    expect(response.status).toBe(201);
    expect(service.createLesson).toHaveBeenCalledWith(sectionId, expect.objectContaining({ content }));
    expect(service.createLesson.mock.calls[0][1]).not.toHaveProperty('description');
  });
});
