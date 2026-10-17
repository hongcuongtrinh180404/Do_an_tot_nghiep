import { QuizQuestionTypeEnum } from '../enums/quiz-question-type.enum.js';

export interface IQuizOption {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface ILessonQuiz {
  id: string;
  lessonId: string;
  timestamp: number;
  order: number;
  question: string;
  questionType: QuizQuestionTypeEnum;
  options: IQuizOption[];
  explanation?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IGeneratedQuizOption {
  id: string;
  label: 'A' | 'B' | 'C' | 'D' | string;
  text: string;
  isCorrect: boolean;
}

export interface IGeneratedQuizItem {
  order: number;
  timestamp: number;
  question: string;
  questionType: QuizQuestionTypeEnum;
  options: IGeneratedQuizOption[];
  explanation: string;
}

export interface ILessonQuizDraft {
  id: string;
  lessonId: string;
  quizzes: IGeneratedQuizItem[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
  deletedAt?: Date | string | null;
  createdById?: string | null;
  updatedById?: string | null;
}

