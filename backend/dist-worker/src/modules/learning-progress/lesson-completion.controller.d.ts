import { ApiResponse } from '../base/index.js';
import { CompleteLessonVideoDto, SubmitLessonQuizAnswerDto } from './dto/lesson-completion.dto.js';
import { LessonCompletionService } from './services/lesson-completion.service.js';
export declare class LessonCompletionController {
    private readonly service;
    constructor(service: LessonCompletionService);
    getLessons(userId: string, courseId: string): Promise<ApiResponse<import("share-lib").ILessonCompletionSummary[]>>;
    getLesson(userId: string, courseId: string, lessonId: string): Promise<ApiResponse<import("share-lib").ILessonCompletion>>;
    submitAnswer(userId: string, courseId: string, lessonId: string, dto: SubmitLessonQuizAnswerDto): Promise<ApiResponse<import("share-lib").ILessonCompletion>>;
    videoEnded(userId: string, courseId: string, lessonId: string, dto: CompleteLessonVideoDto): Promise<ApiResponse<import("share-lib").ILessonCompletion>>;
}
