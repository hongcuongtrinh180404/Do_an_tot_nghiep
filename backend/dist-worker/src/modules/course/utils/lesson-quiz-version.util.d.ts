import type { ILessonQuiz, IStudentLessonQuiz, ILessonQuizAnswer } from 'share-lib';
export declare function contentVersion(value: unknown): string;
export declare function quizRevision(quiz: Pick<ILessonQuiz, 'question' | 'questionType' | 'options'>): string;
export declare function studentQuiz(quiz: ILessonQuiz, answer?: ILessonQuizAnswer | null): IStudentLessonQuiz;
