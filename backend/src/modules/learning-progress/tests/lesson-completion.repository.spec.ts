import { describe, expect, it, vi } from 'vitest';
import type { Model } from 'mongoose';
import { QuizQuestionTypeEnum, type ILessonQuiz, type ILessonQuizAnswer } from 'share-lib';
import { LessonCompletionRepository } from '../repositories/lesson-completion.repository.js';
import type { LessonQuizAnswerEntity, LessonVideoCompletionEntity } from '../schemas/lesson-completion.schema.js';

const answer: ILessonQuizAnswer = {
  quizId: 'quiz', quizRevision: 'revision', selectedOptionIds: ['b'], isCorrect: false,
  correctOptionIds: ['a'], submittedAt: new Date(),
};
const quiz: ILessonQuiz = { id: 'quiz', lessonId: 'lesson', timestamp: 192, order: 1,
  question: 'Câu hỏi', questionType: QuizQuestionTypeEnum.SINGLE, options: [] };

describe('Lesson completion persistence', () => {
  function harness() {
    const exec = vi.fn().mockResolvedValue({});
    const answers = { updateOne: vi.fn(() => ({ exec })) };
    const videos = { updateOne: vi.fn(() => ({ exec })) };
    const repository = new LessonCompletionRepository(answers as unknown as Model<LessonQuizAnswerEntity>, videos as unknown as Model<LessonVideoCompletionEntity>);
    return { repository, answers, videos, exec };
  }

  it('uses an atomic insert-only answer upsert so retries cannot overwrite the original result', async () => {
    const h = harness();
    await h.repository.saveAnswer('student', 'course', 'lesson', answer, quiz);
    expect(h.answers.updateOne).toHaveBeenCalledWith(
      { userId: 'student', lessonId: 'lesson', quizId: 'quiz', quizRevision: 'revision' },
      { $setOnInsert: expect.objectContaining({ selectedOptionIds: ['b'], isCorrect: false, quizSnapshot: quiz }) },
      { upsert: true },
    );
  });

  it('accepts a duplicate-key race but propagates real persistence failures', async () => {
    const h = harness();
    h.exec.mockRejectedValueOnce({ code: 11000 });
    await expect(h.repository.saveAnswer('student', 'course', 'lesson', answer, quiz)).resolves.toBeUndefined();
    h.exec.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(h.repository.saveAnswer('student', 'course', 'lesson', answer, quiz)).rejects.toThrow('database unavailable');
  });

  it('makes repeated video-end notifications idempotent and scoped to the actual media', async () => {
    const h = harness();
    await h.repository.saveVideoEnded('student', 'course', 'lesson', 'media-version');
    expect(h.videos.updateOne).toHaveBeenCalledWith(
      { userId: 'student', lessonId: 'lesson', mediaVersion: 'media-version' },
      { $setOnInsert: expect.objectContaining({ courseId: 'course', endedAt: expect.any(Date) }) },
      { upsert: true },
    );
  });
});
