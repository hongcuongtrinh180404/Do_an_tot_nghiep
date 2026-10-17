import { describe, it, expect } from 'vitest';
import { UnprocessableEntityException } from '@nestjs/common';
import { IGeneratedQuizItem, QuizQuestionTypeEnum } from 'share-lib';
import { QuizValidator } from '../validators/quiz.validator.js';

describe('QuizValidator', () => {
  const generateValidQuizzes = (count = 10): IGeneratedQuizItem[] => {
    return Array.from({ length: count }, (_, i) => ({
      order: i + 1,
      timestamp: (i + 1) * 20,
      question: `Câu hỏi kiểm tra kiến thức số ${i + 1}?`,
      questionType: QuizQuestionTypeEnum.SINGLE,
      options: [
        { id: `opt-${i}-A`, label: 'A', text: 'Đáp án A đúng', isCorrect: true },
        { id: `opt-${i}-B`, label: 'B', text: 'Đáp án B sai', isCorrect: false },
        { id: `opt-${i}-C`, label: 'C', text: 'Đáp án C sai', isCorrect: false },
        { id: `opt-${i}-D`, label: 'D', text: 'Đáp án D sai', isCorrect: false },
      ],
      explanation: `Giải thích chi tiết cho câu hỏi số ${i + 1}`,
    }));
  };

  it('should pass validation for valid 10 quiz items with 4 options and 1 correct answer', () => {
    const validQuizzes = generateValidQuizzes(10);
    const result = QuizValidator.validate(validQuizzes, 300, 10);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail if quiz list count is not equal to expectedCount (e.g. 9 instead of 10)', () => {
    const invalidQuizzes = generateValidQuizzes(9);
    const result = QuizValidator.validate(invalidQuizzes, 300, 10);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Số lượng câu hỏi không đúng'))).toBe(true);
  });

  it('should fail if a question has empty text', () => {
    const quizzes = generateValidQuizzes(10);
    quizzes[0].question = '   ';
    const result = QuizValidator.validate(quizzes, 300, 10);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('thiếu nội dung "question"'))).toBe(true);
  });

  it('should fail if a question has invalid or negative timestamp', () => {
    const quizzes = generateValidQuizzes(10);
    quizzes[1].timestamp = -5;
    const result = QuizValidator.validate(quizzes, 300, 10);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('timestamp âm'))).toBe(true);
  });

  it('should fail if timestamp exceeds video duration', () => {
    const quizzes = generateValidQuizzes(10);
    quizzes[2].timestamp = 500; // Duration is 300
    const result = QuizValidator.validate(quizzes, 300, 10);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('vượt quá thời lượng video'))).toBe(true);
  });

  it('should fail if a question does not have exactly 4 options', () => {
    const quizzes = generateValidQuizzes(10);
    quizzes[3].options = quizzes[3].options.slice(0, 3); // Only 3 options
    const result = QuizValidator.validate(quizzes, 300, 10);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('đúng 4 lựa chọn'))).toBe(true);
  });

  it('should fail if a question has 0 or multiple correct options', () => {
    const quizzes = generateValidQuizzes(10);
    quizzes[4].options[1].isCorrect = true; // Now 2 correct options
    const result = QuizValidator.validate(quizzes, 300, 10);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('đúng 1 đáp án chính xác'))).toBe(true);
  });

  it('should fail if explanation is empty', () => {
    const quizzes = generateValidQuizzes(10);
    quizzes[5].explanation = '';
    const result = QuizValidator.validate(quizzes, 300, 10);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('thiếu phần giải thích'))).toBe(true);
  });

  it('should throw UnprocessableEntityException in validateOrFail when invalid', () => {
    const invalid = generateValidQuizzes(5);
    expect(() => QuizValidator.validateOrFail(invalid, 300, 10)).toThrow(
      UnprocessableEntityException,
    );
  });
});
