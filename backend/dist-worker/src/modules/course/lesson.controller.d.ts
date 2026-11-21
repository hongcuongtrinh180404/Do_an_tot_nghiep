import { ILesson } from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { LessonService } from './services/lesson.service.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
export declare class LessonController {
    private readonly lessonService;
    constructor(lessonService: LessonService);
    createLesson(sectionId: string, userId: string, dto: CreateLessonDto): Promise<ApiResponse<ILesson>>;
    getLessons(sectionId: string): Promise<ApiResponse<ILesson[]>>;
}
