import { ILessonContent, RoleEnum } from 'share-lib';
import { ApiResponse } from '../base/index.js';
import { StorageService } from '../storage/index.js';
import { LessonService } from './services/lesson.service.js';
export declare class LessonContentController {
    private readonly storageService;
    private readonly lessonService;
    constructor(storageService: StorageService, lessonService: LessonService);
    uploadContent(file: Express.Multer.File): Promise<ApiResponse<ILessonContent>>;
    getStreamUrl(key?: string, userId?: string, userRole?: RoleEnum): Promise<ApiResponse<{
        url: string;
    }>>;
}
