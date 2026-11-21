import { IGeneratedQuizItem } from 'share-lib';
export interface QuizValidationResult {
    isValid: boolean;
    errors: string[];
}
export declare class QuizValidator {
    static validate(quizzes: IGeneratedQuizItem[], maxDurationSeconds: number, maxCount?: number): QuizValidationResult;
    static validateOrFail(quizzes: IGeneratedQuizItem[], maxDurationSeconds: number, maxCount?: number): void;
}
