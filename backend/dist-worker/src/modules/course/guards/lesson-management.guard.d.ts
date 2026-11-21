import { CanActivate, ExecutionContext } from '@nestjs/common';
import { CourseRepository } from '../repositories/course.repository.js';
import { LessonQuizRepository } from '../repositories/lesson-quiz.repository.js';
import { LessonRepository } from '../repositories/lesson.repository.js';
import { SectionRepository } from '../repositories/section.repository.js';
export declare class LessonManagementGuard implements CanActivate {
    private readonly lessonRepository;
    private readonly sectionRepository;
    private readonly courseRepository;
    private readonly lessonQuizRepository;
    private readonly objectIdPipe;
    constructor(lessonRepository: LessonRepository, sectionRepository: SectionRepository, courseRepository: CourseRepository, lessonQuizRepository: LessonQuizRepository);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
