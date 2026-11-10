import type { LearningStatusEnum } from '../enums/learning-status.enum.js';
import type { ILessonQuiz, IQuizOption } from './lesson-quiz.interface.js';

export interface ILessonQuizAnswer {
  quizId: string;
  quizRevision: string;
  selectedOptionIds: string[];
  isCorrect: boolean;
  correctOptionIds: string[];
  submittedAt: Date | string;
}

/** Learners must not receive the answer key before a successful submission. */
export interface IStudentLessonQuiz extends Omit<ILessonQuiz, 'options' | 'explanation'> {
  revision: string;
  options: Omit<IQuizOption, 'isCorrect'>[];
  answer: ILessonQuizAnswer | null;
  explanation?: string | null;
}

export interface ILessonCompletionSummary {
  lessonId: string;
  status: LearningStatusEnum;
  completedQuestions: number;
  totalQuestions: number;
}

export interface ILessonCompletion extends ILessonCompletionSummary {
  courseId: string;
  quizzesVersion: string;
  mediaVersion: string;
  videoEnded: boolean;
  quizzes: IStudentLessonQuiz[];
}

export interface ISubmitLessonQuizAnswer {
  quizId: string;
  quizRevision: string;
  selectedOptionIds: string[];
}

export interface ICompleteLessonVideo {
  mediaVersion: string;
  positionSeconds: number;
}
