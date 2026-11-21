import { LearningProgressService } from '../../learning-progress/services/learning-progress.service.js';
import { ChatbotMyCoursesRepository } from '../repositories/chatbot-my-courses.repository.js';
import { type CourseSelection, type LearningOverview, type LearningResult, type MyCoursesFilters, type MyCoursesResult } from '../tools/my-learning.types.js';
export declare const CHATBOT_LEARNING_BUDGET_MS = 8000;
export declare class ChatbotLearningReadService {
    private readonly courses;
    private readonly progress;
    constructor(courses: ChatbotMyCoursesRepository, progress: LearningProgressService);
    private read;
    private scan;
    list(userId: string, filters: MyCoursesFilters, signal?: AbortSignal): Promise<MyCoursesResult>;
    overview(userId: string, signal?: AbortSignal): Promise<LearningOverview>;
    candidates(userId: string, keyword: string, page: number, limit: number, signal?: AbortSignal): Promise<CourseSelection>;
    detail(userId: string, courseId: string, signal?: AbortSignal): Promise<LearningResult>;
}
