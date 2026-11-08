import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QuizQuestionTypeEnum, type ILessonQuiz } from 'share-lib';
import { createLessonQuizSchema, createQuizQuestionValues } from '../schemas/lesson-quiz.schema';

function validForm() {
  return {
    timestamp: 30,
    questionData: {
      question: '  Biến trong JavaScript được khai báo như thế nào?  ',
      questionType: QuizQuestionTypeEnum.SINGLE,
      options: [
        { id: 'a', label: 'A', text: '  Dùng let  ', isCorrect: true },
        { id: 'b', label: 'B', text: '  Dùng SELECT  ', isCorrect: false },
      ],
      explanation: '  let là từ khóa khai báo biến.  ',
    },
  };
}

describe('Lesson quiz form validation', () => {
  it('trims the question, answers and explanation', () => {
    const result = createLessonQuizSchema(120).parse(validForm());
    assert.equal(result.questionData.question, validForm().questionData.question.trim());
    assert.equal(result.questionData.options[0].text, 'Dùng let');
    assert.equal(result.questionData.explanation, 'let là từ khóa khai báo biến.');
  });

  it('accepts zero and the end of the video but rejects invalid timestamps', () => {
    const schema = createLessonQuizSchema(120);
    for (const timestamp of [0, 120]) assert.equal(schema.safeParse({ ...validForm(), timestamp }).success, true);
    for (const timestamp of [-1, 1.5, 121, NaN, Infinity]) assert.equal(schema.safeParse({ ...validForm(), timestamp }).success, false);
    assert.equal(createLessonQuizSchema().safeParse({ ...validForm(), timestamp: 300 }).success, true);
    assert.equal(createLessonQuizSchema(0).safeParse(validForm()).success, true);
  });

  it('requires nonblank question and answer text', () => {
    const form = validForm();
    form.questionData.question = '  ';
    assert.equal(createLessonQuizSchema().safeParse(form).success, false);
    const blankAnswer = validForm();
    blankAnswer.questionData.options[0].text = '  ';
    assert.equal(createLessonQuizSchema().safeParse(blankAnswer).success, false);
  });

  it('requires exactly one correct answer for single-choice questions', () => {
    for (const selected of [false, true]) {
      const form = validForm();
      form.questionData.options = form.questionData.options.map((option) => ({ ...option, isCorrect: selected }));
      assert.equal(createLessonQuizSchema().safeParse(form).success, false);
    }
  });

  it('accepts multiple correct answers for multiple-choice questions', () => {
    const form = validForm();
    form.questionData.questionType = QuizQuestionTypeEnum.MULTIPLE;
    form.questionData.options = form.questionData.options.map((option) => ({ ...option, isCorrect: true }));
    assert.equal(createLessonQuizSchema().safeParse(form).success, true);
  });

  it('rejects duplicate answer identifiers and labels', () => {
    for (const property of ['id', 'label'] as const) {
      const form = validForm();
      form.questionData.options[1][property] = form.questionData.options[0][property];
      assert.equal(createLessonQuizSchema().safeParse(form).success, false);
    }
  });

  it('requires instructors to explicitly select a correct answer for new questions', () => {
    const question = createQuizQuestionValues();
    assert.equal(question.options.length, 4);
    assert.equal(question.options.some((option) => option.isCorrect), false);
  });

  it('preserves existing answers and option IDs without mutating cached quiz data', () => {
    const quiz: ILessonQuiz = { id: 'quiz-1', lessonId: 'lesson-1', order: 1, ...validForm().questionData, timestamp: 30 };
    const question = createQuizQuestionValues(quiz);
    question.options[0].text = 'Thay đổi';
    assert.equal(question.options[0].id, quiz.options[0].id);
    assert.notEqual(question.options[0].text, quiz.options[0].text);
  });
});
