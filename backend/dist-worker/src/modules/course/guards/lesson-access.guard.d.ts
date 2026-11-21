import { CanActivate, ExecutionContext } from '@nestjs/common';
import { LessonService } from '../services/lesson.service.js';
export declare class LessonAccessGuard implements CanActivate {
    private readonly lessonService;
    private readonly objectIdPipe;
    constructor(lessonService: LessonService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
