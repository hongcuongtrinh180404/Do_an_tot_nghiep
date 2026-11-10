import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { QuizQuestionTypeEnum } from 'share-lib';
import { LessonQuizController } from '../lesson-quiz.controller.js';
import { LessonQuizService } from '../services/lesson-quiz.service.js';
import { LessonManagementGuard } from '../guards/lesson-management.guard.js';
import { SaveLessonQuizDto } from '../dto/save-lesson-quiz.dto.js';

describe('Individual lesson quiz HTTP contracts', () => {
  const lessonId = '607f1f77bcf86cd799439011';
  const quizId = '607f1f77bcf86cd799439022';
  const service = { createQuiz: vi.fn(), updateQuiz: vi.fn(), getQuizzesByLessonId: vi.fn() };
  const guard = { canActivate: vi.fn() };
  const payload = {
    timestamp: 30,
    question: '  Nội dung câu hỏi  ',
    questionType: QuizQuestionTypeEnum.SINGLE,
    options: [
      { id: 'a', label: 'A', text: '  Đáp án A  ', isCorrect: true },
      { id: 'b', label: 'B', text: 'Đáp án B', isCorrect: false },
    ],
  };
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [LessonQuizController],
      providers: [{ provide: LessonQuizService, useValue: service }],
    }).overrideGuard(LessonManagementGuard).useValue(guard).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  beforeEach(() => {
    vi.resetAllMocks();
    guard.canActivate.mockReturnValue(true);
    service.createQuiz.mockResolvedValue({ ...payload, id: quizId, lessonId, order: 1 });
    service.updateQuiz.mockResolvedValue({ ...payload, id: quizId, lessonId, order: 1 });
    service.getQuizzesByLessonId.mockResolvedValue([{ ...payload, id: quizId, lessonId, order: 1, explanation: 'Lời giải chỉ dành cho câu đã nộp' }]);
  });

  afterAll(async () => { await app?.close(); });

  async function request(path: string, method: string, body: object): Promise<Response> {
    return fetch(`${baseUrl}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }

  it('creates a question with 201 and a standard response envelope', async () => {
    const response = await request(`/lessons/${lessonId}/quizzes`, 'POST', payload);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ success: true, data: { id: quizId, lessonId } });
    expect(service.createQuiz).toHaveBeenCalledWith(lessonId, expect.any(SaveLessonQuizDto));
    expect(service.createQuiz).toHaveBeenCalledWith(lessonId, expect.objectContaining({
      question: 'Nội dung câu hỏi',
      options: expect.arrayContaining([expect.objectContaining({ text: 'Đáp án A' })]),
    }));
  });

  it('updates the selected quiz through its ID route', async () => {
    const response = await request(`/lessons/quizzes/${quizId}`, 'PUT', payload);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, data: { id: quizId } });
    expect(service.updateQuiz).toHaveBeenCalledWith(quizId, expect.any(SaveLessonQuizDto));
  });

  it('never exposes answer keys or explanations through the public learner route', async () => {
    const response = await fetch(`${baseUrl}/lessons/${lessonId}/quizzes`);
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.data[0].answer).toBeNull();
    expect(result.data[0].explanation).toBeNull();
    expect(result.data[0].options.every((option: object) => !('isCorrect' in option))).toBe(true);
  });

  it.each([
    { ...payload, timestamp: -1 },
    { ...payload, timestamp: 0.5 },
    { ...payload, question: '  ' },
    { ...payload, options: [{ ...payload.options[0], text: '  ' }] },
    { ...payload, lessonId: 'another-lesson' },
    { ...payload, order: 99 },
  ])('rejects invalid or forbidden input before service access: %o', async (body) => {
    const response = await request(`/lessons/${lessonId}/quizzes`, 'POST', body);
    expect(response.status).toBe(400);
    expect(service.createQuiz).not.toHaveBeenCalled();
  });

  it('rejects invalid quiz IDs and unauthorized writes', async () => {
    expect((await request('/lessons/quizzes/invalid', 'PUT', payload)).status).toBe(400);
    expect(service.updateQuiz).not.toHaveBeenCalled();
    guard.canActivate.mockReturnValue(false);
    expect((await request(`/lessons/${lessonId}/quizzes`, 'POST', payload)).status).toBe(403);
    expect(service.createQuiz).not.toHaveBeenCalled();
  });
});
