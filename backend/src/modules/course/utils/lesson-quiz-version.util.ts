import { createHash } from 'node:crypto';
import type { ILessonQuiz, IStudentLessonQuiz, ILessonQuizAnswer } from 'share-lib';

export function contentVersion(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

/** Timing, ordering and explanations do not invalidate a submitted answer. */
export function quizRevision(quiz: Pick<ILessonQuiz, 'question' | 'questionType' | 'options'>): string {
  return contentVersion({
    question: quiz.question.trim(),
    questionType: quiz.questionType,
    options: quiz.options.map((option) => ({
      id: option.id, text: option.text.trim(), isCorrect: option.isCorrect,
    })).sort((a, b) => a.id.localeCompare(b.id)),
  });
}

export function studentQuiz(quiz: ILessonQuiz, answer: ILessonQuizAnswer | null = null): IStudentLessonQuiz {
  return {
    id: quiz.id, lessonId: quiz.lessonId, timestamp: quiz.timestamp, order: quiz.order,
    question: quiz.question, questionType: quiz.questionType, revision: quizRevision(quiz),
    options: quiz.options.map(({ id, label, text }) => ({ id, label, text })),
    answer, explanation: answer ? quiz.explanation : null,
  };
}
