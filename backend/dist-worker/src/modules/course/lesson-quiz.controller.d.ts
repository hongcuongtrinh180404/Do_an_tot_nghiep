import { ILessonQuiz } from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { LessonQuizService } from './services/lesson-quiz.service.js';
import { SyncLessonQuizzesAtTimestampDto } from './dto/sync-lesson-quizzes.dto.js';
import { MoveMergeLessonQuizzesDto } from './dto/move-merge-lesson-quizzes.dto.js';
import { SaveLessonQuizDto, UpdateQuizTimestampDto } from './dto/save-lesson-quiz.dto.js';
export declare class LessonQuizController {
    private readonly lessonQuizService;
    constructor(lessonQuizService: LessonQuizService);
    getQuizzes(id: string): Promise<ApiResponse<import("share-lib").IStudentLessonQuiz[]>>;
    getManagementQuizzes(id: string): Promise<ApiResponse<ILessonQuiz[]>>;
    createQuiz(id: string, dto: SaveLessonQuizDto): Promise<ApiResponse<ILessonQuiz>>;
    updateQuiz(quizId: string, dto: SaveLessonQuizDto): Promise<ApiResponse<ILessonQuiz>>;
    syncQuizzes(id: string, dto: SyncLessonQuizzesAtTimestampDto): Promise<ApiResponse<ILessonQuiz[]>>;
    updateTimestamp(quizId: string, dto: UpdateQuizTimestampDto): Promise<ApiResponse<ILessonQuiz>>;
    moveOrMergeQuizzes(id: string, dto: MoveMergeLessonQuizzesDto): Promise<ApiResponse<ILessonQuiz[]>>;
    deleteQuiz(quizId: string): Promise<ApiResponse<{
        deleted: boolean;
    }>>;
    deleteQuizzesAtTimestamp(id: string, timestamp: string): Promise<ApiResponse<{
        deletedCount: number;
    }>>;
}
