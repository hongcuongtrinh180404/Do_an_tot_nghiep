import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { Types, type Model, type ClientSession } from 'mongoose';
import { QuizQuestionTypeEnum } from 'share-lib';
import { LessonQuizRepository } from '../repositories/lesson-quiz.repository.js';
import type { LessonQuizEntity } from '../schemas/lesson-quiz.schema.js';

describe('Stable quiz synchronization', () => {
  const lessonId = '607f1f77bcf86cd799439011';
  const quizId = '607f1f77bcf86cd799439012';
  const payload = { id: quizId, order: 1, question: 'Câu hỏi cũ', questionType: QuizQuestionTypeEnum.SINGLE,
    options: [{ id: 'a', label: 'A', text: 'Đúng', isCorrect: true }, { id: 'b', label: 'B', text: 'Sai', isCorrect: false }] };
  const session = {} as ClientSession;

  function harness() {
    const find = { session: vi.fn().mockReturnThis(), exec: vi.fn().mockResolvedValue([{ _id: new Types.ObjectId(quizId) }]) };
    const update = { session: vi.fn().mockReturnThis(), exec: vi.fn().mockResolvedValue({}) };
    const model = { find: vi.fn(() => find), updateMany: vi.fn((_filter: unknown, _update: unknown) => update), updateOne: vi.fn(() => update), insertMany: vi.fn() };
    const repository = new LessonQuizRepository(model as unknown as Model<LessonQuizEntity>);
    vi.spyOn(repository, 'findByLessonIdAndTimestamp').mockResolvedValue([]);
    return { repository, model };
  }

  it('updates retained IDs instead of deleting and reinserting unchanged questions', async () => {
    const h = harness();
    await h.repository.syncQuizzesAtTimestamp(lessonId, 192, [payload], session);
    expect(h.model.updateOne).toHaveBeenCalledWith(expect.objectContaining({ _id: quizId }), { $set: expect.objectContaining({ question: payload.question, timestamp: 192 }) }, { session });
    expect(h.model.updateMany.mock.calls[0][0]).toMatchObject({ _id: { $nin: [new Types.ObjectId(quizId)] } });
    expect(h.model.insertMany).not.toHaveBeenCalled();
  });

  it('rejects duplicate and foreign question IDs before modifying the checkpoint', async () => {
    const h = harness();
    await expect(h.repository.syncQuizzesAtTimestamp(lessonId, 192, [payload, payload], session)).rejects.toThrow(BadRequestException);
    await expect(h.repository.syncQuizzesAtTimestamp(lessonId, 192, [{ ...payload, id: '607f1f77bcf86cd799439099' }], session)).rejects.toThrow(BadRequestException);
    expect(h.model.updateMany).not.toHaveBeenCalled();
    expect(h.model.updateOne).not.toHaveBeenCalled();
  });

  it('publishes synchronization atomically rather than exposing a transient empty quiz list', async () => {
    const h = harness();
    vi.spyOn(h.repository, 'withTransaction').mockImplementation((callback) => callback(session));
    await h.repository.syncQuizzesAtTimestamp(lessonId, 192, [payload]);
    expect(h.repository.withTransaction).toHaveBeenCalledOnce();
    expect(h.repository.findByLessonIdAndTimestamp).toHaveBeenCalledWith(lessonId, 192, session);
  });
});
