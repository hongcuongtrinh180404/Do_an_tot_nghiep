import { ILessonMindmapData } from 'share-lib';
export interface MindmapValidationResult {
    isValid: boolean;
    errors: string[];
}
export declare class MindmapValidator {
    static validate(data: ILessonMindmapData, maxDurationSeconds: number, maxDepth?: number): MindmapValidationResult;
    static validateOrFail(data: ILessonMindmapData, maxDurationSeconds: number, maxDepth?: number): void;
    static sanitize(data: unknown, maxDurationSeconds: number, maxDepth?: number, fallbackTitle?: string): ILessonMindmapData;
    private static sanitizeNode;
    private static validateNode;
}
