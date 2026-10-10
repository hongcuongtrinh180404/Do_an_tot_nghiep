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
