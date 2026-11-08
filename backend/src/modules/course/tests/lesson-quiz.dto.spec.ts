import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QuizQuestionTypeEnum } from 'share-lib';
import { SaveLessonQuizDto } from '../dto/save-lesson-quiz.dto.js';
import { SyncLessonQuizzesAtTimestampDto } from '../dto/sync-lesson-quizzes.dto.js';

const payload = {
  timestamp: 30,
  question: '  Câu hỏi trong bài học  ',
  questionType: QuizQuestionTypeEnum.SINGLE,
  options: [
    { id: 'a', label: ' A ', text: '  Đáp án đúng  ', isCorrect: true },
    { id: 'b', label: ' B ', text: '  Đáp án sai  ', isCorrect: false },
  ],
  explanation: '  Nội dung giải thích  ',
};

describe('Lesson quiz DTO contracts', () => {
  it('validates and trims inherited question fields and nested answers', async () => {
    const dto = plainToInstance(SaveLessonQuizDto, payload);
    expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).toEqual([]);
    expect(dto.question).toBe(payload.question.trim());
    expect(dto.options[0]!.text).toBe('Đáp án đúng');
    expect(dto.options[0]!.label).toBe('A');
    expect(dto.explanation).toBe(payload.explanation.trim());
  });

  it.each([-1, 0.5, NaN, Infinity])('rejects invalid timestamp %s', async (timestamp) => {
    expect(await validate(plainToInstance(SaveLessonQuizDto, { ...payload, timestamp }))).not.toEqual([]);
  });

  it('rejects blank nested answers and nonboolean correct-answer values', async () => {
    const dto = plainToInstance(SaveLessonQuizDto, {
      ...payload,
      options: [{ ...payload.options[0], text: '   ', isCorrect: 'true' }],
    });
    expect(await validate(dto)).not.toEqual([]);
  });

  it.each(['lessonId', 'order', 'id', 'deletedAt'])('does not allow clients to overwrite %s', async (property) => {
    const dto = plainToInstance(SaveLessonQuizDto, { ...payload, [property]: 'client-supplied' });
    expect(await validate(dto, { whitelist: true, forbidNonWhitelisted: true })).not.toEqual([]);
  });

  it('keeps the existing timestamp-cluster sync contract compatible', async () => {
    const dto = plainToInstance(SyncLessonQuizzesAtTimestampDto, {
      timestamp: payload.timestamp,
      questions: [{ ...payload, timestamp: undefined, id: 'quiz-1', order: 1 }],
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto.questions[0]!.question).toBe(payload.question.trim());
  });
});
