import { ILessonSummaryData } from 'share-lib';
export interface SummaryValidationResult {
    isValid: boolean;
    errors: string[];
}
export declare class SummaryValidator {
    static validate(data: ILessonSummaryData, maxDurationSeconds: number): SummaryValidationResult;
    static validateOrFail(data: ILessonSummaryData, maxDurationSeconds: number): void;
}
