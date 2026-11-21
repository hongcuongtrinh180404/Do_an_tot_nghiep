import { ILesson, ILessonTranscript, RoleEnum } from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { LessonService } from './services/lesson.service.js';
import { LessonTranscriptService } from './services/lesson-transcript.service.js';
import { UpdateLessonDto } from './dto/update-lesson.dto.js';
export declare class LessonsController {
    private readonly lessonService;
    private readonly lessonTranscriptService;
    constructor(lessonService: LessonService, lessonTranscriptService: LessonTranscriptService);
    getLessonDetail(id: string, userId?: string, userRole?: RoleEnum): Promise<ApiResponse<ILesson>>;
    updateLesson(id: string, dto: UpdateLessonDto, userId?: string, userRole?: RoleEnum): Promise<ApiResponse<ILesson>>;
    uploadMaterial(id: string, file: Express.Multer.File, title?: string, userId?: string, userRole?: RoleEnum): Promise<ApiResponse<ILesson>>;
    deleteMaterial(id: string, materialId: string, userId?: string, userRole?: RoleEnum): Promise<ApiResponse<ILesson>>;
    deleteLesson(id: string, userId?: string, userRole?: RoleEnum): Promise<ApiResponse<null>>;
    getLessonTranscript(id: string): Promise<ApiResponse<ILessonTranscript>>;
    retryTranscription(id: string): Promise<ApiResponse<null>>;
}
